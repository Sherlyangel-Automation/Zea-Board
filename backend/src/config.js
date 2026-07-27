import dotenv from 'dotenv';

dotenv.config();

export const config = {
  hostIp: process.env.HOST_IP || '0.0.0.0',
  domain: process.env.DOMAIN || 'http://localhost',
  port: Number(process.env.PORT || 5000),
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL,
  ghlApiBaseUrl: process.env.GHL_API_BASE_URL || 'https://services.leadconnectorhq.com',
  ghlApiVersion: process.env.GHL_API_VERSION || '2021-07-28',
  ghlWebhookSecret: process.env.GHL_WEBHOOK_SECRET || '',
  publicWebhookDomain: process.env.PUBLIC_WEBHOOK_DOMAIN || '',
  ghlWebhookPath: process.env.GHL_WEBHOOK_PATH || '/api/webhooks/zeaboard'
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}
