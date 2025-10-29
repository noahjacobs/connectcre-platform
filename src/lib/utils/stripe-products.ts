export type MembershipTier = 'editorial' | 'pro' | 'broker';
export type BillingInterval = 'month' | 'year';

interface PriceIds {
  year: string;
  month_legacy: string;
}

interface MembershipPrices {
  membership: PriceIds;
}

export const MEMBERSHIP_PRICES: MembershipPrices = {
  membership: {
    year: 'price_1ReL2OBoiESQusD5YGZK690I', // New annual price with quantity support (default)
    month_legacy: 'price_1ReORSBoiESQusD5pOpeFnUm' // Legacy monthly price for backward compatibility
  },
};

export const PRICE_AMOUNTS = {
  membership: {
    month: 399,
    year: 4788 // Updated to match actual annual pricing ($399 * 12)
  },
  seat: {
    month: 8,
    year: 96 // Updated to match actual annual pricing ($99)
  }
} as const;
