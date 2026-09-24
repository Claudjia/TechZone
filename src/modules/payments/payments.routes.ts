import { Router } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { requireAuth } from '../../middleware/auth';
import { stripe } from '../../config/stripe';

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.post('/checkout/:orderId', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, customerId: req.customerId }, include: { items: true, payment: true } });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.status !== 'PENDING') return res.status(409).json({ error: 'Cette commande ne peut plus être payée' });
    if (order.payment?.providerSessionId) return res.status(409).json({ error: 'Une session de paiement existe déjà pour cette commande' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: { currency: order.currency.toLowerCase(), unit_amount: item.unitPriceCents, product_data: { name: item.productName } }
      })),
      metadata: { orderId: order.id },
      success_url: `${env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/checkout/cancel`
    });
    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, amountCents: order.totalCents, currency: order.currency, providerSessionId: session.id },
      update: { providerSessionId: session.id }
    });
    res.json({ checkoutUrl: session.url });
  } catch (error) { next(error); }
});
