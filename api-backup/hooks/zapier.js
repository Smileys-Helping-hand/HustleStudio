import express from 'express';
import { triggerHook } from '../../src/lib/webhookManager.js';

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  const { event, data, tenantId } = req.body ?? {};
  if (!tenantId || !event) {
    res.status(400).json({ error: 'tenantId and event are required' });
    return;
  }
  try {
    const deliveries = await triggerHook(event, data ?? {}, tenantId, { provider: 'zapier' });
    res.json({ delivered: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 5060;
  app.listen(port, () => console.log(`Zapier hook relay listening on http://localhost:${port}`));
}
