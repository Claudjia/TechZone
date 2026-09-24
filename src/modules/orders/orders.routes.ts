import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/auth';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const createOrderSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  shippingAddress: z.object({ line1: z.string(), city: z.string(), postalCode: z.string(), country: z.string() }).optional()
});

ordersRouter.post('/', async (req, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const quantities = new Map<string, number>();
    for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    const products = await prisma.product.findMany({ where: { id: { in: [...quantities.keys()] }, active: true } });
    if (products.length !== quantities.size) return res.status(400).json({ error: 'Un ou plusieurs produits sont introuvables' });
    for (const product of products) {
      if (product.stock < quantities.get(product.id)!) return res.status(409).json({ error: `Stock insuffisant pour ${product.name}` });
    }
    const currency = products[0].currency;
    if (products.some((product) => product.currency !== currency)) return res.status(400).json({ error: 'Les produits doivent avoir la même devise' });
    const subtotalCents = products.reduce((sum, product) => sum + product.priceCents * quantities.get(product.id)!, 0);
    const number = `CMD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const order = await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const quantity = quantities.get(product.id)!;
        const changed = await tx.product.updateMany({ where: { id: product.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
        if (changed.count !== 1) throw new Error(`Stock insuffisant pour ${product.name}`);
      }
      return tx.order.create({
        data: {
          number, customerId: req.customerId!, subtotalCents, totalCents: subtotalCents,
          currency, shippingAddress: input.shippingAddress,
          items: { create: products.map((product) => ({ productId: product.id, productName: product.name, quantity: quantities.get(product.id)!, unitPriceCents: product.priceCents })) }
        }, include: { items: true }
      });
    });
    res.status(201).json({ data: order });
  } catch (error) { next(error); }
});

ordersRouter.get('/', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({ where: { customerId: req.customerId }, include: { items: true, payment: true, invoice: true }, orderBy: { createdAt: 'desc' } });
    res.json({ data: orders });
  } catch (error) { next(error); }
});

ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, customerId: req.customerId }, include: { items: true, payment: true, invoice: true } });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json({ data: order });
  } catch (error) { next(error); }
});
