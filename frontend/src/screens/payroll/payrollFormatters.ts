// src/screens/payroll/payrollFormatters.ts

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || '₹';
};

export const formatCurrency = (amount: any): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (num === undefined || num === null || isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCurrencyWithSymbol = (amount: any, currencyCode: string = 'INR'): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${formatCurrency(amount)}`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
