import express from 'express';
import {
  getPlayerBankBalances,
  updatePlayerBankCoins,
  verifyAuthToken,
} from '../db/supabase';

function getBearer(req: express.Request): string | undefined {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7).trim() : undefined;
}

/**
 * Dedicated Downtown ATM / Bank Vault Service:
 * - GET  /api/bank/balance  (Fetch persisted wallet + vault balances for authenticated player)
 * - POST /api/bank/deposit  (Move Coins from Wallet -> Bank Vault; persisted for signed-in accounts)
 * - POST /api/bank/withdraw (Move Coins from Bank Vault -> Wallet; persisted for signed-in accounts)
 */
export function createBankRouter(): express.Router {
  const router = express.Router();

  router.get('/balance', async (req, res) => {
    try {
      const verified = verifyAuthToken(getBearer(req));
      if (!verified) {
        res.status(401).json({ error: 'Sign in to query cloud ATM Bank Vault balance.' });
        return;
      }
      const balances = await getPlayerBankBalances(verified.playerId);
      if (!balances) {
        res.status(404).json({ error: 'Player vault record not found.' });
        return;
      }
      res.json({ ok: true, ...balances });
    } catch (err) {
      console.error('[Phum Bank] GET /balance error:', err);
      res.status(500).json({ error: 'Failed to load ATM Bank balance.' });
    }
  });

  router.post('/deposit', async (req, res) => {
    try {
      const verified = verifyAuthToken(getBearer(req));
      const body = req.body as { amount?: number; walletCoins?: number; bankCoins?: number };
      const amount = Math.floor(Number(body.amount ?? 0));
      const wallet = Math.max(0, Math.floor(Number(body.walletCoins ?? 0)));
      const bank = Math.max(0, Math.floor(Number(body.bankCoins ?? 0)));

      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'Enter a valid positive Coin amount to deposit.' });
        return;
      }
      if (amount > wallet) {
        res.status(400).json({ error: `Not enough wallet Coins (have ${wallet.toLocaleString()}c).` });
        return;
      }

      const nextWallet = wallet - amount;
      const nextBank = bank + amount;

      if (verified) {
        await updatePlayerBankCoins(verified.playerId, nextWallet, nextBank);
      }

      res.json({
        ok: true,
        walletCoins: nextWallet,
        bankCoins: nextBank,
        persisted: Boolean(verified),
        message: `🏧 Deposited ${amount.toLocaleString()} Coins into ATM Bank Vault!`,
      });
    } catch (err) {
      console.error('[Phum Bank] POST /deposit error:', err);
      res.status(500).json({ error: 'ATM Bank deposit failed.' });
    }
  });

  router.post('/withdraw', async (req, res) => {
    try {
      const verified = verifyAuthToken(getBearer(req));
      const body = req.body as { amount?: number; walletCoins?: number; bankCoins?: number };
      const amount = Math.floor(Number(body.amount ?? 0));
      const wallet = Math.max(0, Math.floor(Number(body.walletCoins ?? 0)));
      const bank = Math.max(0, Math.floor(Number(body.bankCoins ?? 0)));

      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'Enter a valid positive Coin amount to withdraw.' });
        return;
      }
      if (amount > bank) {
        res.status(400).json({ error: `ATM Bank Vault only holds ${bank.toLocaleString()} Coins.` });
        return;
      }

      const nextWallet = wallet + amount;
      const nextBank = bank - amount;

      if (verified) {
        await updatePlayerBankCoins(verified.playerId, nextWallet, nextBank);
      }

      res.json({
        ok: true,
        walletCoins: nextWallet,
        bankCoins: nextBank,
        persisted: Boolean(verified),
        message: `💸 Withdrew ${amount.toLocaleString()} Coins from ATM Bank Vault!`,
      });
    } catch (err) {
      console.error('[Phum Bank] POST /withdraw error:', err);
      res.status(500).json({ error: 'ATM Bank withdrawal failed.' });
    }
  });

  return router;
}
