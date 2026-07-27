export function contactsTableName(locationId) {
  return 'contacts_list';
}

export function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}
