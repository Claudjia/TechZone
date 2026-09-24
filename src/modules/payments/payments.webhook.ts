import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { stripe } from '../../config/stripe';

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).send('Signature Stripe absente');
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook invalide: ${(error as Error).message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === 'paid') {
      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { orderId } });
        if (!payment || payment.status === 'SUCCEEDED') return;
        const order = await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
        await tx.payment.update({ where: { orderId }, data: { status: 'SUCCEEDED', providerPaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined } });
        await tx.invoice.upsert({
          where: { orderId },
          create: { orderId, customerId: order.customerId, number: `FAC-${order.number}`, totalCents: order.totalCents, currency: order.currency },
          update: {}
        });
      });
    }
  }
  res.json({ received: true });
}
