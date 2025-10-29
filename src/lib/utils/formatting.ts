export const formatDate = (date: string): string => {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return dateObj.toLocaleDateString("en-US", options);
};

export function formatCurrency(
  amount: number | null | undefined | string, 
  options?: Intl.NumberFormatOptions
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (numericAmount === null || numericAmount === undefined || isNaN(numericAmount)) {
    return "$--"; // Or return "$0.00" or handle as needed
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0, // Adjust as needed, 0 for no cents
    maximumFractionDigits: 0, // Adjust as needed
    ...options, // Allow overriding defaults
  });

  return formatter.format(numericAmount);
} 