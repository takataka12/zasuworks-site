const LOCATION = 'LTF93YQYAF2MF';
const PRODUCT_MARKER = 'ZASU DAW';
const MAX_HTML_BYTES = 200000;
const MAX_PAYMENT_PAGES = 10;

function receiptNumberFromHtml(html) {
  if (typeof html !== 'string' || html.length === 0 || html.length > MAX_HTML_BYTES) return null;
  const title = html.match(/<title[^>]*>([\s\S]{1,240}?)<\/title>/i)?.[1] || '';
  return title.match(/#([A-Z0-9]{4,16})/)?.[1] || null;
}

export async function findPaymentForReceipt(receiptUrl, { fetchReceipt, listPayments }) {
  const response = await fetchReceipt(receiptUrl);
  if (!response?.ok || !String(response.headers?.get('content-type') || '').toLowerCase().includes('text/html')) return null;
  const html = await response.text();
  if (!html.includes('ZASU WORKS') || !html.includes(PRODUCT_MARKER)) return null;
  const receiptNumber = receiptNumberFromHtml(html);
  if (!receiptNumber) return null;

  const matches = [];
  let cursor = null;
  for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
    const result = await listPayments(cursor);
    for (const payment of Array.isArray(result?.payments) ? result.payments : []) {
      if (payment?.location_id === LOCATION && payment.receipt_number === receiptNumber &&
          payment.status === 'COMPLETED' && payment.amount_money?.currency === 'JPY' &&
          [1980, 2980].includes(payment.amount_money?.amount)) matches.push(payment);
    }
    cursor = result?.cursor;
    if (!cursor) break;
  }
  return matches.length === 1 ? matches[0] : null;
}
