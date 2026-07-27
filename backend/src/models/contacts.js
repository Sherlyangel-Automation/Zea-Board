import { pool } from '../db/pool.js';
import { quoteIdentifier } from '../utils/tableNames.js';

const LEADGEN_OWNER_CUSTOM_FIELD_ID = 'coVZUNnPRDw4cRNIGJws';

async function ensureContactColumns(tableName) {
  const quotedTable = quoteIdentifier(tableName);

  await pool.query(`
    ALTER TABLE ${quotedTable}
      ADD COLUMN IF NOT EXISTS sub_account_id TEXT,
      ADD COLUMN IF NOT EXISTS sub_account_name TEXT,
      ADD COLUMN IF NOT EXISTS source TEXT,
      ADD COLUMN IF NOT EXISTS leadgen_owner TEXT,
      ADD COLUMN IF NOT EXISTS created_in_crm_on TIMESTAMPTZ
  `);
}

function getCustomFieldValue(contact, fieldId) {
  const customFields = contact.customFields || contact.custom_fields || contact.customData || contact.custom_data || [];

  if (Array.isArray(customFields)) {
    const field = customFields.find((customField) => customField.id === fieldId || customField.fieldId === fieldId);
    return field?.value ?? null;
  }

  if (customFields && typeof customFields === 'object') {
    return customFields[fieldId] ?? null;
  }

  return null;
}

export function normalizeContact(contact) {
  const firstName = contact.firstName || contact.first_name || '';
  const lastName = contact.lastName || contact.last_name || '';
  const fullName = contact.name || contact.fullName || contact.full_name || `${firstName} ${lastName}`.trim() || null;
  const tags = Array.isArray(contact.tags) ? contact.tags.join(', ') : contact.tags || contact.tag || null;
  const assignedUserName = contact.assignedUserName || contact.assigned_user || [contact.user?.firstName, contact.user?.lastName].filter(Boolean).join(' ') || null;
  const source = contact.contact_source || contact.source || contact.medium || contact.contact?.attributionSource?.medium || contact.attributionSource?.medium || null;
  const createdInCrmOn =
    contact.date_created ||
    contact.dateCreated ||
    contact.dateAdded ||
    contact.date_added ||
    contact.createdAt ||
    contact.created_at ||
    null;

  return {
    contactId: contact.id || contact.contactId || contact.contact_id,
    subAccountId: contact.sub_account_id || contact.location?.id || contact.locationId || contact.location_id || null,
    subAccountName: contact.sub_account_name || contact.location?.name || contact.locationName || contact.location_name || null,
    name: fullName,
    email: contact.email || null,
    phoneNumber: contact.phone || contact.phoneNumber || null,
    tag: tags,
    timezone: contact.timezone || contact.timeZone || null,
    medium: contact.contact?.attributionSource?.medium || contact.attributionSource?.medium || source,
    source,
    assignedUser: contact.assignedTo || assignedUserName,
    userId: contact.assignedToUserId || contact.userId || contact.user_id || contact.assignedTo || contact.user?.id || contact.user?.email || null,
    leadgenOwner: getCustomFieldValue(contact, LEADGEN_OWNER_CUSTOM_FIELD_ID),
    createdInCrmOn,
    rawPayload: contact
  };
}

export async function upsertContact(tableName, contact) {
  await ensureContactColumns(tableName);

  const normalized = normalizeContact(contact);
  if (!normalized.contactId) {
    return null;
  }

  const quotedTable = quoteIdentifier(tableName);
  const result = await pool.query(
    `
      INSERT INTO ${quotedTable}
        (contact_id, sub_account_id, sub_account_name, name, email, phone_number, tag, timezone, medium, source, assigned_user, user_id, leadgen_owner, raw_payload, created_at, created_in_crm_on)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15::timestamptz, NOW()), $15::timestamptz)
      ON CONFLICT (contact_id)
      DO UPDATE SET
        sub_account_id = EXCLUDED.sub_account_id,
        sub_account_name = EXCLUDED.sub_account_name,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone_number = EXCLUDED.phone_number,
        tag = EXCLUDED.tag,
        timezone = EXCLUDED.timezone,
        medium = EXCLUDED.medium,
        source = EXCLUDED.source,
        assigned_user = EXCLUDED.assigned_user,
        user_id = EXCLUDED.user_id,
        leadgen_owner = EXCLUDED.leadgen_owner,
        raw_payload = EXCLUDED.raw_payload,
        created_at = EXCLUDED.created_at,
        created_in_crm_on = COALESCE(EXCLUDED.created_in_crm_on, ${quotedTable}.created_in_crm_on),
        updated_at = NOW()
      RETURNING *
    `,
    [
      normalized.contactId,
      normalized.subAccountId,
      normalized.subAccountName,
      normalized.name,
      normalized.email,
      normalized.phoneNumber,
      normalized.tag,
      normalized.timezone,
      normalized.medium,
      normalized.source,
      normalized.assignedUser,
      normalized.userId,
      normalized.leadgenOwner,
      normalized.rawPayload,
      normalized.createdInCrmOn
    ]
  );

  return result.rows[0];
}

export async function deleteContact(tableName, contactId) {
  const quotedTable = quoteIdentifier(tableName);
  await pool.query(`DELETE FROM ${quotedTable} WHERE contact_id = $1`, [contactId]);
}

export async function listContacts(tableName, { limit = 100, offset = 0 } = {}) {
  await ensureContactColumns(tableName);

  const quotedTable = quoteIdentifier(tableName);
  const result = await pool.query(
    `
      SELECT contact_id, sub_account_id, sub_account_name, name, email, phone_number, tag, timezone, medium, source, assigned_user, user_id, leadgen_owner, created_in_crm_on, created_at, updated_at
      FROM ${quotedTable}
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  return result.rows;
}
