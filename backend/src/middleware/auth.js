import { getUserBySessionToken } from '../models/auth.js';

export const sessionCookieName = 'zea_session';

export function readCookies(request) {
  return String(request.headers.cookie || '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex === -1) return cookies;
      const key = decodeURIComponent(cookie.slice(0, separatorIndex));
      const value = decodeURIComponent(cookie.slice(separatorIndex + 1));
      return { ...cookies, [key]: value };
    }, {});
}

export function sessionCookieOptions(request, expiresAt) {
  const isSecure = request.secure || request.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  };
}

export async function requireAuth(request, response, next) {
  try {
    const token = readCookies(request)[sessionCookieName];
    const user = await getUserBySessionToken(token);
    if (!user) {
      return response.status(401).json({ error: 'Authentication required' });
    }
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

