import express from 'express';
import { listUsers } from '../models/users.js';

const router = express.Router();

router.get('/', async (request, response, next) => {
  try {
    const limit = Math.min(Number(request.query.limit || 100), 500);
    const offset = Math.max(Number(request.query.offset || 0), 0);
    const users = await listUsers({ limit, offset });
    response.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;
