import express from 'express';

const app = express();
app.use(express.json());

const sampleApps = [
  {
    id: 'ai-briefs',
    name: 'AI Campaign Briefs',
    description: 'Generate launch-ready campaign briefs for your brand.',
    version: '1.3.0',
    publisher: 'Hustle Studio Labs',
    rating: 4.7,
  },
  {
    id: 'roi-analyzer',
    name: 'ROI Analyzer',
    description: 'Blend sales and marketing data to surface ROI in seconds.',
    version: '2.1.0',
    publisher: 'Metrics Collective',
    rating: 4.5,
  },
];

app.get('/', (_req, res) => {
  res.json({ apps: sampleApps });
});

app.post('/submit', (req, res) => {
  const submission = { ...req.body, status: 'pending-review' };
  res.status(202).json({ submission });
});

app.post('/install', (req, res) => {
  const { appId, tenantId } = req.body || {};
  if (!appId || !tenantId) {
    res.status(400).json({ error: 'appId and tenantId are required.' });
    return;
  }
  res.json({ ok: true, installed: { appId, tenantId, installedAt: new Date().toISOString() } });
});

app.post('/review/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  res.json({ ok: true, id, status });
});

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 5060;
  app.listen(port, () => {
    console.log(`App store API listening on http://localhost:${port}`);
  });
}
