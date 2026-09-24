import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentification requise' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.customerId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}
