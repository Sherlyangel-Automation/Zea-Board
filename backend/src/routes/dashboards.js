import express from 'express';
import { z } from 'zod';
import { createDashboard, getDashboard, listDashboards, updateDashboard } from '../models/dashboards.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();

const dashboardSchema = z.object({
  subAccountId: z.string().uuid(),
  name: z.string().min(1),
  layout: z.record(z.any()).optional(),
  widgets: z.array(z.record(z.any())).optional()
});

const dashboardUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  layout: z.record(z.any()).optional(),
  widgets: z.array(z.record(z.any())).optional()
});

router.get('/', async (_request, response, next) => {
  try {
    response.json({ dashboards: await listDashboards() });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const dashboard = await getDashboard(request.params.id);
    if (!dashboard) return response.status(404).json({ error: 'Dashboard not found' });
    response.json({ dashboard });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const payload = dashboardSchema.parse(request.body);
    const dashboard = await createDashboard(payload);
    await logAuditEvent({
      subAccountId: dashboard.subAccountId,
      eventType: 'DashboardConfigurationChange',
      payload: { action: 'create_dashboard', dashboardId: dashboard.id, name: dashboard.name }
    });
    response.status(201).json({ dashboard });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  try {
    const payload = dashboardUpdateSchema.parse(request.body);
    const dashboard = await updateDashboard(request.params.id, payload);
    if (!dashboard) return response.status(404).json({ error: 'Dashboard not found' });
    await logAuditEvent({
      subAccountId: dashboard.subAccountId,
      eventType: 'DashboardConfigurationChange',
      payload: { action: 'update_dashboard', dashboardId: dashboard.id, name: dashboard.name }
    });
    response.json({ dashboard });
  } catch (error) {
    next(error);
  }
});

export default router;

