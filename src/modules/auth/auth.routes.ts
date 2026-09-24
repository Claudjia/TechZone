import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(), password: z.string().min(8),
  firstName: z.string().min(1), lastName: z.string().min(1)
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const customer = await prisma.customer.create({
      data: { ...input, email: input.email.toLowerCase(), passwordHash },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    const token = jwt.sign({}, env.JWT_SECRET, { subject: customer.id, expiresIn: '7d' });
    res.status(201).json({ customer, token });
  } catch (error) { next(error); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!customer || !(await bcrypt.compare(input.password, customer.passwordHash))) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const token = jwt.sign({}, env.JWT_SECRET, { subject: customer.id, expiresIn: '7d' });
    res.json({ customer: { id: customer.id, email: customer.email, firstName: customer.firstName, lastName: customer.lastName }, token });
  } catch (error) { next(error); }
});
