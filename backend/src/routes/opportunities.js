import express from 'express';
import { listOpportunities } from '../models/opportunities.js';

const router = express.Router();

router.get('/', async (request, response, next) => {
  try {
    const limit = Math.min(Number(request.query.limit || 100), 500);
    const offset = Math.max(Number(request.query.offset || 0), 0);
    const opportunities = await listOpportunities({ limit, offset });
    response.json({ opportunities });
  } catch (error) {
    next(error);
  }
});

export default router;
