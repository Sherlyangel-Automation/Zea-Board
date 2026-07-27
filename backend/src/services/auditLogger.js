import { pool } from '../db/pool.js';

const meaningfulAuditEvents = new Set([
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
]);

const meaningfulPatterns = [
  /login/i,
  /logout/i,
  /permission/i,
  /settings/i,
  /department/i,
  /employee/i,
  /dashboard/i,
  /import/i,
  /export/i,
  /webhook.*fail/i,
  /manual[_-]?sync/i,
  /sub[_-]?account.*create/i,
  /^user(create|update|delete)$/i
];

export function isMeaningfulAuditEvent(eventType = '') {
  const normalizedEventType = String(eventType || '').trim();
  return meaningfulAuditEvents.has(normalizedEventType) || meaningfulPatterns.some((pattern) => pattern.test(normalizedEventType));
}

export async function logAuditEvent({ subAccountId = null, eventType, contactId = null, payload = {} }) {
  if (!isMeaningfulAuditEvent(eventType)) return false;

  await pool.query(
    'INSERT INTO zea_sync_events (sub_account_id, event_type, contact_id, payload) VALUES ($1, $2, $3, $4)',
    [subAccountId, eventType, contactId, payload]
  );

  return true;
}

