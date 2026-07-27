# ZeaBoard

This workspace is split into separate backend and frontend apps.

## Backend

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Configuration lives in `backend/.env`.

- `HOST_IP`, `DOMAIN`, and `PORT` control the backend listener.
- `FRONTEND_ORIGIN` accepts one or more comma-separated frontend origins for CORS.
- `DATABASE_URL` points to PostgreSQL.
- `GHL_API_BASE_URL` defaults to the LeadConnector API host.
- `GHL_WEBHOOK_SECRET` is used to verify incoming webhook signatures when configured.
- `PUBLIC_WEBHOOK_DOMAIN` and `GHL_WEBHOOK_PATH` define the webhook URL to add in GHL.

Main API routes:

- `POST /api/sub-accounts` adds or updates a sub-account and creates its contacts table.
- `GET /api/sub-accounts` lists registered sub-accounts.
- `POST /api/sub-accounts/:id/sync` pulls contacts from GHL v3 into PostgreSQL.
- `GET /api/sub-accounts/:id/contacts` returns contacts for one sub-account tab.
- `POST /api/webhooks/zeaboard` and webhook aliases process GHL contact, opportunity, invoice, and user events through the same database update flow.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Configuration lives in `frontend/.env`.

- `HOST_IP`, `DOMAIN`, and `PORT` control the frontend dev server.
- `VITE_API_DOMAIN` and `VITE_API_PORT` control which backend API the frontend calls.
