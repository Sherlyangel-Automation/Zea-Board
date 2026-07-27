import express from 'express';
import { z } from 'zod';
import { listContacts } from '../models/contacts.js';
import { createSubAccount, getSubAccountById, listSubAccounts } from '../models/subAccounts.js';
import { logAuditEvent } from '../services/auditLogger.js';
import { syncSubAccountContacts } from '../services/syncContacts.js';

const router = express.Router();

const createSubAccountSchema = z.object({
  name: z.string().min(1),
  locationId: z.string().min(1),
  apiKey: z.string().min(1)
});

router.get('/', async (_request, response, next) => {
  try {
    response.json({ subAccounts: await listSubAccounts() });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const payload = createSubAccountSchema.parse(request.body);
    const subAccount = await createSubAccount(payload);
    await logAuditEvent({
      subAccountId: subAccount.id,
      eventType: 'SubAccountCreate',
      payload: { name: subAccount.name, locationId: subAccount.location_id }
    });
    response.status(201).json({ subAccount });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/sync', async (request, response, next) => {
  try {
    const subAccount = await getSubAccountById(request.params.id);
    if (!subAccount) {
      return response.status(404).json({ error: 'Sub-account not found' });
    }

    const result = await syncSubAccountContacts(subAccount);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/contacts', async (request, response, next) => {
  try {
    const subAccount = await getSubAccountById(request.params.id);
    if (!subAccount) {
      return response.status(404).json({ error: 'Sub-account not found' });
    }

    const limit = Math.min(Number(request.query.limit || 100), 500);
    const offset = Math.max(Number(request.query.offset || 0), 0);
    const contacts = await listContacts(subAccount.contacts_table_name, { limit, offset });
    response.json({ contacts });
  } catch (error) {
    next(error);
  }
});

export default router;
