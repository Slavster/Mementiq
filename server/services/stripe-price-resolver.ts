import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

// Map internal plan names to Stripe lookup_keys
// These lookup_keys must match across test and live environments in Stripe
export const PLAN_LOOKUP_KEYS = {
  // Subscription plans
  basic_monthly: 'tier_1_launch',
  standard_monthly: 'tier_2_launch',
  premium_monthly: 'tier_3_launch',
  
  // Prepaid packages (for future use)
  package_5: 'package_5_videos',
  package_10: 'package_10_videos',
  
  // One-time payments
  revision_payment: 'revision_launch',
} as const;

// Type for plan keys
export type PlanKey = keyof typeof PLAN_LOOKUP_KEYS;

// Cache for resolved prices (cleared periodically)
const priceCache = new Map<string, { price: Stripe.Price; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Resolve a Stripe price by lookup_key
 * Returns the price object which includes the ID needed for checkout/subscription
 */
export async function resolvePriceByLookupKey(planKey: PlanKey): Promise<Stripe.Price> {
  const lookupKey = PLAN_LOOKUP_KEYS[planKey];
  
  // Check cache first
  const cached = priceCache.get(lookupKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Using cached price for lookup_key: ${lookupKey}`);
    return cached.price;
  }
  
  try {
    console.log(`🔍 Resolving price for lookup_key: ${lookupKey}`);
    
    // Fetch prices with the lookup_key filter
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    
    if (prices.data.length === 0) {
      throw new Error(`No active price found for lookup_key: ${lookupKey}`);
    }
    
    const price = prices.data[0];
    console.log(`✅ Resolved price: ${price.id} for lookup_key: ${lookupKey}`);
    
    // Cache the result
    priceCache.set(lookupKey, { price, timestamp: Date.now() });
    
    return price;
  } catch (error) {
    console.error(`❌ Failed to resolve price for lookup_key: ${lookupKey}`, error);
    throw error;
  }
}

/**
 * Resolve multiple prices by lookup_keys (batch operation)
 */
export async function resolvePricesByLookupKeys(planKeys: PlanKey[]): Promise<Map<PlanKey, Stripe.Price>> {
  const results = new Map<PlanKey, Stripe.Price>();
  
  // Resolve all prices in parallel
  const promises = planKeys.map(async (planKey) => {
    try {
      const price = await resolvePriceByLookupKey(planKey);
      results.set(planKey, price);
    } catch (error) {
      console.error(`Failed to resolve price for ${planKey}:`, error);
    }
  });
  
  await Promise.all(promises);
  return results;
}

/**
 * Get price ID for a plan (convenience method)
 */
export async function getPriceIdForPlan(planKey: PlanKey): Promise<string> {
  const price = await resolvePriceByLookupKey(planKey);
  return price.id;
}

/**
 * Clear the price cache (useful for testing or force refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log('🗑️ Price cache cleared');
}

/**
 * Get product information from a price
 */
export async function getProductFromPrice(priceId: string): Promise<Stripe.Product> {
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product'],
  });
  
  if (typeof price.product === 'string') {
    // Product wasn't expanded, fetch it separately
    return await stripe.products.retrieve(price.product);
  }
  
  return price.product as Stripe.Product;
}

/**
 * Map tier names to plan keys
 */
export function tierToPlanKey(tier: string): PlanKey {
  const tierMap: Record<string, PlanKey> = {
    'basic': 'basic_monthly',
    'standard': 'standard_monthly',
    'premium': 'premium_monthly',
  };
  
  const planKey = tierMap[tier];
  if (!planKey) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  
  return planKey;
}

/**
 * Map plan names to plan keys
 */
export function planNameToPlanKey(planName: string): PlanKey {
  const nameMap: Record<string, PlanKey> = {
    'Creative Spark': 'basic_monthly',
    'Consistency Club': 'standard_monthly',
    'Growth Accelerator': 'premium_monthly',
    '5 Video Package': 'package_5',
    '10 Video Package': 'package_10',
  };
  
  const planKey = nameMap[planName];
  if (!planKey) {
    throw new Error(`Invalid plan name: ${planName}`);
  }
  
  return planKey;
}