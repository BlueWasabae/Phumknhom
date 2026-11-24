import fs from 'fs';
import path from 'path';

export interface TukTukCartItemRecord {
  itemId: string;
  name: string;
  icon: string;
  quantity: number;
  priceCoins: number;
  quality?: 'normal' | 'gold_star';
  summary: string;
}

export interface TukTukCartRecord {
  cartId: string;
  ownerId: string;
  ownerName: string;
  ownerKromTag?: string;
  signTitle: string;
  mapId: 'central_plaza' | 'temple_district';
  x: number;
  y: number;
  items: TukTukCartItemRecord[];
  totalSalesCoins: number;
  totalItemsSold: number;
  openedAt: number;
  isDemo?: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'tukTukCarts.json');

const MAP_SPOTS: Record<'central_plaza' | 'temple_district', Array<{ x: number; y: number }>> = {
  temple_district: [
    { x: 655, y: 620 },
    { x: 945, y: 620 },
    { x: 650, y: 710 },
    { x: 950, y: 710 },
  ],
  central_plaza: [
    { x: 985, y: 645 },
    { x: 615, y: 645 },
    { x: 995, y: 530 },
    { x: 605, y: 530 },
  ],
};

function createSeededDemoCarts(): TukTukCartRecord[] {
  return [
    {
      cartId: 'cart_demo_chef_dara',
      ownerId: 'npc_chef_dara',
      ownerName: 'Chef Dara',
      ownerKromTag: 'PHUM',
      signTitle: "Chef Dara's Hot Snacks",
      mapId: 'temple_district',
      x: 655,
      y: 620,
      items: [
        {
          itemId: 'snack_num_pang',
          name: 'Num Pang',
          icon: '🥖',
          quantity: 12,
          priceCoins: 55,
          quality: 'normal',
          summary: 'Instant +60 HP',
        },
        {
          itemId: 'snack_pepper_skewer',
          name: 'Kampot Pepper Skewers',
          icon: '🍢',
          quantity: 8,
          priceCoins: 175,
          quality: 'gold_star',
          summary: '+25% ATK (4m)',
        },
        {
          itemId: 'elixir_naga',
          name: 'Elixir of the Naga',
          icon: '🧪',
          quantity: 4,
          priceCoins: 650,
          quality: 'normal',
          summary: '+30% Max HP & +10% Lifesteal (5m)',
        },
      ],
      totalSalesCoins: 1420,
      totalItemsSold: 9,
      openedAt: Date.now() - 3600_000,
      isDemo: true,
    },
  ];
}

let cartCache: TukTukCartRecord[] | null = null;

function ensureLoaded(): TukTukCartRecord[] {
  if (cartCache) return cartCache;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        cartCache = parsed;
        return cartCache;
      }
    }
  } catch (err) {
    console.warn('[Phum Server] Failed reading tukTukCarts.json, seeding defaults:', err);
  }
  cartCache = createSeededDemoCarts();
  persist();
  return cartCache;
}

function persist(): void {
  if (!cartCache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(cartCache, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Phum Server] Failed writing tukTukCarts.json:', err);
  }
}

export function listTukTukCarts(mapId?: string): TukTukCartRecord[] {
  const all = ensureLoaded();
  if (mapId === 'central_plaza' || mapId === 'temple_district') {
    return all.filter((c) => c.mapId === mapId && c.items.length > 0);
  }
  return all.filter((c) => c.items.length > 0);
}

export function openTukTukCart(input: {
  ownerId: string;
  ownerName: string;
  ownerKromTag?: string;
  mapId: 'central_plaza' | 'temple_district';
  signTitle?: string;
  items: TukTukCartItemRecord[];
}): { ok: boolean; cart?: TukTukCartRecord; carts: TukTukCartRecord[]; error?: string } {
  const all = ensureLoaded();
  const cleanName = String(input.ownerName || 'Khmer Chef').trim().slice(0, 24) || 'Khmer Chef';
  const cleanMap: 'central_plaza' | 'temple_district' =
    input.mapId === 'central_plaza' ? 'central_plaza' : 'temple_district';

  const sanitizedItems: TukTukCartItemRecord[] = (Array.isArray(input.items) ? input.items : [])
    .slice(0, 6)
    .map((it) => ({
      itemId: String(it.itemId || '').slice(0, 48),
      name: String(it.name || 'Khmer Snack').slice(0, 48),
      icon: String(it.icon || '🥖').slice(0, 8),
      quantity: Math.max(1, Math.min(99, Math.floor(Number(it.quantity) || 1))),
      priceCoins: Math.max(10, Math.min(50000, Math.floor(Number(it.priceCoins) || 50))),
      quality: (it.quality === 'gold_star' ? 'gold_star' : 'normal') as 'normal' | 'gold_star',
      summary: String(it.summary || 'Hot Combat Buff').slice(0, 80),
    }))
    .filter((it) => it.itemId.length > 0);

  if (sanitizedItems.length === 0) {
    return { ok: false, carts: listTukTukCarts(), error: 'Stock at least 1 cooked snack or elixir stack.' };
  }

  // Replace existing cart by the same owner if already open
  const existingIdx = all.findIndex(
    (c) =>
      !c.isDemo &&
      (c.ownerId === input.ownerId || (input.ownerId === 'guest' && c.ownerName === cleanName))
  );

  const spots = MAP_SPOTS[cleanMap];
  const sameMapOthers = all.filter((c, i) => i !== existingIdx && c.mapId === cleanMap);
  const chosenSpot = spots[sameMapOthers.length % spots.length] ?? spots[0];

  const prevSales = existingIdx >= 0 ? all[existingIdx].totalSalesCoins : 0;
  const prevSold = existingIdx >= 0 ? all[existingIdx].totalItemsSold : 0;
  const cart: TukTukCartRecord = {
    cartId: existingIdx >= 0 ? all[existingIdx].cartId : `cart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId: input.ownerId || 'guest',
    ownerName: cleanName,
    ownerKromTag: input.ownerKromTag ? String(input.ownerKromTag).toUpperCase().slice(0, 4) : undefined,
    signTitle: String(input.signTitle || `${cleanName}'s Hot Snacks`).trim().slice(0, 36),
    mapId: cleanMap,
    x: chosenSpot.x,
    y: chosenSpot.y,
    items: sanitizedItems,
    totalSalesCoins: prevSales,
    totalItemsSold: prevSold,
    openedAt: Date.now(),
  };

  if (existingIdx >= 0) {
    all[existingIdx] = cart;
  } else {
    all.push(cart);
  }
  persist();
  return { ok: true, cart, carts: listTukTukCarts() };
}

export function buyFromTukTukCart(input: {
  cartId: string;
  itemId: string;
  quantity?: number;
  buyerId: string;
  buyerName: string;
}): {
  ok: boolean;
  cart?: TukTukCartRecord;
  carts: TukTukCartRecord[];
  purchasedItem?: TukTukCartItemRecord;
  quantityBought?: number;
  totalPrice?: number;
  chefCookingXp?: number;
  error?: string;
} {
  const all = ensureLoaded();
  const cartIdx = all.findIndex((c) => c.cartId === input.cartId);
  if (cartIdx < 0) {
    return { ok: false, carts: listTukTukCarts(), error: 'Food cart is no longer parked here.' };
  }
  const cart = all[cartIdx];
  const itemIdx = cart.items.findIndex((i) => i.itemId === input.itemId && i.quantity > 0);
  if (itemIdx < 0) {
    return { ok: false, carts: listTukTukCarts(), error: 'That snack is sold out!' };
  }
  const stack = cart.items[itemIdx];
  const qty = Math.max(1, Math.min(stack.quantity, Math.floor(Number(input.quantity) || 1)));
  const totalPrice = stack.priceCoins * qty;
  const chefCookingXp = qty * 18;

  const purchasedCopy: TukTukCartItemRecord = { ...stack, quantity: qty };
  if (!cart.isDemo) {
    stack.quantity -= qty;
    if (stack.quantity <= 0) {
      cart.items.splice(itemIdx, 1);
    }
  }
  cart.totalSalesCoins += totalPrice;
  cart.totalItemsSold += qty;

  // Auto-close empty player cart
  if (!cart.isDemo && cart.items.length === 0) {
    all.splice(cartIdx, 1);
  }
  persist();

  return {
    ok: true,
    cart,
    carts: listTukTukCarts(),
    purchasedItem: purchasedCopy,
    quantityBought: qty,
    totalPrice,
    chefCookingXp,
  };
}

export function closeTukTukCart(input: {
  cartId?: string;
  ownerId: string;
  ownerName: string;
}): {
  ok: boolean;
  closedCart?: TukTukCartRecord;
  returnedItems: TukTukCartItemRecord[];
  revenueCoins: number;
  carts: TukTukCartRecord[];
  error?: string;
} {
  const all = ensureLoaded();
  const idx = all.findIndex((c) => {
    if (c.isDemo) return false;
    if (input.cartId && c.cartId === input.cartId) return true;
    return c.ownerId === input.ownerId && (input.ownerId !== 'guest' || c.ownerName === input.ownerName);
  });
  if (idx < 0) {
    return { ok: false, returnedItems: [], revenueCoins: 0, carts: listTukTukCarts(), error: 'No active food cart found.' };
  }
  const [removed] = all.splice(idx, 1);
  persist();
  return {
    ok: true,
    closedCart: removed,
    returnedItems: removed.items,
    revenueCoins: removed.totalSalesCoins,
    carts: listTukTukCarts(),
  };
}
