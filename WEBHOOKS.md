# GHL Webhook Setup

This document lists the webhook endpoint and event types to configure in GoHighLevel for this project.

Source: HighLevel v3 webhook documentation  
https://marketplace.gohighlevel.com/docs/category/webhook/index.html

## Webhook Endpoint

Add this webhook URL in GHL:

```text
https://zeaboard.zeacrm.com/api/webhooks/zeaboard
```

These aliases are also supported. They all call the same backend handler and use the same validation, transformation, and database update flow:

```text
https://zeaboard.zeacrm.com/api/webhooks/production
https://zeaboard.zeacrm.com/webhook
https://zeaboard.zeacrm.com/webhooks/zeaboard
```

This project stores the public webhook domain in:

```text
backend/.env
```

For another future domain:

```env
PUBLIC_WEBHOOK_DOMAIN=https://zeaboard.zeacrm.com
GHL_WEBHOOK_PATH=/api/webhooks/zeaboard
```

For production:

```env
PUBLIC_WEBHOOK_DOMAIN=https://zeaboard.zeacrm.com
GHL_WEBHOOK_PATH=/api/webhooks/zeaboard
```

For local development, the backend route is:

```text
http://localhost:5001/api/webhooks/zeaboard
```

Localhost will not work directly from GHL. For testing, expose the backend with a public HTTPS URL using a tunnel or deployed server.

## Backend Route

The webhook receiver is implemented here:

```text
backend/src/routes/webhooks.js
```

The route accepts:

```http
GET /api/webhooks/zeaboard
POST /api/webhooks/zeaboard
GET /api/webhooks/production
POST /api/webhooks/production
GET /webhook
POST /webhook
GET /webhooks/zeaboard
POST /webhooks/zeaboard
Content-Type: application/json
```

`GET` returns a health response for webhook setup screens that test the URL. `POST` processes CRM webhook payloads and updates the database.

## Required Payload Field

Every webhook payload must include a sub-account/location identifier.

The backend currently checks these possible fields:

```text
locationId
location_id
location.id
```

The backend uses this value to find the matching registered sub-account in:

```text
zea_sub_accounts.location_id
```

If the sub-account was not added in the Settings page first, the webhook will return:

```json
{
  "error": "Sub-account is not registered"
}
```

## Security Header

The backend supports optional HMAC verification.

Configure this in:

```text
backend/.env
```

```env
GHL_WEBHOOK_SECRET=your-strong-secret
```

If `GHL_WEBHOOK_SECRET` is set, incoming requests must include one of these headers:

```text
x-ghl-signature
x-signature
```

The expected signature is:

```text
HMAC-SHA256(JSON payload, GHL_WEBHOOK_SECRET)
```

For GHL testing, keep this empty unless you have confirmed the exact signature header and signing format:

```env
GHL_WEBHOOK_SECRET=
```

## Webhooks Needed for Contact Sync

For the current contact table sync, add these events first:

| GHL Event | Why It Is Needed | Backend Action |
| --- | --- | --- |
| `ContactCreate` | A new contact is created in GHL | Insert contact |
| `ContactUpdate` | Contact fields are changed in GHL | Update contact |
| `ContactDelete` | A contact is deleted in GHL | Delete contact |
| `ContactDndUpdate` | Contact DND settings change | Store latest payload as contact update |
| `ContactTagUpdate` | Contact tags change | Update contact tags |
| `InboundMessage` | Contact sends a message | Useful for future medium/activity updates |
| `OutboundMessage` | User sends a message to contact | Useful for future medium/activity updates |

These are the most important events for keeping this project's contact table updated.

## Contact Webhook Behavior

The backend reads the event type from one of these fields:

```text
type
eventType
event
```

The backend reads the contact data from one of these fields:

```text
contact
data
root payload
```

The backend reads the contact ID from:

```text
contact.id
contact.contactId
payload.contactId
```

For delete events, the backend deletes the row from the sub-account contacts table.

For all other events, the backend upserts the contact into the sub-account contacts table. For the current Automotive Demo sub-account, that table is `contacts_list`.

Delete matching uses:

```text
contact_id
contactId
contact.id
payload.contactId
payload.contact_id
```

If a webhook event type, action, operation, or status contains `delete`, `deleted`, or `remove`, the backend removes the matching contact from `contacts_list`.

## All Available GHL v3 Webhook Events

HighLevel v3 currently documents these webhook event types.

| Event | Description |
| --- | --- |
| `AppInstall` | App is installed |
| `AppointmentCreate` | Appointment is created |
| `AppointmentDelete` | Appointment is deleted |
| `AppointmentUpdate` | Appointment is updated |
| `AppUninstall` | App is uninstalled |
| `AppUpdate` | App is updated |
| `AssociationCreate` | Association is created |
| `AssociationDelete` | Association is deleted |
| `AssociationUpdate` | Association is updated |
| `CampaignStatusUpdate` | Campaign status is updated |
| `ContactCreate` | Contact is created |
| `ContactUpdate` | Contact fields are updated |
| `ContactDelete` | Contact is deleted |
| `ContactDndUpdate` | Contact DND field is updated |
| `ContactTagUpdate` | Contact tags are updated |
| `ConversationUnreadWebhook` | Conversation unread status is updated |
| `ConversationUpdate` | Conversation is updated or merged |
| `ExternalAuthConnected` | External authentication is connected |
| `InboundMessage` | Contact sends a message |
| `InvoiceCreate` | Invoice is created |
| `InvoiceDelete` | Invoice is deleted |
| `InvoicePaid` | Invoice is paid |
| `InvoicePartiallyPaid` | Invoice is partially paid |
| `InvoiceSent` | Invoice is sent |
| `InvoiceUpdate` | Invoice is updated |
| `InvoiceVoid` | Invoice is voided |
| `KnowledgeBaseCreate` | Knowledge base is created |
| `KnowledgeBaseUpdate` | Knowledge base is updated |
| `KnowledgeBaseDelete` | Knowledge base is deleted |
| `KnowledgeBaseFileChange` | Knowledge base file asset is created, updated, or deleted |
| `KnowledgeBaseFaqChange` | Knowledge base FAQ asset is created, updated, or deleted |
| `KnowledgeBaseRichTextChange` | Knowledge base rich text asset is created, updated, or deleted |
| `KnowledgeBaseTableFileChange` | Knowledge base table file asset is created, updated, or deleted |
| `KnowledgeBaseTrainedUrlChange` | Knowledge base trained URL asset is created, updated, or deleted |
| `LCEmailStats` | Email statistics are available |
| `LocationCreate` | Location is created |
| `LocationUpdate` | Location is updated |
| `NoteCreate` | Note is created |
| `NoteDelete` | Note is deleted |
| `NoteUpdate` | Note is updated |
| `ObjectSchemaCreate` | Object schema is created |
| `ObjectSchemaUpdate` | Object schema is updated |
| `OpportunityAssignedToUpdate` | Opportunity assigned user is updated |
| `OpportunityCreate` | Opportunity is created |
| `OpportunityDelete` | Opportunity is deleted |
| `OpportunityMonetaryValueUpdate` | Opportunity monetary value is updated |
| `OpportunityStageUpdate` | Opportunity stage is updated |
| `OpportunityStatusUpdate` | Opportunity status is updated |
| `OpportunityUpdate` | Opportunity is updated |
| `OrderCreate` | Order is created |
| `OrderStatusUpdate` | Order status is updated |
| `OutboundMessage` | User sends a message to a contact |
| `PlanChange` | Paid app plan changes |
| `PriceCreate` | Price is created |
| `PriceDelete` | Price is deleted |
| `PriceUpdate` | Price is updated |
| `ProductCreate` | Product is created |
| `ProductDelete` | Product is deleted |
| `ProductUpdate` | Product is updated |
| `ProviderOutboundMessage` | User sends a message through a custom provider |
| `RecordCreate` | Object record is created |
| `RecordDelete` | Object record is deleted |
| `RecordUpdate` | Object record is updated |
| `RelationCreate` | Relation is created |
| `RelationDelete` | Relation is deleted |
| `SaaSPlanCreate` | SaaS plan is created |
| `TaskComplete` | Task is completed |
| `TaskCreate` | Task is created |
| `TaskDelete` | Task is deleted |
| `UserCreate` | User is created |
| `VoiceAiCallEnd` | Voice AI call ends for a sub-account |
| `UserDelete` | User is deleted |
| `UserUpdate` | User is updated |

## Recommended Events to Add Now

For this project's current requirement, add these in GHL:

```text
ContactCreate
ContactUpdate
ContactDelete
ContactDndUpdate
ContactTagUpdate
InboundMessage
OutboundMessage
UserCreate
UserUpdate
UserDelete
```

The contact events keep the contacts table current.

Opportunity events keep `opportunity_list` current. Add these if opportunities should sync:

```text
OpportunityCreate
OpportunityUpdate
OpportunityDelete
OpportunityStageUpdate
OpportunityStatusUpdate
OpportunityAssignedToUpdate
OpportunityMonetaryValueUpdate
```

Invoice events keep `invoice_list` current. Add these if invoices should sync:

```text
InvoiceCreate
InvoiceUpdate
InvoiceDelete
InvoicePaid
InvoicePartiallyPaid
InvoiceSent
InvoiceVoid
```

The user events are useful because the stored contact fields include:

```text
Assigned User
User ID
```

If assigned users change later, these events can be used to refresh or enrich contact ownership data.

User events also keep `user_list` current:

```text
UserCreate
UserUpdate
UserDelete
```

## Example Contact Create Payload

Use this shape when testing the endpoint manually:

```json
{
  "type": "ContactCreate",
  "locationId": "LOCATION_ID",
  "contact": {
    "id": "CONTACT_ID",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+15551234567",
    "tags": ["lead", "website"],
    "timezone": "America/New_York",
    "source": "website",
    "assignedTo": "USER_ID"
  }
}
```

## Example Contact Delete Payload

Use this shape when testing delete behavior:

```json
{
  "type": "ContactDelete",
  "location": {
    "id": "LOCATION_ID",
    "name": "Automotive Demo"
  },
  "contact_id": "CONTACT_ID"
}
```

## Test with cURL

```bash
curl -X POST http://localhost:5001/api/webhooks/zeaboard \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ContactCreate",
    "locationId": "LOCATION_ID",
    "contact": {
      "id": "CONTACT_ID",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+15551234567",
      "tags": ["lead"],
      "timezone": "America/New_York",
      "source": "website",
      "assignedTo": "USER_ID"
    }
  }'
```

Before testing, make sure the sub-account with that `LOCATION_ID` has been added from the Settings page.

## Expected Responses

Successful webhook:

```json
{
  "ok": true
}
```

Missing `locationId`:

```json
{
  "error": "Webhook locationId is required"
}
```

Unknown sub-account:

```json
{
  "error": "Sub-account is not registered"
}
```

Invalid signature:

```json
{
  "error": "Invalid webhook signature"
}
```

## Notes

- The webhook endpoint must be public HTTPS when configured inside GHL.
- The sub-account must be added in the app before webhook events arrive.
- The current backend stores all webhook payloads in `zea_sync_events`.
- Contact payloads are also saved in the contact table `raw_payload` column.
- Events outside contact create/update/delete are logged but only contact-shaped payloads update contact tables correctly.


