const ORIGINS = new Set(['https://zasuworks.jp', 'https://www.zasuworks.jp']);
const LOCATION = 'LTF93YQYAF2MF';
const cleanName = value => typeof value === 'string' ? value.normalize('NFKC').replace(/\s/g, '') : '';
// Exact Square product titles only. Retain the original title for past receipts.
const PRODUCTS = new Map([
  [cleanName('ZASU VOCAL v1.0.0'), 3980],
  [cleanName('ZASU 歌ってみた制作セット'), 5980],
]);
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,192}$/.test(value);
const yen = money => money?.currency === 'JPY' && Number.isSafeInteger(money.amount) && money.amount >= 0;
const bad = () => { throw new AccessError(403, 'purchase_not_verified'); };
class AccessError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

// Redirect parameters are untrusted bearer identifiers. Only Square API results
// can grant access. Never accept amounts, products, or payment status from a browser.
async function verifyPurchase(orderId, getOrder, getPayment) {
  const order = await getOrder(orderId);
  if (!order || order.id !== orderId || order.location_id !== LOCATION ||
      !['OPEN', 'COMPLETED'].includes(order.state)) bad();
  if (!Array.isArray(order.line_items) || order.line_items.length !== 1) bad();
  const item = order.line_items[0];
  if (!PRODUCTS.has(cleanName(item.name)) || Number(item.quantity) !== 1 ||
      !yen(item.base_price_money) || item.base_price_money.amount !== PRODUCTS.get(cleanName(item.name)) ||
      !yen(order.total_money) || order.total_money.amount !== item.base_price_money.amount) bad();
  if (order.returns?.length || order.refunds?.length) bad();
  if (order.net_amount_due_money && (!yen(order.net_amount_due_money) || order.net_amount_due_money.amount !== 0))
    throw new AccessError(409, 'payment_pending');
  const tenders = order.tenders;
  if (!Array.isArray(tenders) || tenders.length === 0) throw new AccessError(409, 'payment_pending');
  if (tenders.length > 5) bad();
  const ids = tenders.map(t => t.payment_id || t.id);
  if (ids.some(id => !validId(id)) || new Set(ids).size !== ids.length) bad();
  let paid = 0;
  for (const id of ids) {
    const payment = await getPayment(id);
    if (!payment || payment.id !== id || payment.order_id !== orderId || payment.location_id !== LOCATION) bad();
    if (payment.status !== 'COMPLETED') throw new AccessError(409, 'payment_pending');
    if (!yen(payment.amount_money) || payment.refund_ids?.length ||
        (payment.refunded_money && (!yen(payment.refunded_money) || payment.refunded_money.amount !== 0))) bad();
    paid += payment.amount_money.amount;
  }
  if (paid !== order.total_money.amount) bad();
}

export function createHandler({ getOrder, getPayment, findPaymentByReceiptUrl, signDownloads, rateLimit }) {
  return async request => {
    const origin = request.headers.get('Origin');
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (!ORIGINS.has(origin)) return reply(403, { error: 'origin_not_allowed' });
    Object.assign(headers, { 'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415, { error: 'json_required' });
    try {
      if (Number(request.headers.get('Content-Length') || 0) > 1024) return reply(413, { error: 'body_too_large' });
      // Bound streamed bodies too; Content-Length is not trusted.
      const reader = request.body?.getReader();
      const chunks = []; let size = 0;
      if (!reader) return reply(400, { error: 'invalid_request' });
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > 1024) { await reader.cancel(); return reply(413, { error: 'body_too_large' }); }
        chunks.push(value);
      }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(new Uint8Array(chunks.flatMap(c => [...c])))); }
      catch { return reply(400, { error: 'invalid_request' }); }
      const references = ['orderId', 'paymentId', 'receiptUrl'].filter(key => body?.[key] !== undefined);
      if (references.length !== 1) return reply(400, { error: 'invalid_purchase_reference' });
      const reference = references[0];
      if (reference === 'receiptUrl') {
        if (typeof body.receiptUrl !== 'string' ||
            !/^https:\/\/squareup\.com\/r\/[A-Za-z0-9_-]{16,192}$/.test(body.receiptUrl))
          return reply(400, { error: 'invalid_purchase_reference' });
      } else if (!validId(body[reference])) return reply(400, { error: 'invalid_purchase_reference' });
      if (!await rateLimit(request)) return reply(429, { error: 'too_many_requests' });
      let orderId = body.orderId;
      if (reference === 'paymentId') {
        const payment = await getPayment(body.paymentId);
        if (!payment || payment.id !== body.paymentId || !validId(payment.order_id)) bad();
        orderId = payment.order_id;
      } else if (reference === 'receiptUrl') {
        const payment = await findPaymentByReceiptUrl(body.receiptUrl);
        if (!payment || !validId(payment.id) || !validId(payment.order_id)) bad();
        orderId = payment.order_id;
      }
      await verifyPurchase(orderId, getOrder, getPayment);
      const downloads = await signDownloads();
      return reply(200, { version: '1.0.0', expiresIn: 600, downloads });
    } catch (error) {
      if (error instanceof AccessError) return reply(error.status, { error: error.code });
      if (error?.code === 'receipt_lookup_incomplete') return reply(422, { error: 'receipt_lookup_incomplete' });
      // Provider messages may contain identifiers or credentials. Never return/log them.
      return reply(503, { error: 'temporarily_unavailable' });
    }
  };
}
