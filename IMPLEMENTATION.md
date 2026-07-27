# GHL CRM Contact Sync Implementation

This document explains how the backend fetches contacts from a GoHighLevel CRM sub-account and stores them in PostgreSQL.

## 1. Add a Sub-Account

The user adds a sub-account from the frontend settings page.

Required fields:

- Sub-account name
- GHL API key or Private Integration Token
- GHL Location ID

Frontend request:

```http
POST /api/sub-accounts
Content-Type: application/json

{
  "name": "Example Sub Account",
  "apiKey": "ghl_private_token_or_access_token",
  "locationId": "LOCATION_ID"
}
```

Backend file:

```text
backend/src/routes/subAccounts.js
```

The backend validates the request and passes it to `createSubAccount`.

## 2. Store Sub-Account Credentials

The backend stores the sub-account details in PostgreSQL.

Registry table:

```text
zea_sub_accounts
```

Stored fields include:

- `name`
- `location_id`
- `api_key`
- `contacts_table_name`
- `is_active`
- `last_synced_at`

Backend file:

```text
backend/src/models/subAccounts.js
```

The API key is currently stored directly in the database. Before production, this should be encrypted or moved to a secrets manager.

## 3. Create a Contacts Table for That Sub-Account

When a sub-account is added, the backend creates a separate contacts table for that sub-account.

Example:

```text
contacts_list
```

The active table name is stored in `zea_sub_accounts.contacts_table_name`. For the current Automotive Demo sub-account, it points to `contacts_list`.

Backend file:

```text
backend/src/utils/tableNames.js
```

Each sub-account contacts table stores:

- Contact ID
- Sub Account ID / Location ID
- Sub Account Name
- Name
- Email
- Phone Number
- Tag
- Timezone
- Medium
- Source
- Assigned User
- User ID
- GHL Created At
- Raw GHL payload
- Created and updated timestamps

Backend file:

```text
backend/src/models/subAccounts.js
```

## 4. Start Manual Contact Sync

The frontend calls the sync endpoint when the user clicks `Sync Contacts`.

Frontend request:

```http
POST /api/sub-accounts/:id/sync
```

Backend file:

```text
backend/src/routes/subAccounts.js
```

The backend loads the sub-account by ID, including:

- API key
- Location ID
- Contacts table name

Then it calls:

```text
syncSubAccountContacts()
```

Backend file:

```text
backend/src/services/syncContacts.js
```

## 5. Fetch Contacts from GHL v3

The backend sends a request to the GHL v3 contacts API.

Backend file:

```text
backend/src/services/ghlClient.js
```

The request uses:

```http
GET https://services.leadconnectorhq.com/v3/contacts?locationId=LOCATION_ID&limit=100&page=1
Authorization: Bearer API_KEY
Version: 2021-07-28
Accept: application/json
```

The GHL API base URL and version come from:

```text
backend/.env
```

Relevant environment variables:

```env
GHL_API_BASE_URL=https://services.leadconnectorhq.com
GHL_API_VERSION=2021-07-28
```

## 6. Handle Pagination

The backend fetches contacts in pages.

Current pagination behavior:

- Starts at page `1`
- Uses `limit=100`
- Adds contacts from each response into one array
- Continues while GHL says there are more records
- Stops when there are no more contacts

The client checks common response fields:

- `contacts`
- `data`
- `items`
- `total`
- `meta.total`
- `hasMore`
- `meta.hasMore`

This makes the sync more tolerant if the GHL response format changes slightly.

## 7. Normalize Contact Data

Each GHL contact is normalized before saving.

Backend file:

```text
backend/src/models/contacts.js
```

The backend maps GHL fields into the required local fields:

| Local Field | Possible GHL Source |
| --- | --- |
| `contact_id` | `id`, `contactId`, `contact_id` |
| `sub_account_id` | `location.id`, `locationId`, `location_id` |
| `sub_account_name` | `location.name`, `locationName`, `location_name` |
| `name` | `name`, `fullName`, `full_name`, `firstName + lastName` |
| `email` | `email` |
| `phone_number` | `phone`, `phoneNumber` |
| `tag` | `tags`, `tag` |
| `timezone` | `timezone`, `timeZone` |
| `medium` | `contact.attributionSource.medium`, `attributionSource.medium`, `contact_source` |
| `source` | `contact_source`, `source`, `medium` |
| `assigned_user` | `assignedTo`, `assignedUserName`, `user.firstName + user.lastName` |
| `user_id` | `assignedToUserId`, `userId`, `user_id`, `assignedTo`, `user.email` |
| `created_at` | `date_created`, `dateCreated`, `createdAt`, `created_at` |

The original GHL object is also saved in `raw_payload`.

## 8. Insert or Update Contacts in PostgreSQL

Each contact is saved using an upsert.

That means:

- If the contact does not exist, it is inserted.
- If the contact already exists, it is updated.
- If GHL sends a contact delete event, the matching `contact_id` is removed from the contacts table.

The unique key is:

```text
contact_id
```

Backend file:

```text
backend/src/models/contacts.js
```

The upsert updates:

- Name
- Email
- Phone Number
- Tag
- Timezone
- Medium
- Assigned User
- User ID
- Raw payload
- Updated timestamp

## 9. Mark Sync Completed

After all contacts are saved, the backend updates:

```text
zea_sub_accounts.last_synced_at
```

It also writes a sync record into:

```text
zea_sync_events
```

Backend file:

```text
backend/src/services/syncContacts.js
```

Example sync event:

```json
{
  "event_type": "manual_sync",
  "payload": {
    "count": 120
  }
}
```

## 10. Show Contacts in the Frontend Tab

The frontend loads contacts for the selected sub-account tab.

Frontend request:

```http
GET /api/sub-accounts/:id/contacts
```

Backend file:

```text
backend/src/routes/subAccounts.js
```

The backend reads from that sub-account's own contacts table and returns contacts to the frontend.

Frontend file:

```text
frontend/src/main.jsx
```

## 11. Future Updates from GHL Webhooks

For future CRM changes, GHL should send webhook events to:

```http
POST /api/webhooks/zeaboard
```

Backend file:

```text
backend/src/routes/webhooks.js
```

Supported behavior:

- Contact create webhook inserts the contact.
- Contact update webhook updates the contact.
- Contact delete webhook deletes the contact.
- Tag/contact update webhook upserts the latest contact payload.

The webhook handler finds the correct sub-account by:

```text
locationId
```

Then it updates the matching contacts table. For the current Automotive Demo sub-account, that table is `contacts_list`.

Opportunity webhooks are stored in:

```text
opportunity_list
```

The opportunity table stores Opportunity ID, Name, Monetary Value, Currency, Pipeline ID, Pipeline Stage ID, Assigned To, Status, GHL Created At, Contact ID, Contact Tag, Contact Email, Contact Phone, and Closing Date.

All list tables include `created_in_crm_on`, displayed in the UI as `Created in CRM On`. This stores the CRM object's own created timestamp, separate from the local database row creation time.

Invoice webhooks are stored in:

```text
invoice_list
```

The invoice table stores Invoice ID, Status, Live Mode, Amount Paid, Alt ID, Alt Type, Name, Business Address, Business Phone, Website, Logo URL, Invoice Number, Currency, Contact ID, Contact Phone, Contact Email, Contact Name, Company Name, Amount Due, Created At, Discount, Subtotal, Product ID, Price ID, Product Currency, Product Name, Product Quantity, and Product Amount.

User webhooks are stored in:

```text
user_list
```

The user table stores User ID, Name, Email, Phone, Extension, and Role.

## 12. Full Data Flow

```text
Frontend Settings Page
  -> POST /api/sub-accounts
  -> Backend stores GHL credentials
  -> Backend creates contacts table

User clicks Sync Contacts
  -> POST /api/sub-accounts/:id/sync
  -> Backend fetches GHL contacts from /v3/contacts
  -> Backend paginates through all contacts
  -> Backend normalizes each contact
  -> Backend upserts each contact into PostgreSQL
  -> Backend updates last_synced_at
  -> Frontend reloads contacts tab

Future GHL CRM change
  -> GHL sends webhook to /api/webhooks/zeaboard
  -> Backend finds sub-account by locationId
  -> Backend updates the matching contacts table, currently contacts_list
```

## 13. Commands

Run backend migration:

```bash
cd backend
npm run migrate
```

Start backend:

```bash
cd backend
npm run dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

## 14. Production Notes

Before production deployment:

- Encrypt stored GHL API keys.
- Configure a strong `GHL_WEBHOOK_SECRET`.
- Confirm the exact GHL v3 contacts response shape for the account type being used.
- Configure public domain and webhook URL in the GHL marketplace/private app settings.
- Use HTTPS for webhook delivery.
- Add authentication to protect the settings page and API routes.
