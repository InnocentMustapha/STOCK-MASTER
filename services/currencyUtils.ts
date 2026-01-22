
export interface Currency {
    id: string;
    symbol: string;
    name: string;
    rate: number;
}

/**
 * Converts an amount from one currency rate to another.
 * Assumes USD as the base currency (rate = 1).
 */
export const convertPrice = (amount: number, toRate: number): number => {
    return amount * toRate;
};

/**
 * Formats a numeric value into a currency-specific string.
 */
export const formatCurrency = (amount: number, currency: Currency): string => {
    // We assume the amount is already in the target currency as stored in the DB.
    // Double conversion was causing massive numbers in dashboards.
    return `${currency.symbol}${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};
