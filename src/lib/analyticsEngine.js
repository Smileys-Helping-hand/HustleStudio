import { getDocs, limit, orderBy, query } from 'firebase/firestore';
import { tenantCollection } from './tenant.js';

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'number') return new Date(value);
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return null;
};

const getPastDaysBuckets = (days) => {
  const now = new Date();
  const buckets = new Map();
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - index);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }
  return buckets;
};

const sumNumbers = (items) => items.reduce((total, value) => total + Number(value || 0), 0);

export const getSalesMetrics = async (tenantId) => {
  const salesQuery = query(
    tenantCollection(tenantId, 'sales'),
    orderBy('createdAt', 'desc'),
    limit(180)
  );
  const snapshot = await getDocs(salesQuery);
  const now = Date.now();
  const dayBuckets = getPastDaysBuckets(7);
  const last24Hours = [];
  let revenue = 0;
  let salesCount = 0;

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const createdAt = toDate(data.createdAt);
    if (!createdAt) return;
    const total = Number(data?.totals?.total ?? 0);
    revenue += total;
    salesCount += 1;

    const key = createdAt.toISOString().slice(0, 10);
    if (dayBuckets.has(key)) {
      dayBuckets.set(key, Number(dayBuckets.get(key) ?? 0) + total);
    }

    if (now - createdAt.getTime() <= 1000 * 60 * 60 * 24) {
      last24Hours.push({
        time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total,
      });
    }
  });

  const dailySeries = Array.from(dayBuckets.entries()).map(([day, value]) => ({
    day,
    value: Number(value.toFixed(2)),
  }));

  const averageOrder = salesCount > 0 ? revenue / salesCount : 0;

  return {
    totalRevenue: Number(revenue.toFixed(2)),
    salesCount,
    averageOrder: Number(averageOrder.toFixed(2)),
    dailySeries,
    last24Hours,
    recentSales: snapshot.docs.slice(0, 5).map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    })),
  };
};

export const getUsageMetrics = async (uid, tenantId) => {
  if (!uid) {
    return {
      totalCredits: 0,
      totalTokens: 0,
      usageByAssistant: [],
      recent: [],
    };
  }

  const usageCollection = tenantId
    ? tenantCollection(tenantId, 'users', uid, 'usageLogs')
    : tenantCollection(null, 'users', uid, 'usageLogs');
  const usageQuery = query(usageCollection, orderBy('createdAt', 'desc'), limit(120));
  const snapshot = await getDocs(usageQuery);

  const totalCredits = sumNumbers(snapshot.docs.map((docSnapshot) => docSnapshot.data().creditsUsed));
  const totalTokens = sumNumbers(snapshot.docs.map((docSnapshot) => docSnapshot.data().tokensUsed));

  const assistantMap = new Map();
  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const assistant = data.assistant ?? 'assistant';
    const entry = assistantMap.get(assistant) ?? { assistant, credits: 0, tokens: 0 };
    entry.credits += Number(data.creditsUsed ?? 0);
    entry.tokens += Number(data.tokensUsed ?? 0);
    assistantMap.set(assistant, entry);
  });

  return {
    totalCredits: Number(totalCredits.toFixed(2)),
    totalTokens,
    usageByAssistant: Array.from(assistantMap.values()).map((entry) => ({
      ...entry,
      credits: Number(entry.credits.toFixed(2)),
    })),
    recent: snapshot.docs.slice(0, 6).map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    })),
  };
};

export const getTeamStats = async (tenantId) => {
  const [usersSnap, teamLogsSnap] = await Promise.all([
    getDocs(tenantCollection(tenantId, 'users')),
    getDocs(query(tenantCollection(tenantId, 'teamLogs'), orderBy('createdAt', 'desc'), limit(60))),
  ]);

  const members = usersSnap.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
  const roles = members.reduce((map, member) => {
    const role = member.role ?? 'staff';
    return map.set(role, (map.get(role) ?? 0) + 1);
  }, new Map());

  return {
    totalMembers: members.length,
    roles: Array.from(roles.entries()).map(([role, count]) => ({ role, count })),
    recentActivity: teamLogsSnap.docs.slice(0, 6).map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    })),
  };
};

export const getEngagementMetrics = async (uid, tenantId) => {
  const [sales, usage, team] = await Promise.all([
    getSalesMetrics(tenantId),
    getUsageMetrics(uid, tenantId),
    getTeamStats(tenantId),
  ]);

  return {
    sales,
    usage,
    team,
  };
};
