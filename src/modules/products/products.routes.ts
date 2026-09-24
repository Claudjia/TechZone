import { Router } from 'express';
import { prisma } from '../../config/database';

export const productsRouter = Router();

productsRouter.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
    res.json({ data: products });
  } catch (error) { next(error); }
});

productsRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, active: true } });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ data: product });
  } catch (error) { next(error); }
});
