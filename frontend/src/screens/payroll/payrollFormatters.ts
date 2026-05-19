// src/screens/payroll/payrollFormatters.ts
export const formatCurrency = (amount: any): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (num === undefined || num === null || isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
