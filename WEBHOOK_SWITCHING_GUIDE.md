# Webhook Switching Guide

This guide explains how the GHL webhook is configured for the production domain:

```text
https://zeaboard.zeacrm.com
```

## Current Local Webhook

Current production webhook:

```text
https://zeaboard.zeacrm.com/api/webhooks/zeaboard
```

Current backend webhook route:

```text
POST /api/webhooks/zeaboard
```

The backend also accepts:

```text
POST /
```

This was added because some GHL Marketplace webhook tests send requests to the base domain.

## Important Files

Backend environment file:

```text
backend/.env
```

Frontend environment file:

```text
frontend/.env
```

Backend route file:

```text
backend/src/server.js
```

Webhook handler file:

```text
backend/src/routes/webhooks.js
```

## Step 1: Change Backend Public Webhook Domain

Open:

```text
backend/.env
```

Go to line `11`.

Current value:

```env
PUBLIC_WEBHOOK_DOMAIN=https://zeaboard.zeacrm.com
```

Change it to:

```env
PUBLIC_WEBHOOK_DOMAIN=https://zeaboard.zeacrm.com
```

Keep line `12` as:

```env
GHL_WEBHOOK_PATH=/api/webhooks/zeaboard
```

Final production values should look like:

```env
PUBLIC_WEBHOOK_DOMAIN=https://zeaboard.zeacrm.com
GHL_WEBHOOK_PATH=/api/webhooks/zeaboard
```

Your production webhook URL will become:

```text
https://zeaboard.zeacrm.com/api/webhooks/zeaboard
```

## Step 2: Change Backend Domain

Open:

```text
backend/.env
```

Go to line `2`.

Current value:

```env
DOMAIN=http://localhost
```

Change it to:

```env
DOMAIN=https://zeaboard.zeacrm.com
```

This is used by backend logs and helper endpoints.

## Step 3: Keep Backend Port Correct

Open:

```text
backend/.env
```

Go to line `3`.

Current local value:

```env
PORT=5001
```

For production, keep this as the internal backend port unless your hosting provider requires a different one:

```env
PORT=5001
```

If your server or hosting platform gives you a different backend port, update this value.

## Step 4: Update Allowed Frontend Origins

Open:

```text
backend/.env
```

Go to line `4`.

Current value:

```env
FRONTEND_ORIGIN=http://localhost:5173,http://192.168.29.160:5173
```

For production, add your production frontend domain:

```env
FRONTEND_ORIGIN=http://localhost:5173,http://192.168.29.160:5173,https://zeaboard.zeacrm.com
```

If frontend and backend are both served from `https://zeaboard.zeacrm.com`, this allows the browser UI to call the backend API.

## Step 5: Update Frontend API URL

Open:

```text
frontend/.env
```

Go to line `5`.

Current value:

```env
VITE_API_DOMAIN=http://192.168.29.160
```

Change it to:

```env
VITE_API_DOMAIN=https://zeaboard.zeacrm.com
```

Go to line `6`.

Current value:

```env
VITE_API_PORT=5001
```

If your production API is exposed without a port, for example:

```text
https://zeaboard.zeacrm.com/api/sub-accounts
```

then the frontend code should be adjusted later to support an API base URL without appending `:5001`.

For now, if your production backend is exposed as:

```text
https://zeaboard.zeacrm.com:5001
```

keep:

```env
VITE_API_PORT=5001
```

Recommended future improvement:

```env
VITE_API_BASE_URL=https://zeaboard.zeacrm.com
```

instead of separate domain and port values.

## Step 6: Restart Backend

After changing `backend/.env`, restart the backend.

Local command:

```bash
cd backend
npm run dev
```

Production command depends on your hosting setup. If using PM2, it may look like:

```bash
pm2 restart zeaboard-backend
```

## Step 7: Rebuild and Restart Frontend

After changing `frontend/.env`, rebuild the frontend.

```bash
cd frontend
npm run build
```

If running locally:

```bash
npm run dev
```

In production, redeploy the generated frontend build.

## Step 8: Verify the Webhook URL

Open this in the browser:

```text
https://zeaboard.zeacrm.com/
```

Expected response:

```json
{
  "ok": true,
  "service": "ZeaBoard Backend",
  "webhookUrl": "https://zeaboard.zeacrm.com/api/webhooks/zeaboard"
}
```

Also test:

```text
https://zeaboard.zeacrm.com/health
```

Expected response:

```json
{
  "ok": true
}
```

## Step 9: Add the New Webhook in GHL

In the GHL Marketplace app or webhook settings, use this URL:

```text
https://zeaboard.zeacrm.com/api/webhooks/zeaboard
```

with:

```text
https://zeaboard.zeacrm.com/api/webhooks/zeaboard
```

If GHL only lets you enter a base URL, use:

```text
https://zeaboard.zeacrm.com
```

The backend supports both:

```text
POST /
POST /api/webhooks/zeaboard
```

## Step 10: Test With GHL Events

Trigger these GHL events:

```text
ContactCreate
ContactUpdate
ContactDelete
OpportunityCreate
OpportunityUpdate
OpportunityDelete
```

Then verify the database:

```bash
cd backend
npm run inspect:contacts
npm run inspect:opportunities
```

Expected tables:

```text
contacts_list
opportunity_list
zea_sub_accounts
zea_sync_events
```

## Step 11: Confirm GHL Webhook Logs

In GHL webhook logs, successful requests should show:

```text
200 OK
```

If you see:

```text
404 Not Found
```

check whether GHL is sending to:

```text
/
```

or:

```text
/api/webhooks/zeaboard
```

Both should work in this backend. If either returns 404, the domain is likely not pointing to the backend server correctly.

## Step 12: DNS Setup for Production

When you are ready to use:

```text
zeaboard.zeacrm.com
```

create a DNS record.

Usually this is a CNAME:

```text
Name: zeaboard
Type: CNAME
Value: your-hosting-provider-domain
```

Or an A record:

```text
Name: zeaboard
Type: A
Value: YOUR_SERVER_PUBLIC_IP
```

Your hosting provider will decide which one is correct.

## Step 13: HTTPS Requirement

GHL webhooks should use HTTPS.

Your production URL should be:

```text
https://zeaboard.zeacrm.com/api/webhooks/zeaboard
```

not:

```text
http://zeaboard.zeacrm.com/api/webhooks/zeaboard
```

Use SSL from your hosting provider, Nginx, Caddy, Cloudflare, or another HTTPS provider.

## Quick Production Checklist

- Update `backend/.env` line `2`: `DOMAIN=https://zeaboard.zeacrm.com`
- Update `backend/.env` line `4`: add `https://zeaboard.zeacrm.com` to `FRONTEND_ORIGIN`
- Update `backend/.env` line `11`: `PUBLIC_WEBHOOK_DOMAIN=https://zeaboard.zeacrm.com`
- Keep `backend/.env` line `12`: `GHL_WEBHOOK_PATH=/api/webhooks/zeaboard`
- Update `frontend/.env` line `5`: `VITE_API_DOMAIN=https://zeaboard.zeacrm.com`
- Restart backend
- Rebuild frontend
- Add `https://zeaboard.zeacrm.com/api/webhooks/zeaboard` in GHL
- Trigger a test contact or opportunity event
- Confirm `200 OK` in GHL logs
