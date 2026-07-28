import express from 'express';
import { z } from 'zod';
import { authenticateUser, createSession, deleteSession, getUserBySessionToken } from '../models/auth.js';
import { readCookies, sessionCookieName, sessionCookieOptions } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

router.get('/me', async (request, response, next) => {
  try {
    const token = readCookies(request)[sessionCookieName];
    const user = await getUserBySessionToken(token);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (request, response, next) => {
  try {
    const { identifier, password } = loginSchema.parse(request.body);
    const user = await authenticateUser(identifier, password);
    if (!user) {
      return response.status(401).json({ error: 'Invalid email/username or password' });
    }

    const session = await createSession(user.id);
    response.cookie(sessionCookieName, session.token, sessionCookieOptions(request, session.expiresAt));
    await logAuditEvent({ eventType: 'UserLogin', payload: { userId: user.id, role: user.role, email: user.email } });
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (request, response, next) => {
  try {
    const token = readCookies(request)[sessionCookieName];
    const user = await getUserBySessionToken(token);
    await deleteSession(token);
    response.clearCookie(sessionCookieName, { path: '/' });
    if (user) {
      await logAuditEvent({ eventType: 'UserLogout', payload: { userId: user.id, role: user.role, email: user.email } });
    }
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;

