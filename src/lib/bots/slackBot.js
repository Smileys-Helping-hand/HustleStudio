const SLACK_API_BASE = 'https://slack.com/api';

const getToken = () => {
  const envToken =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process?.env?.VITE_SLACK_BOT_TOKEN
      ? globalThis.process.env.VITE_SLACK_BOT_TOKEN
      : undefined;
  if (envToken) return envToken;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SLACK_BOT_TOKEN) {
    return import.meta.env.VITE_SLACK_BOT_TOKEN;
  }
  return '';
};

export const postSlackMessage = async ({ channel, text, blocks }) => {
  const token = getToken();
  if (!token) {
    throw new Error('Slack bot token is not configured.');
  }

  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text, blocks }),
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error || 'Slack API error');
  }
  return payload;
};

export const formatSalesSummaryBlocks = (summary) => [
  {
    type: 'section',
    text: { type: 'mrkdwn', text: `*Daily Sales Update*\nRevenue: *${summary.revenue}*\nOrders: ${summary.orders}` },
  },
  {
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `Low stock items: ${summary.lowStock ?? 0}` },
      { type: 'mrkdwn', text: `Generated at ${new Date().toLocaleTimeString()}` },
    ],
  },
];
