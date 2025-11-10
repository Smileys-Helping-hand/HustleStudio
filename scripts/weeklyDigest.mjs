#!/usr/bin/env node
import AWS from 'aws-sdk';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { getEngagementMetrics } from '../src/lib/analyticsEngine.js';
import { generateWeeklySummary } from '../src/lib/aiSummaryGenerator.js';
import { db } from '../src/lib/firebase.js';

const resolveDestinations = () => {
  const recipients = process.env.AWS_SES_DESTINATION || process.env.WEEKLY_DIGEST_RECIPIENTS;
  return recipients ? recipients.split(',').map((value) => value.trim()).filter(Boolean) : [];
};

const getPrimaryUserId = async () => {
  const explicit = process.env.HS_DIGEST_USER_ID;
  if (explicit) return explicit;

  const snapshot = await getDocs(query(collection(db, 'users'), orderBy('updatedAt', 'desc'), limit(1)));
  return snapshot.docs[0]?.id ?? null;
};

const dispatchEmail = async (summary) => {
  const source = process.env.AWS_SES_SOURCE;
  const destinations = resolveDestinations();
  if (!source || destinations.length === 0) {
    console.info('[WeeklyDigest] SES not configured, skipping email dispatch.');
    return false;
  }

  const ses = new AWS.SES({ region: process.env.AWS_REGION || process.env.AWS_SES_REGION || 'af-south-1' });
  const params = {
    Source: source,
    Destination: { ToAddresses: destinations },
    Message: {
      Subject: { Data: 'Hustle Studio — Weekly AI Digest' },
      Body: {
        Text: { Data: summary },
      },
    },
  };

  await ses.sendEmail(params).promise();
  console.info('[WeeklyDigest] Email sent via SES.');
  return true;
};

const run = async () => {
  const userId = await getPrimaryUserId();
  if (!userId) {
    throw new Error('No user available for analytics digest. Configure HS_DIGEST_USER_ID.');
  }

  const metrics = await getEngagementMetrics(userId);
  const summary = await generateWeeklySummary(metrics);
  console.log('===== Weekly Digest Preview =====');
  console.log(summary);

  await dispatchEmail(summary);
};

run().catch((error) => {
  console.error('[WeeklyDigest] Failed to generate digest', error);
  process.exitCode = 1;
});
