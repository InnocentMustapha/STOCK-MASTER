
export interface Currency {
    id: string;
    symbol: string;
    name: string;
    rate: number;
}

/**
 * Formats a numeric value in Tanzanian Shillings (TZS).
 * No conversion is applied - amounts are stored and displayed directly in TZS.
 */
export const formatCurrency = (amount: number, currency?: Currency): string => {
    // Always format as TZS without conversion
    return `TSh ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
};
