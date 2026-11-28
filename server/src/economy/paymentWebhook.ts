import crypto from 'crypto';
import express from 'express';
import { creditPlayerDiamonds, verifyAuthToken } from '../db/supabase';
import { presenceRegistry } from '../presence';

export interface PaymentSkuDef {
  sku: string;
  label: string;
  priceUsd: number;
  priceCents: number;
  diamonds: number;
  villagePassDays: number;
  firstTimeDoubleEligible?: boolean;
  oneTimeOnly?: boolean;
  bonusItems?: Array<{ itemId: string; quantity: number }>;
}

/**
 * Authoritative server-side SKU catalog.
 * Client requests ONLY send `{ sku }`; prices and rewards are ALWAYS resolved on the server.
 */
export const PAYMENT_SKUS: Record<string, PaymentSkuDef> = {
  welcome_bundle: {
    sku: 'welcome_bundle',
    label: 'Phum Welcome Bundle (120 Diamonds + Golden Krama Cape + Puppy Pet + 3× Reforge Stones)',
    priceUsd: 1.99,
    priceCents: 199,
    diamonds: 120,
    villagePassDays: 0,
    oneTimeOnly: true,
    bonusItems: [
      { itemId: 'wings_golden_krama_cape', quantity: 1 },
      { itemId: 'pet_village_puppy', quantity: 1 },
      { itemId: 'mat_reforge_stone', quantity: 3 },
    ],
  },
  pack_60: {
    sku: 'pack_60',
    label: '60 Diamonds Pouch',
    priceUsd: 0.99,
    priceCents: 99,
    diamonds: 60,
    villagePassDays: 0,
    firstTimeDoubleEligible: true,
  },
  pack_320: {
    sku: 'pack_320',
    label: '320 Diamonds Chest',
    priceUsd: 4.99,
    priceCents: 499,
    diamonds: 320,
    villagePassDays: 0,
    firstTimeDoubleEligible: true,
  },
  pack_700: {
    sku: 'pack_700',
    label: '700 Diamonds Angkor Vault',
    priceUsd: 9.99,
    priceCents: 999,
    diamonds: 700,
    villagePassDays: 0,
    firstTimeDoubleEligible: true,
  },
  pack_1600: {
    sku: 'pack_1600',
    label: '1,600 Diamonds Sovereign Treasury',
    priceUsd: 19.99,
    priceCents: 1999,
    diamonds: 1600,
    villagePassDays: 0,
    firstTimeDoubleEligible: true,
  },
  vip_pass_30d: {
    sku: 'vip_pass_30d',
    label: 'VIP Convenience Pass (30 Days — Zero Combat P2W)',
    priceUsd: 4.99,
    priceCents: 499,
    diamonds: 0,
    villagePassDays: 30,
  },
  // Legacy SKUs kept for full backwards compatibility
  pack_100: {
    sku: 'pack_100',
    label: '100 Diamonds Pouch',
    priceUsd: 0.99,
    priceCents: 99,
    diamonds: 100,
    villagePassDays: 0,
  },
  pack_500: {
    sku: 'pack_500',
    label: '500 Diamonds Chest (+10% Value)',
    priceUsd: 4.49,
    priceCents: 449,
    diamonds: 500,
    villagePassDays: 0,
  },
  pack_1200: {
    sku: 'pack_1200',
    label: '1,200 Diamonds Royal Vault',
    priceUsd: 9.99,
    priceCents: 999,
    diamonds: 1200,
    villagePassDays: 0,
  },
  monthly_village_pass: {
    sku: 'monthly_village_pass',
    label: 'Monthly Village Pass (30 Days + 300 Diamonds)',
    priceUsd: 2.99,
    priceCents: 299,
    diamonds: 300,
    villagePassDays: 30,
  },
};

// Idempotency ledger: prevents duplicate Diamond crediting on webhook retries
const processedTransactions = new Set<string>();
const MAX_STRIPE_TIMESTAMP_DRIFT_SEC = 300; // 5-minute replay tolerance

function verifyStripeSignature(
  rawPayload: Buffer | string,
  sigHeader: string | undefined,
  secret: string
): boolean {
  if (!sigHeader || !secret) return false;
  const parts = sigHeader.split(',').reduce<Record<string, string[]>>((acc, kv) => {
    const idx = kv.indexOf('=');
    if (idx > 0) {
      const k = kv.slice(0, idx).trim();
      const v = kv.slice(idx + 1).trim();
      if (!acc[k]) acc[k] = [];
      acc[k].push(v);
    }
    return acc;
  }, {});

  const timestampStr = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestampStr || signatures.length === 0) return false;

  const tsNum = Number(timestampStr);
  if (!Number.isFinite(tsNum)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > MAX_STRIPE_TIMESTAMP_DRIFT_SEC) {
    return false;
  }

  const payloadStr = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : rawPayload;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestampStr}.${payloadStr}`, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
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

function extractBearer(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

async function fulfillOrder(
  txId: string,
  playerId: string | undefined,
  sku: string,
  provider: 'stripe' | 'aba_payway' | 'sandbox',
  firstTimeBonus = false
): Promise<
  | {
      ok: true;
      alreadyProcessed?: boolean;
      sku: string;
      diamondsGranted: number;
      firstTimeDoubled: boolean;
      villagePassUntil: number | null;
      bonusItems: Array<{ itemId: string; quantity: number }>;
      label: string;
    }
  | { ok: false; error: string }
> {
  const def = PAYMENT_SKUS[sku];
  if (!def) {
    return { ok: false, error: `Unknown product SKU: ${sku}` };
  }

  if (processedTransactions.has(txId)) {
    return {
      ok: true,
      alreadyProcessed: true,
      sku: def.sku,
      diamondsGranted: 0,
      firstTimeDoubled: false,
      villagePassUntil: null,
      bonusItems: [],
      label: def.label,
    };
  }
  processedTransactions.add(txId);

  const shouldDouble = Boolean(firstTimeBonus && def.firstTimeDoubleEligible);
  const diamondsGranted = shouldDouble ? def.diamonds * 2 : def.diamonds;
  const bonusItems = def.bonusItems ? def.bonusItems.map((b) => ({ ...b })) : [];

  let villagePassUntil: number | null =
    def.villagePassDays > 0 ? Date.now() + def.villagePassDays * 24 * 60 * 60 * 1000 : null;

  if (playerId && playerId !== 'guest') {
    const credited = await creditPlayerDiamonds(playerId, diamondsGranted, def.villagePassDays);
    if (credited.ok && credited.villagePassUntil) {
      villagePassUntil = credited.villagePassUntil;
    }
    presenceRegistry.sendToTarget({ playerId }, 'socialNotice', {
      text: `💎 ${provider.toUpperCase()} Order Fulfilled: ${def.label}${
        diamondsGranted > 0 ? ` (+${diamondsGranted} Diamonds!)` : ''
      }`,
    });
  }

  return {
    ok: true,
    sku: def.sku,
    diamondsGranted,
    firstTimeDoubled: shouldDouble,
    villagePassUntil,
    bonusItems,
    label: def.label,
  };
}

/**
 * Production-grade Raw-Body Stripe Webhook Handler:
 * MUST be mounted BEFORE `express.json()` via:
 * `app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), createStripeRawWebhookHandler())`
 */
export function createStripeRawWebhookHandler(): express.RequestHandler {
  return async (req, res) => {
    try {
      const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
      const rawBuf = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}), 'utf8');

      if (secret) {
        const sig = req.headers['stripe-signature'] as string | undefined;
        if (!verifyStripeSignature(rawBuf, sig, secret)) {
          res.status(400).json({ error: 'Invalid or expired Stripe webhook signature.' });
          return;
        }
      }

      const event = JSON.parse(rawBuf.toString('utf8')) as {
        id?: string;
        type?: string;
        data?: {
          object?: {
            id?: string;
            metadata?: { playerId?: string; sku?: string; firstTimeBonus?: string };
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
      const firstTimeBonus = obj?.metadata?.firstTimeBonus === 'true';
      const eventId = event.id || obj?.id;
      if (!eventId) {
        res.status(400).json({ error: 'Missing Stripe event id for idempotency check.' });
        return;
      }

      const result = await fulfillOrder(`stripe_${eventId}`, playerId, sku, 'stripe', firstTimeBonus);
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ received: true, ...result });
    } catch (err) {
      console.error('[Phum Payments] Raw Stripe webhook error:', err);
      res.status(400).json({ error: 'Malformed Stripe webhook payload.' });
    }
  };
}

/**
 * Checkout Router mounted at `/api/checkout`:
 * - POST /api/checkout/stripe   (Server-side SKU lookup -> Stripe Checkout Session or Sandbox fallback)
 * - POST /api/checkout/aba-khqr (Server-side SKU lookup -> ABA PayWay KHQR payload or Sandbox fallback)
 */
export function createCheckoutRouter(): express.Router {
  const router = express.Router();

  router.post('/stripe', async (req, res) => {
    try {
      const verified = verifyAuthToken(extractBearer(req));
      const { sku, firstTimeBonus, returnOrigin } = req.body as {
        sku?: string;
        firstTimeBonus?: boolean;
        returnOrigin?: string;
      };
      const def = sku ? PAYMENT_SKUS[sku] : undefined;
      if (!def) {
        res.status(400).json({ error: `Invalid product SKU: ${sku ?? ''}` });
        return;
      }

      const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
      const safeOrigin =
        typeof returnOrigin === 'string' && /^https?:\/\/[a-zA-Z0-9._:-]+$/.test(returnOrigin)
          ? returnOrigin
          : 'https://www.bluexacedamy.space';

      if (stripeKey) {
        const params = new URLSearchParams();
        params.set('mode', 'payment');
        params.set('success_url', `${safeOrigin}/?checkout=success&sku=${encodeURIComponent(def.sku)}`);
        params.set('cancel_url', `${safeOrigin}/?checkout=cancel`);
        params.set('line_items[0][quantity]', '1');
        params.set('line_items[0][price_data][currency]', 'usd');
        params.set('line_items[0][price_data][unit_amount]', String(def.priceCents));
        params.set('line_items[0][price_data][product_data][name]', def.label);
        params.set('metadata[sku]', def.sku);
        params.set('metadata[playerId]', verified?.playerId ?? 'guest');
        params.set('metadata[firstTimeBonus]', firstTimeBonus ? 'true' : 'false');

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const stripeJson = (await stripeRes.json().catch(() => ({}))) as {
          id?: string;
          url?: string;
          error?: { message?: string };
        };
        if (!stripeRes.ok || !stripeJson.url) {
          res.status(502).json({
            error: stripeJson.error?.message || 'Stripe Checkout Session creation failed.',
          });
          return;
        }
        res.json({
          ok: true,
          mode: 'stripe',
          sessionId: stripeJson.id,
          checkoutUrl: stripeJson.url,
          sku: def.sku,
          priceUsd: def.priceUsd,
        });
        return;
      }

      // Clean Sandbox Fallback when STRIPE_SECRET_KEY is not configured yet
      const txId = `sandbox_stripe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fulfilled = await fulfillOrder(
        txId,
        verified?.playerId ?? 'guest',
        def.sku,
        'sandbox',
        Boolean(firstTimeBonus)
      );
      if (!fulfilled.ok) {
        res.status(400).json({ error: fulfilled.error });
        return;
      }
      res.json({
        ...fulfilled,
        mode: 'sandbox',
        notice: 'STRIPE_SECRET_KEY not set — fulfilled instantly in Sandbox test mode.',
      });
    } catch (err) {
      console.error('[Phum Checkout] Stripe checkout error:', err);
      res.status(500).json({ error: 'Stripe checkout failed.' });
    }
  });

  router.post('/aba-khqr', async (req, res) => {
    try {
      const verified = verifyAuthToken(extractBearer(req));
      const { sku, firstTimeBonus } = req.body as {
        sku?: string;
        firstTimeBonus?: boolean;
      };
      const def = sku ? PAYMENT_SKUS[sku] : undefined;
      if (!def) {
        res.status(400).json({ error: `Invalid product SKU: ${sku ?? ''}` });
        return;
      }

      const merchantId = (process.env.ABA_PAYWAY_MERCHANT_ID || '').trim();
      const apiKey = (process.env.ABA_PAYWAY_API_KEY || '').trim();
      const tranId = `PHUM${Date.now()}${Math.floor(100 + Math.random() * 899)}`;
      const reqTime = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      const amountStr = def.priceUsd.toFixed(2);

      if (merchantId && apiKey) {
        const itemsB64 = Buffer.from(
          JSON.stringify([{ name: def.label, quantity: '1', price: amountStr }]),
          'utf8'
        ).toString('base64');
        const hashPayload = `${reqTime}${merchantId}${tranId}${amountStr}${itemsB64}`;
        const hash = crypto.createHmac('sha512', apiKey).update(hashPayload, 'utf8').digest('base64');

        res.json({
          ok: true,
          mode: 'aba_khqr',
          endpoint:
            process.env.ABA_PAYWAY_ENDPOINT ||
            'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase',
          merchantId,
          tranId,
          reqTime,
          amount: amountStr,
          currency: 'USD',
          paymentOption: 'abapay_khqr',
          items: itemsB64,
          hash,
          sku: def.sku,
          label: def.label,
        });
        return;
      }

      // Clean Sandbox Fallback when ABA PayWay keys are not yet configured
      const txId = `sandbox_aba_${tranId}`;
      const fulfilled = await fulfillOrder(
        txId,
        verified?.playerId ?? 'guest',
        def.sku,
        'sandbox',
        Boolean(firstTimeBonus)
      );
      if (!fulfilled.ok) {
        res.status(400).json({ error: fulfilled.error });
        return;
      }
      res.json({
        ...fulfilled,
        mode: 'sandbox',
        provider: 'aba_khqr',
        tranId,
        amountUsd: def.priceUsd,
        notice: 'ABA_PAYWAY_MERCHANT_ID / ABA_PAYWAY_API_KEY not set — fulfilled in KHQR Sandbox mode.',
      });
    } catch (err) {
      console.error('[Phum Checkout] ABA KHQR checkout error:', err);
      res.status(500).json({ error: 'ABA KHQR checkout failed.' });
    }
  });

  return router;
}

/**
 * Payment Webhook Router for ភូមិខ្ញុំ (Phum Khnhom):
 * - GET  /api/payments/catalog
 * - POST /api/payments/stripe-webhook      (Legacy JSON webhook alias)
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
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
        stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        abaPaywayConfigured: Boolean(
          process.env.ABA_PAYWAY_MERCHANT_ID && process.env.ABA_PAYWAY_API_KEY
        ),
      },
    });
  });

  // 1. Stripe Webhook Alias
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
            metadata?: { playerId?: string; sku?: string; firstTimeBonus?: string };
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
      const firstTimeBonus = obj?.metadata?.firstTimeBonus === 'true';
      const txId = `stripe_${event.id || obj?.id || Date.now()}`;

      const result = await fulfillOrder(txId, playerId, sku, 'stripe', firstTimeBonus);
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

  // 2. ABA PayWay KHQR Webhook (Local Cambodia Payments)
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
        firstTimeBonus?: boolean;
      };

      if (apiKey && !verifyAbaPaywayHash(body, apiKey)) {
        res.status(400).json({ error: 'Invalid ABA PayWay callback hash.' });
        return;
      }

      const statusStr = String(body.status ?? '0').toUpperCase();
      if (statusStr !== '0' && statusStr !== 'APPROVED' && statusStr !== 'SUCCESS') {
        res.json({ received: true, ignored: true });
        return;
      }

      const txId = `aba_${body.tran_id || Date.now()}`;
      const result = await fulfillOrder(
        txId,
        body.playerId,
        body.sku || '',
        'aba_payway',
        Boolean(body.firstTimeBonus)
      );
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
      const verified = verifyAuthToken(extractBearer(req));
      const { sku, firstTimeBonus } = req.body as { sku?: string; firstTimeBonus?: boolean };
      const txId = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const result = await fulfillOrder(
        txId,
        verified?.playerId ?? 'guest',
        sku || '',
        'sandbox',
        Boolean(firstTimeBonus)
      );
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
