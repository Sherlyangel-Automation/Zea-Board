import crypto from 'node:crypto';
import express from 'express';
import { deleteContact, upsertContact } from '../models/contacts.js';
import { deleteInvoice, markInvoiceDeleted, normalizeInvoice, upsertInvoice } from '../models/invoices.js';
import {
  deleteOpportunity,
  markOpportunityDeleted,
  normalizeOpportunity,
  upsertOpportunity
} from '../models/opportunities.js';
import { markUserDeleted, normalizeUser, upsertUser } from '../models/users.js';
import { findOrCreateWebhookSubAccount } from '../models/subAccounts.js';
import { config } from '../config.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();

export function webhookHealth(_request, response) {
  response.json({
    ok: true,
    service: 'ZeaBoard Webhook',
    message: 'Webhook endpoint is active. Send POST requests with JSON payloads.'
  });
}

function verifyWebhook(request) {
  if (!config.ghlWebhookSecret) {
    return true;
  }

  const signature = request.get('x-ghl-signature') || request.get('x-signature');
  if (!signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', config.ghlWebhookSecret)
    .update(JSON.stringify(request.body))
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function getContactPayload(payload) {
  const nestedContact = payload.contact && typeof payload.contact === 'object' ? payload.contact : {};
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const contactHasIdentity = Boolean(
    nestedContact.id ||
      nestedContact.contactId ||
      nestedContact.contact_id ||
      nestedContact.email ||
      nestedContact.phone ||
      nestedContact.name ||
      nestedContact.fullName ||
      nestedContact.full_name
  );

  if (contactHasIdentity) {
    return { ...payload, ...data, ...nestedContact, contact: nestedContact };
  }

  return { ...payload, ...data, contact: nestedContact };
}

function isDeleteEvent(payload, eventType) {
  const candidates = [
    eventType,
    payload.action,
    payload.eventAction,
    payload.event_action,
    payload.operation,
    payload.status
  ];

  return candidates
    .filter(Boolean)
    .some((value) => {
      const normalized = String(value).toLowerCase();
      return normalized.includes('delete') || normalized.includes('deleted') || normalized.includes('remove');
    });
}

function getLocationId(payload) {
  return (
    payload.locationId ||
    payload.location_id ||
    payload.location?.id ||
    payload.opportunity?.locationId ||
    payload.opportunity?.location_id ||
    payload.data?.locationId ||
    payload.data?.location_id ||
    payload.data?.location?.id ||
    payload.data?.opportunity?.locationId ||
    payload.data?.opportunity?.location_id ||
    payload.invoice?.locationId ||
    payload.invoice?.location_id ||
    payload.data?.invoice?.locationId ||
    payload.data?.invoice?.location_id ||
    payload.altId ||
    payload.invoice?.altId ||
    payload.data?.invoice?.altId ||
    payload.companyId ||
    payload.company_id ||
    payload.locations?.[0] ||
    payload.user?.companyId ||
    payload.user?.company_id ||
    payload.user?.locations?.[0] ||
    payload.data?.companyId ||
    payload.data?.company_id ||
    payload.data?.locations?.[0] ||
    payload.data?.user?.companyId ||
    payload.data?.user?.company_id ||
    payload.data?.user?.locations?.[0]
  );
}

function getLocationName(payload) {
  return (
    payload.locationName ||
    payload.location_name ||
    payload.location?.name ||
    payload.opportunity?.locationName ||
    payload.opportunity?.location_name ||
    payload.data?.locationName ||
    payload.data?.location_name ||
    payload.data?.location?.name ||
    payload.data?.opportunity?.locationName ||
    payload.data?.opportunity?.location_name
  );
}

function isOpportunityPayload(payload, eventType) {
  return Boolean(
    Object.prototype.hasOwnProperty.call(payload, 'opportunity') ||
      Object.prototype.hasOwnProperty.call(payload.data || {}, 'opportunity') ||
      String(eventType).toLowerCase().includes('opportunity')
  );
}

function isContactPayload(payload, eventType) {
  return Boolean(
    Object.prototype.hasOwnProperty.call(payload, 'contact') ||
      Object.prototype.hasOwnProperty.call(payload.data || {}, 'contact') ||
      payload.contact_id ||
      payload.contactId ||
      String(eventType).toLowerCase().includes('contact')
  );
}

function isInvoicePayload(payload, eventType) {
  return Boolean(
    Object.prototype.hasOwnProperty.call(payload, 'invoice') ||
      Object.prototype.hasOwnProperty.call(payload.data || {}, 'invoice') ||
      payload.invoiceNumber ||
      payload.invoice_number ||
      payload.contactDetails ||
      String(eventType).toLowerCase().includes('invoice')
  );
}

function isUserPayload(payload, eventType) {
  return Boolean(
    Object.prototype.hasOwnProperty.call(payload, 'user') ||
      Object.prototype.hasOwnProperty.call(payload.data || {}, 'user') ||
      String(eventType).toLowerCase().includes('user')
  );
}

function getOpportunityId(payload) {
  return (
    payload.id ||
    payload.opportunityId ||
    payload.opportunity_id ||
    payload.opportunity?.id ||
    payload.opportunity?.opportunityId ||
    payload.opportunity?.opportunity_id ||
    payload.data?.id ||
    payload.data?.opportunityId ||
    payload.data?.opportunity_id ||
    payload.data?.opportunity?.id ||
    payload.data?.opportunity?.opportunityId ||
    payload.data?.opportunity?.opportunity_id ||
    null
  );
}

export async function handleGhlWebhook(request, response, next) {
  let payload = request.body || {};
  let eventType = payload.type || payload.eventType || payload.event || 'unknown';
  let subAccount = null;
  let contactId = null;

  try {
    if (!verifyWebhook(request)) {
      await logAuditEvent({
        eventType: 'WebhookFailure',
        payload: { reason: 'Invalid webhook signature', eventType, path: request.originalUrl }
      });
      return response.status(401).json({ error: 'Invalid webhook signature' });
    }

    const locationId = getLocationId(payload);
    let actionResult = null;

    if (!locationId) {
      await logAuditEvent({
        eventType: 'WebhookFailure',
        payload: { reason: 'Webhook locationId is required', eventType, path: request.originalUrl }
      });
      return response.status(400).json({ error: 'Webhook locationId is required' });
    }

    subAccount = await findOrCreateWebhookSubAccount({
      locationId,
      name: getLocationName(payload)
    });

    if (isUserPayload(payload, eventType)) {
      const user = normalizeUser(payload);

      if (isDeleteEvent(payload, eventType)) {
        if (user.userId) {
          await markUserDeleted(user.userId, payload);
          actionResult = { action: 'mark_user_deleted', userId: user.userId };
        }
      } else {
        await upsertUser(payload);
      }
    } else if (isOpportunityPayload(payload, eventType)) {
      const opportunity = normalizeOpportunity(payload);
      contactId = opportunity.contactId;

      if (isDeleteEvent(payload, eventType)) {
        const opportunityId = getOpportunityId(payload);

        if (!opportunityId) {
          return response.status(400).json({ error: 'Opportunity delete id is required' });
        }

        await markOpportunityDeleted(opportunityId, payload);
        const deleted = await deleteOpportunity(opportunityId);
        actionResult = { action: 'delete_opportunity', opportunityId, deleted };
      } else {
        const upserted = await upsertOpportunity(payload, { contactsTableName: subAccount.contacts_table_name });
        actionResult = upserted ? { action: 'upsert_opportunity' } : { action: 'ignored_deleted_opportunity' };
      }
    } else if (isInvoicePayload(payload, eventType)) {
      const invoice = normalizeInvoice(payload);
      contactId = invoice.contactId;

      if (isDeleteEvent(payload, eventType)) {
        if (invoice.invoiceId) {
          await markInvoiceDeleted(invoice.invoiceId, payload);
          const deleted = await deleteInvoice(invoice.invoiceId);
          actionResult = { action: 'delete_invoice', invoiceId: invoice.invoiceId, deleted };
        }
      } else {
        const upserted = await upsertInvoice(payload);
        actionResult = upserted ? { action: 'upsert_invoice' } : { action: 'ignored_deleted_invoice' };
      }
    } else if (isContactPayload(payload, eventType)) {
      const contact = getContactPayload(payload);
      contactId = contact.id || contact.contactId || contact.contact_id || payload.contactId || payload.contact_id;

      if (isDeleteEvent(payload, eventType)) {
        if (contactId) {
          await deleteContact(subAccount.contacts_table_name, contactId);
        }
      } else {
        await upsertContact(subAccount.contacts_table_name, { ...contact, id: contactId || contact.id });
      }
    } else {
      await logAuditEvent({
        subAccountId: subAccount.id,
        eventType: 'WebhookFailure',
        payload: { reason: 'Unsupported webhook payload type', eventType, path: request.originalUrl, payload }
      });
      return response.status(400).json({ error: 'Unsupported webhook payload type' });
    }

    await logAuditEvent({
      subAccountId: subAccount.id,
      eventType,
      contactId: contactId || null,
      payload: { actionResult, payload }
    });

    response.json({ ok: true, ...actionResult });
  } catch (error) {
    await logAuditEvent({
      subAccountId: subAccount?.id || null,
      eventType: 'WebhookFailure',
      contactId: contactId || null,
      payload: { reason: error.message, eventType, path: request.originalUrl }
    }).catch(() => {});
    next(error);
  }
}

router.post('/ghl', handleGhlWebhook);
router.post('/production', handleGhlWebhook);
router.post('/zeaboard', handleGhlWebhook);
router.post('/:webhookName', handleGhlWebhook);
router.get('/ghl', webhookHealth);
router.get('/production', webhookHealth);
router.get('/zeaboard', webhookHealth);
router.get('/:webhookName', webhookHealth);
router.get('/', webhookHealth);
router.post('/', handleGhlWebhook);

export default router;
