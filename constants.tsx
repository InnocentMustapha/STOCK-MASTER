
import React from 'react';

export const INITIAL_CATEGORIES = [
  'Electronics',
  'Groceries',
  'Clothing',
  'Beauty',
  'Home',
  'Toys',
  'Stationary'
];

export const APP_NAME = "STOCK MASTER";

export const SUBSCRIPTION_PRICES = {
  BASIC: 15000, // TZS
  PREMIUM: 30000 // TZS
};

// Base TZS rates relative to 1 TZS
export const CONVERSION_RATES: Record<string, number> = {
  TZS: 1,
  USD: 0.00038,
  EUR: 0.00035,
  CNY: 0.0028,
  JPY: 0.058,
  KRW: 0.52
};

export const convertTZS = (amount: number, currencyId: string) => {
  const rate = CONVERSION_RATES[currencyId] || 1;
  return amount * rate;
};
