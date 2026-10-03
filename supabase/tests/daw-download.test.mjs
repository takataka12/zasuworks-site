import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../functions/zasu-daw-download/handler.mjs';

const orderId = 'OrderForDownload0123456789';
const paymentId = 'PaymentForDownload0123456789';
function fixture() {
  return {
    order: {
      id: orderId, location_id: 'LTF93YQYAF2MF', state: 'COMPLETED',
      line_items: [{ uid: 'line-1', name: 'ZASU DAW Beta｜Mac・Windows対応', quantity: '1',
        base_price_money: { amount: 1980, currency: 'JPY' },
        total_money: { amount: 1980, currency: 'JPY' } }],
      total_money: { amount: 1980, currency: 'JPY' },
      net_amount_due_money: { amount: 0, currency: 'JPY' },
      tenders: [{ id: paymentId, payment_id: paymentId, type: 'CARD',
        location_id: 'LTF93YQYAF2MF', amount_money: { amount: 1980, currency: 'JPY' } }],
    },
    payment: { id: paymentId, order_id: orderId, location_id: 'LTF93YQYAF2MF',
      status: 'COMPLETED', amount_money: { amount: 1980, currency: 'JPY' },
      total_money: { amount: 1980, currency: 'JPY' },
      refunded_money: { amount: 0, currency: 'JPY' }, refund_ids: [],
      buyer_email_address: 'private@example.invalid' },
  };
}
function setup(data = fixture(), overrides = {}) {
  let signed = 0;
  const handler = createHandler({
    getOrder: async (id) => { assert.equal(id, orderId); return data.order; },
    getPayment: async (id) => { assert.equal(id, paymentId); return data.payment; },
    rateLimit: async () => true,
    signDownloads: async () => { signed++; return [{ os: 'mac', url: 'https://files.invalid/mac' }, { os: 'windows', url: 'https://files.invalid/win' }]; },
    ...overrides,
  });
  return { handler, signed: () => signed };
}
function request(body = { orderId }, origin = 'https://zasuworks.jp') {
  return new Request('https://api.invalid/download', { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

test('paid product grants both OS downloads without exposing order or customer details', async () => {
  const app = setup(); const res = await app.handler(request());
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.deepEqual(result.downloads.map(d => d.os), ['mac', 'windows']);
  assert.equal(app.signed(), 1);
  assert.equal(JSON.stringify(result).includes('private@'), false);
  assert.equal(JSON.stringify(result).includes(orderId), false);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
test('paid OPEN order is accepted while digital fulfillment remains open', async () => {
  const data = fixture(); data.order.state = 'OPEN';
  assert.equal((await setup(data).handler(request())).status, 200);
});
test('documented tender.id fallback can retrieve the payment', async () => {
  const data = fixture(); delete data.order.tenders[0].payment_id;
  assert.equal((await setup(data).handler(request())).status, 200);
});

for (const [name, mutate] of [
  ['different product with the same amount', d => d.order.line_items[0].name = 'ZASU LOUD'],
  ['wrong location', d => d.order.location_id = 'OTHER'],
  ['wrong returned order', d => d.order.id = 'OtherOrder0123456789'],
  ['canceled order', d => d.order.state = 'CANCELED'],
  ['changed price', d => d.order.line_items[0].base_price_money.amount = 1],
  ['different currency', d => d.order.total_money.currency = 'USD'],
  ['discounted unpaid balance', d => d.order.total_money.amount = 100],
  ['nonzero outstanding balance', d => d.order.net_amount_due_money.amount = 1980],
  ['no payment', d => d.order.tenders = []],
  ['duplicate tender counted twice', d => { d.order.tenders.push(d.order.tenders[0]); d.payment.amount_money.amount = 990; }],
  ['payment only authorized', d => d.payment.status = 'APPROVED'],
  ['failed payment', d => d.payment.status = 'FAILED'],
  ['another order payment', d => d.payment.order_id = 'OTHER'],
  ['another location payment', d => d.payment.location_id = 'OTHER'],
  ['wrong payment id returned', d => d.payment.id = 'OTHER'],
  ['partial payment', d => d.payment.amount_money.amount = 990],
  ['refunded purchase', d => d.payment.refunded_money.amount = 1980],
  ['pending refund', d => d.payment.refund_ids = ['refund-1']],
  ['returned order', d => d.order.returns = [{ uid: 'return-1' }]],
]) {
  test(`${name} never receives a signed file`, async () => {
    const data = fixture(); mutate(data); const app = setup(data);
    const res = await app.handler(request());
    assert.ok(res.status >= 400); assert.equal(app.signed(), 0);
    assert.equal((await res.text()).includes('https://files'), false);
  });
}
test('bad origin and malformed order ID fail before contacting Square', async () => {
  const app = setup(undefined, { getOrder: async () => { throw new Error('must not call'); } });
  assert.equal((await app.handler(request({}, 'https://evil.invalid'))).status, 403);
  assert.equal((await app.handler(request({ orderId: '../payments' }))).status, 400);
  assert.equal(app.signed(), 0);
});
test('rate limit blocks Square lookups and downloads', async () => {
  const app = setup(undefined, { rateLimit: async () => false });
  assert.equal((await app.handler(request())).status, 429); assert.equal(app.signed(), 0);
});
test('Square failure does not grant access or expose provider response', async () => {
  const app = setup(undefined, { getPayment: async () => { throw new Error('secret provider response'); } });
  const res = await app.handler(request()); assert.equal(res.status, 503);
  assert.equal((await res.text()).includes('secret'), false); assert.equal(app.signed(), 0);
});
test('storage failure does not produce success', async () => {
  const app = setup(undefined, { signDownloads: async () => { throw new Error('storage'); } });
  assert.equal((await app.handler(request())).status, 503);
});
test('CORS preflight needs no order or payment request', async () => {
  const app = setup();
  const res = await app.handler(new Request('https://api.invalid/', { method: 'OPTIONS', headers: { Origin: 'https://zasuworks.jp' } }));
  assert.equal(res.status, 204); assert.equal(app.signed(), 0);
});
