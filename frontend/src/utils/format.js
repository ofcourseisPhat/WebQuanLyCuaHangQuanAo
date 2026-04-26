/**
 * Format a number as Vietnamese Dong.
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

/**
 * Format ISO date string to locale date.
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("vi-VN");
