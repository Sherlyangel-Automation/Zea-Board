import express from 'express';
import { getCustomization, updateCustomization } from '../models/customization.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();

router.get('/', async (_request, response, next) => {
  try {
    const customization = await getCustomization();
    response.json({ customization });
  } catch (error) {
    next(error);
  }
});

router.put('/', async (request, response, next) => {
  try {
    const customization = await updateCustomization(request.body);
    await logAuditEvent({
      eventType: 'SettingsUpdate',
      payload: { module: 'customization', changedFields: Object.keys(request.body || {}) }
    });
    response.json({ customization });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const customization = await updateCustomization(request.body);
    await logAuditEvent({
      eventType: 'SettingsUpdate',
      payload: { module: 'customization', changedFields: Object.keys(request.body || {}) }
    });
    response.json({ customization });
  } catch (error) {
    next(error);
  }
});

export default router;
