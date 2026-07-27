import express from 'express';
import { getInvoiceManagement, listInvoices } from '../models/invoices.js';

const router = express.Router();

function invoiceQueryOptions(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 25), 1), 500);

  return {
    limit,
    offset: (page - 1) * limit,
    search: query.search || '',
    status: query.status || '',
    currency: query.currency || '',
    dateFrom: query.dateFrom || '',
    dateTo: query.dateTo || '',
    contactName: query.contactName || '',
    productName: query.productName || '',
    discountType: query.discountType || '',
    subAccount: query.subAccount || '',
    sortBy: query.sortBy || 'created_in_crm_on',
    sortDirection: query.sortDirection || 'desc'
  };
}

router.get('/', async (request, response, next) => {
  try {
    const data = await getInvoiceManagement(invoiceQueryOptions(request.query));
    response.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/rows', async (request, response, next) => {
  try {
    const invoices = await listInvoices(invoiceQueryOptions(request.query));
    response.json({ invoices });
  } catch (error) {
    next(error);
  }
});

export default router;
