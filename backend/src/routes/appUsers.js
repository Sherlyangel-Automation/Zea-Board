import express from 'express';
import { z } from 'zod';
import { createAppUser, deleteAppUser, listAppUsers, permissionPages, updateAppUser } from '../models/auth.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();
const permissionLevelSchema = z.enum(['hide', 'view', 'edit']);
const userSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
  userType: z.enum(['Owner', 'Admin', 'Developer', 'User'], { message: 'Choose a valid user type.' }),
  permissions: z.record(z.string(), permissionLevelSchema).default({})
});

function validationErrorResponse(error, response) {
  if (!(error instanceof z.ZodError)) return false;
  const messages = error.issues.map((issue) => `${issue.path.join('.') || 'field'}: ${issue.message}`);
  response.status(400).json({ error: messages.join(' ') || 'Validation failed', details: error.flatten() });
  return true;
}

function canManageUsers(user) {
  return ['Owner', 'Admin', 'Developer'].includes(user?.role);
}

router.get('/', async (request, response, next) => {
  try {
    const users = await listAppUsers();
    response.json({ users, permissionPages });
  } catch (error) {
    if (validationErrorResponse(error, response)) return;
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    if (!canManageUsers(request.user)) return response.status(403).json({ error: 'You do not have permission to create users.' });
    const input = userSchema.extend({ password: z.string().min(6) }).parse(request.body);
    const user = await createAppUser(input, request.user.id);
    await logAuditEvent({ eventType: 'UserCreate', payload: { userId: user.id, email: user.email, role: user.role, createdBy: request.user.id } });
    response.status(201).json({ user });
  } catch (error) {
    if (validationErrorResponse(error, response)) return;
    next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  try {
    if (!canManageUsers(request.user)) return response.status(403).json({ error: 'You do not have permission to edit users.' });
    const input = userSchema.parse(request.body);
    const user = await updateAppUser(request.params.id, input);
    if (!user) return response.status(404).json({ error: 'User not found' });
    await logAuditEvent({ eventType: 'UserPermissionUpdate', payload: { userId: user.id, email: user.email, role: user.role, updatedBy: request.user.id } });
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    if (!canManageUsers(request.user)) return response.status(403).json({ error: 'You do not have permission to delete users.' });
    if (request.params.id === request.user.id) return response.status(400).json({ error: 'You cannot delete your own account.' });
    await deleteAppUser(request.params.id);
    await logAuditEvent({ eventType: 'UserDelete', payload: { userId: request.params.id, deletedBy: request.user.id } });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
