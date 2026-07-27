import { upsertContact } from '../models/contacts.js';
import { markSubAccountSynced } from '../models/subAccounts.js';
import { fetchGhlContacts } from './ghlClient.js';
import { logAuditEvent } from './auditLogger.js';

export async function syncSubAccountContacts(subAccount) {
  const contacts = await fetchGhlContacts({
    apiKey: subAccount.api_key,
    locationId: subAccount.location_id
  });

  for (const contact of contacts) {
    await upsertContact(subAccount.contacts_table_name, contact);
  }

  await markSubAccountSynced(subAccount.id);
  await logAuditEvent({
    subAccountId: subAccount.id,
    eventType: 'ManualSync',
    payload: { module: 'contacts', count: contacts.length }
  });

  return { synced: contacts.length };
}
