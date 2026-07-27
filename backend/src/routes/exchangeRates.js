import express from 'express';

const router = express.Router();
const RATE_SOURCE_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 30 * 60 * 1000;

let cachedRates = null;
let cachedAt = 0;

async function fetchExchangeRates() {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return { ...cachedRates, cached: true };
  }

  const response = await fetch(RATE_SOURCE_URL, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Exchange rate provider returned ${response.status}`);
  }

  const data = await response.json();
  if (!data?.rates || typeof data.rates !== 'object') {
    throw new Error('Exchange rate provider returned an invalid response');
  }

  cachedRates = {
    base: data.base_code || 'USD',
    rates: { USD: 1, ...data.rates },
    provider: 'open.er-api.com',
    updatedAt: data.time_last_update_utc || new Date().toISOString(),
    nextUpdateAt: data.time_next_update_utc || null
  };
  cachedAt = now;

  return { ...cachedRates, cached: false };
}

router.get('/', async (_request, response, next) => {
  try {
    const rates = await fetchExchangeRates();
    response.json(rates);
  } catch (error) {
    if (cachedRates) {
      response.json({ ...cachedRates, cached: true, warning: error.message });
      return;
    }
    next(error);
  }
});

export default router;
