import test from 'node:test';
import assert from 'node:assert/strict';
import { findPaymentForReceipt } from '../functions/zasu-vocal-download/receipt.mjs';

const receiptUrl = 'https://squareup.com/r/r07529c23fd48405d9d3605159ae23f05';
const html = '<html><head><title>ZASU WORKS #NQXRからのレシート</title></head><body>ZASU VOCAL v1.4 正式版</body></html>';
const payment = { id: 'PaymentForDownload0123456789', order_id: 'OrderForDownload0123456789',
  location_id: 'LTF93YQYAF2MF', receipt_number: 'NQXR', status: 'COMPLETED',
  amount_money: { amount: 3980, currency: 'JPY' } };
const response = value => ({ ok: true, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => value });

test('trusted Square receipt resolves one matching payment', async () => {
  const result = await findPaymentForReceipt(receiptUrl, {
    fetchReceipt: async url => { assert.equal(url, receiptUrl); return response(html); },
    listPayments: async () => ({ payments: [payment] }),
  });
  assert.equal(result, payment);
});
test('wrong merchant/product receipt and ambiguous receipt number fail closed', async () => {
  assert.equal(await findPaymentForReceipt(receiptUrl, {
    fetchReceipt: async () => response('<title>OTHER #NQXR</title>'),
    listPayments: async () => ({ payments: [payment] }),
  }), null);
  assert.equal(await findPaymentForReceipt(receiptUrl, {
    fetchReceipt: async () => response(html),
    listPayments: async () => ({ payments: [payment, { ...payment, id: 'AnotherPayment0123456789' }] }),
  }), null);
});
