import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { config } from './config.js';
import subAccountsRouter from './routes/subAccounts.js';
import opportunitiesRouter from './routes/opportunities.js';
import invoicesRouter from './routes/invoices.js';
import usersRouter from './routes/users.js';
import customizationRouter from './routes/customization.js';
import auditLogsRouter from './routes/auditLogs.js';
import exchangeRatesRouter from './routes/exchangeRates.js';
import dashboardsRouter from './routes/dashboards.js';
import authRouter from './routes/auth.js';
import appUsersRouter from './routes/appUsers.js';
import webhooksRouter, { handleGhlWebhook, webhookHealth } from './routes/webhooks.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.frontendOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/', (_request, response) => {
  const domain = config.publicWebhookDomain.replace(/\/+$/, '');
  response.json({
    ok: true,
    service: 'ZeaBoard Backend',
    webhookUrl: domain ? `${domain}${config.ghlWebhookPath}` : config.ghlWebhookPath,
    message: 'Webhook endpoint is active. Use the webhookUrl value for CRM webhook setup.'
  });
});

app.post('/', handleGhlWebhook);
app.post('/webhook', handleGhlWebhook);
app.post('/webhooks/ghl', handleGhlWebhook);
app.post('/webhooks/zeaboard', handleGhlWebhook);
app.get('/api/webhooks/zeaboard', webhookHealth);
app.get('/api/webhooks/production', webhookHealth);
app.get('/webhook', webhookHealth);
app.get('/webhooks/ghl', webhookHealth);
app.get('/webhooks/zeaboard', webhookHealth);

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.get('/webhook-url', (_request, response) => {
  const domain = config.publicWebhookDomain.replace(/\/+$/, '');
  response.json({
    webhookUrl: domain ? `${domain}${config.ghlWebhookPath}` : config.ghlWebhookPath
  });
});

app.use('/api/auth', authRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api', requireAuth);
app.use('/api/sub-accounts', subAccountsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/users', usersRouter);
app.use('/api/app-users', appUsersRouter);
app.use('/api/customization', customizationRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/exchange-rates', exchangeRatesRouter);
app.use('/api/dashboards', dashboardsRouter);

app.use((error, _request, response, _next) => {
  if (error instanceof ZodError) {
    return response.status(400).json({ error: 'Validation failed', details: error.flatten() });
  }

  console.error(error);
  response.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(config.port, config.hostIp, () => {
  console.log(`Backend listening on ${config.domain}:${config.port}`);
});


