import { pool } from '../db/pool.js';
import { deleteInvoice, markInvoiceDeleted, normalizeInvoice } from '../models/invoices.js';
import { deleteOpportunity, markOpportunityDeleted, normalizeOpportunity } from '../models/opportunities.js';

async function applyDeleteEvents() {
  const result = await pool.query(`
    SELECT event_type, payload
    FROM zea_sync_events
    WHERE lower(event_type) LIKE '%delete%'
    ORDER BY created_at ASC
  `);

  let deletedOpportunities = 0;
  let deletedInvoices = 0;

  for (const event of result.rows) {
    const eventType = String(event.event_type || '').toLowerCase();

    if (eventType.includes('opportunity')) {
      const opportunity = normalizeOpportunity(event.payload);
      if (opportunity.opportunityId) {
        await markOpportunityDeleted(opportunity.opportunityId, event.payload);
        deletedOpportunities += await deleteOpportunity(opportunity.opportunityId);
      }
    }

    if (eventType.includes('invoice')) {
      const invoice = normalizeInvoice(event.payload);
      if (invoice.invoiceId) {
        await markInvoiceDeleted(invoice.invoiceId, event.payload);
        deletedInvoices += await deleteInvoice(invoice.invoiceId);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        deleteEventsChecked: result.rowCount,
        deletedOpportunities,
        deletedInvoices
      },
      null,
      2
    )
  );
}

applyDeleteEvents()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
