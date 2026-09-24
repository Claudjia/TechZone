import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { authRouter } from './modules/auth/auth.routes';
import { productsRouter } from './modules/products/products.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { invoicesRouter } from './modules/invoices/invoices.routes';
import { errorHandler, notFound } from './middleware/errors';
import { stripeWebhook } from './modules/payments/payments.webhook';

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Stripe exige le corps brut pour vérifier la signature du webhook.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.post('/api/payments/webhook', stripeWebhook);
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/invoices', invoicesRouter);
app.use(notFound);
app.use(errorHandler);
