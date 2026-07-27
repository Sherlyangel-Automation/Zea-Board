import express from 'express';
import { pool } from '../db/pool.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();

const meaningfulAuditEventTypes = [
  'UserLogin',
  'UserLogout',
  'UserCreate',
  'UserUpdate',
  'UserDelete',
  'PermissionChange',
  'SettingsUpdate',
  'DepartmentCreate',
  'EmployeeCreate',
  'EmployeeUpdate',
  'EmployeeDelete',
  'DashboardConfigurationChange',
  'ImportRun',
  'ExportRun',
  'WebhookFailure',
  'SubAccountCreate',
  'ManualSync'
];

const meaningfulAuditPattern = '(login|logout|permission|settings|department|employee|dashboard|import|export|webhook.*fail|manual[_-]?sync|sub[_-]?account.*create|^user(create|update|delete)$)';

router.get('/', async (request, response, next) => {
  try {
    const { eventType = '', contactId = '', dateFrom = '', dateTo = '', limit = 100, offset = 0 } = request.query;
    const conditions = [];
    const values = [];

    values.push(meaningfulAuditEventTypes);
    const meaningfulTypesIndex = values.length;
    values.push(meaningfulAuditPattern);
    const meaningfulPatternIndex = values.length;
    conditions.push(`(event_type = ANY($${meaningfulTypesIndex}) OR event_type ~* $${meaningfulPatternIndex})`);

    if (eventType) {
      values.push(`%${String(eventType).toLowerCase()}%`);
      conditions.push(`LOWER(event_type) LIKE $${values.length}`);
    }

    if (contactId) {
      values.push(String(contactId));
      conditions.push(`contact_id = $${values.length}`);
    }

    if (dateFrom) {
      values.push(dateFrom);
      conditions.push(`created_at >= $${values.length}::timestamptz`);
    }

    if (dateTo) {
      values.push(dateTo);
      conditions.push(`created_at <= $${values.length}::timestamptz`);
    }

    values.push(Number(limit) || 100);
    const limitIndex = values.length;
    values.push(Number(offset) || 0);
    const offsetIndex = values.length;

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `
        SELECT id, sub_account_id, event_type, contact_id, payload, created_at
        FROM zea_sync_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      values
    );

    response.json({ logs: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const logged = await logAuditEvent({
      subAccountId: request.body.subAccountId || null,
      eventType: request.body.eventType,
      contactId: request.body.contactId || null,
      payload: request.body.payload || {}
    });

    response.status(logged ? 201 : 202).json({ logged });
  } catch (error) {
    next(error);
  }
});

export default router;
