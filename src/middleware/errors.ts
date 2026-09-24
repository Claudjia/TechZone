import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route introuvable' });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Données invalides', details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) });
  }
  console.error(error);
  res.status(500).json({ error: 'Une erreur interne est survenue' });
}
