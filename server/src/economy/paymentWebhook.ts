import crypto from 'crypto';
import express from 'express';
import { creditPlayerDiamonds, verifyAuthToken } from '../db/supabase';
import { presenceRegistry } from '../presence';

export interface PaymentSkuDef {
  sku: string;
  label: string;
  priceUsd: number;
  diamonds: number;
  villagePassDays: number;
}

export const PAYMENT_SKUS: Record<string, PaymentSkuDef> = {
  pack_100: {
    sku: 'pack_100',
    label: '100 Diamonds Pouch',
    priceUsd: 0.99,
    diamonds: 100,
    villagePassDays: 0,
  },
  pack_500: {
    sku: 'pack_500',
    label: '500 Diamonds Chest (+10% Value)',
    priceUsd: 4.49,
    diamonds: 500,
    villagePassDays: 0,
  },
  pack_1200: {
    sku: 'pack_1200',
    label: '1,200 Diamonds Royal Vault',
    priceUsd: 9.99,
    diamonds: 1200,
    villagePassDays: 0,
  },
  monthly_village_pass: {
    sku: 'monthly_village_pass',
    label: 'Monthly Village Pass (30 Days + 300 Diamonds)',
    priceUsd: 2.99,
    diamonds: 300,
    villagePassDays: 30,
  },
};

const processedTransactions = new Set<string>();

function verifyStripeSignature(rawPayload: string, sigHeader: string | undefined, secret: string): boolean {
  if (!sigHeader) return false;
  const parts = sigHeader.split(',').reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawPayload}`, 'utf8')
    .digest('hex');

  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyAbaPaywayHash(
  payload: { tran_id?: string; status?: string | number; amount?: string | number; hash?: string },
  apiKey: string
): boolean {
  if (!payload.hash || !payload.tran_id) return false;
  const merchantId = (process.env.ABA_PAYWAY_MERCHANT_ID || '').trim();
  const baseStr = `${merchantId}${payload.tran_id}${payload.amount ?? ''}${payload.status ?? ''}`;
  const expected = crypto.createHmac('sha512', apiKey).update(baseStr, 'utf8').digest('base64');
  const a = Buffer.from(payload.hash, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function fulfillOrder(
  txId: string,
  playerId: string | undefined,
  sku: string,
  provider: 'stripe' | 'aba_payway' | 'sandbox'
): Promise<{
  ok: true;
  alreadyProcessed?: boolean;
  diamondsGranted: number;
  villagePassUntil: number | null;
  label: string;
} | { ok: false; error: string }> {
  const def = PAYMENT_SKUS[sku];
  if (!def) {
    return { ok: false, error: `Unknown product SKU: ${sku}` };
  }

  if (processedTransactions.has(txId)) {
    return {
      ok: true,
      alreadyProcessed: true,
      diamondsGranted: 0,
      villagePassUntil: null,
      label: def.label,
    };
  }
  processedTransactions.add(txId);

  let villagePassUntil: number | null =
    def.villagePassDays > 0 ? Date.now() + def.villagePassDays * 24 * 60 * 60 * 1000 : null;

  if (playerId && playerId !== 'guest') {
    const credited = await creditPlayerDiamonds(playerId, def.diamonds, def.villagePassDays);
    if (credited.ok && credited.villagePassUntil) {
      villagePassUntil = credited.villagePassUntil;
    }
    presenceRegistry.sendToTarget({ playerId }, 'socialNotice', {
      text: `💎 ${provider.toUpperCase()} Order Fulfilled: ${def.label} (+${def.diamonds} Diamonds)!`,
    });
  }

  return {
    ok: true,
    diamondsGranted: def.diamonds,
    villagePassUntil,
    label: def.label,
  };
}

/**
 * Payment Webhook Router for ភូមិខ្ញុំ (Phum Khnhom):
 * - POST /api/payments/stripe-webhook      (International Cards via Stripe)
 * - POST /api/payments/aba-payway-webhook  (Cambodia KHQR / ABA PayWay)
 * - POST /api/payments/sandbox-topup       (Local Dev Testing ONLY — disabled when NODE_ENV=production)
 */
export function createPaymentRouter(): express.Router {
  const router = express.Router();

  router.get('/catalog', (_req, res) => {
    res.json({
      skus: Object.values(PAYMENT_SKUS),
      sandboxEnabled: process.env.NODE_ENV !== 'production',
      providers: {
        stripeConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        abaPaywayConfigured: Boolean(process.env.ABA_PAYWAY_MERCHANT_ID && process.env.ABA_PAYWAY_API_KEY),
      },
    });
  });

  // 1. Stripe Webhook Scaffold (International Card Payments)
  router.post('/stripe-webhook', async (req, res) => {
    try {
      const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
      const rawPayload = JSON.stringify(req.body ?? {});
      if (secret) {
        const sig = req.headers['stripe-signature'] as string | undefined;
        if (!verifyStripeSignature(rawPayload, sig, secret)) {
          res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
          return;
        }
      }

      const event = req.body as {
        id?: string;
        type?: string;
        data?: {
          object?: {
            id?: string;
            metadata?: { playerId?: string; sku?: string };
          };
        };
      };

      if (
        event.type !== 'checkout.session.completed' &&
        event.type !== 'payment_intent.succeeded'
      ) {
        res.json({ received: true, ignored: true });
        return;
      }

      const obj = event.data?.object;
      const sku = obj?.metadata?.sku || '';
      const playerId = obj?.metadata?.playerId;
      const txId = `stripe_${event.id || obj?.id || Date.now()}`;

      const result = await fulfillOrder(txId, playerId, sku, 'stripe');
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ received: true, ...result });
    } catch (err) {
      console.error('[Phum Payments] Stripe webhook error:', err);
      res.status(500).json({ error: 'Stripe webhook processing failed.' });
    }
  });

  // 2. ABA PayWay KHQR Webhook Scaffold (Local Cambodia Payments)
  router.post('/aba-payway-webhook', async (req, res) => {
    try {
      const apiKey = (process.env.ABA_PAYWAY_API_KEY || '').trim();
      const body = req.body as {
        tran_id?: string;
        status?: number | string;
        amount?: number | string;
        hash?: string;
        playerId?: string;
        sku?: string;
      };

      if (apiKey && !verifyAbaPaywayHash(body, apiKey)) {
        res.status(400).json({ error: 'Invalid ABA PayWay callback hash.' });
        return;
      }

      // ABA PayWay status 0 (or "0" / "APPROVED") indicates successful KHQR payment
      const statusStr = String(body.status ?? '0').toUpperCase();
      if (statusStr !== '0' && statusStr !== 'APPROVED' && statusStr !== 'SUCCESS') {
        res.json({ received: true, ignored: true });
        return;
      }

      const txId = `aba_${body.tran_id || Date.now()}`;
      const result = await fulfillOrder(txId, body.playerId, body.sku || '', 'aba_payway');
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ received: true, ...result });
    } catch (err) {
      console.error('[Phum Payments] ABA PayWay webhook error:', err);
      res.status(500).json({ error: 'ABA PayWay webhook processing failed.' });
    }
  });

  // 3. Sandbox / Dev Test Top-Up (Automatically Disabled in Production!)
  router.post('/sandbox-topup', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        error: 'Sandbox top-up is disabled in production. Use Stripe or ABA PayWay KHQR.',
      });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      const token =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : undefined;
      const verified = verifyAuthToken(token);
      const { sku } = req.body as { sku?: string };
      const txId = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const result = await fulfillOrder(txId, verified?.playerId ?? 'guest', sku || '', 'sandbox');
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result);
    } catch (err) {
      console.error('[Phum Payments] Sandbox top-up error:', err);
      res.status(500).json({ error: 'Sandbox top-up failed.' });
    }
  });

  return router;
}
