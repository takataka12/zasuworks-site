const PRODUCT_VOCAL = 'ZASU VOCAL';
const MAX_HTML_BYTES = 200000;
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,192}$/.test(value);

// Only a Square-generated, full payment identifier can bind a receipt to a
// merchant-owned API payment. Short receipt numbers are not globally unique.
export async function findPaymentForReceipt(receiptUrl, { fetchReceipt, getPayment }) {
  const response = await fetchReceipt(receiptUrl);
  if (!response?.ok || !String(response.headers?.get('content-type') || '').toLowerCase().includes('text/html')) return null;
  const html = await response.text();
  if (html.length === 0 || html.length > MAX_HTML_BYTES ||
      !html.includes('ZASU WORKS') || (!html.includes(PRODUCT_VOCAL) && !html.includes('ZASU 歌ってみた制作セット'))) return null;
  const ids = new Set([...html.matchAll(/href\s*=\s*["']https:\/\/squareup\.com\/receipts\/pt\/([A-Za-z0-9_-]{16,192})(?=[?\/"'])/gi)].map(match => match[1]));
  if (ids.size !== 1) {
    const error = new Error('receipt_lookup_incomplete');
    error.code = 'receipt_lookup_incomplete';
    throw error;
  }
  const paymentId = [...ids][0];
  const payment = await getPayment(paymentId);
  return payment?.id === paymentId && validId(payment.order_id) ? payment : null;
}
