import express from 'express';
import rateLimit from 'express-rate-limit';
import crmRoutes from './crm.js';
import financeRoutes from './finance.js';
import marketingRoutes from './marketing.js';
import { verifyApiKey } from '../../src/lib/apiAuth.js';

const app = express();

app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(verifyApiKey);
app.use('/crm', crmRoutes);
app.use('/finance', financeRoutes);
app.use('/marketing', marketingRoutes);

app.get('/status', (req, res) => {
  res.json({ ok: true, tenantId: req.tenantId });
});

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 5055;
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}
