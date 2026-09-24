import { Router } from 'express';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/auth';

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

invoicesRouter.get('/', async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({ where: { customerId: req.customerId }, include: { order: { include: { items: true } } }, orderBy: { issuedAt: 'desc' } });
    res.json({ data: invoices });
  } catch (error) { next(error); }
});

invoicesRouter.get('/:id', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, customerId: req.customerId }, include: { order: { include: { items: true } }, customer: { select: { firstName: true, lastName: true, email: true } } } });
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
    res.json({ data: invoice });
  } catch (error) { next(error); }
});
