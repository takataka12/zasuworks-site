import { buildZasuLoudEmail, extractDeliveryEmail, validateZasuLoudOrder, type EmailMessage } from './zasu_loud_core.ts';

export type DeliveryStatus = 'pending' | 'sent' | 'failed';
export type ZasuLoudOrderRow = {
  id: string;
  square_payment_id: string;
  delivery_status: DeliveryStatus;
  resend_message_id?: string | null;
  delivery_error?: string | null;
};
export type PendingOrderInput = {
  square_payment_id: string;
  square_order_id: string;
  square_event_id: string;
  buyer_email: string;
  product_slug: 'zasu-loud-v1.1.2-macos';
  amount_jpy: 2980;
  currency: 'JPY';
  payment_status: 'paid';
  paid_at: string;
};
export type FulfillmentInput = {
  eventId: string;
  payment: unknown;
  order: unknown;
  fallbackEmail?: unknown;
};
export type FulfillmentResult =
  | { status: 'not_zasu_loud'; reason: string }
  | { status: 'missing_email' }
  | { status: 'already_sent'; orderId: string }
  | { status: 'sent'; orderId: string }
  | { status: 'failed'; orderId: string; reason: string };

export interface FulfillmentDeps {
  findOrderByPaymentId(paymentId: string): Promise<ZasuLoudOrderRow | null>;
  upsertPendingOrder(input: PendingOrderInput): Promise<ZasuLoudOrderRow>;
  markAttempt(id: string): Promise<void>;
  markSent(id: string, resendMessageId: string): Promise<void>;
  markFailed(id: string, message: string): Promise<void>;
  createDownloadUrl(paymentId: string): Promise<string>;
  sendEmail(to: string, message: EmailMessage, idempotencyKey: string): Promise<string>;
}

function cleanError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error || 'unknown_error')).slice(0, 500);
}

export async function fulfillZasuLoudPurchase(input: FulfillmentInput, deps: FulfillmentDeps): Promise<FulfillmentResult> {
  const validation = validateZasuLoudOrder(input.payment, input.order);
  if (!validation.ok) return { status: 'not_zasu_loud', reason: validation.reason };

  const payment = input.payment as any;
  const paymentId = String(payment?.id || '');
  const orderId = String(payment?.order_id || (input.order as any)?.id || '');
  if (!paymentId || !orderId) return { status: 'not_zasu_loud', reason: 'missing_payment_or_order_id' };

  const email = extractDeliveryEmail(input.order, input.fallbackEmail);
  if (!email) return { status: 'missing_email' };

  const existing = await deps.findOrderByPaymentId(paymentId);
  if (existing?.delivery_status === 'sent') return { status: 'already_sent', orderId: existing.id };

  const paidAt = String(payment?.updated_at || payment?.created_at || new Date().toISOString());
  const row = await deps.upsertPendingOrder({
    square_payment_id: paymentId,
    square_order_id: orderId,
    square_event_id: input.eventId,
    buyer_email: email,
    product_slug: 'zasu-loud-v1.1.2-macos',
    amount_jpy: 2980,
    currency: 'JPY',
    payment_status: 'paid',
    paid_at: paidAt,
  });

  await deps.markAttempt(row.id);
  try {
    const downloadUrl = await deps.createDownloadUrl(paymentId);
    const message = buildZasuLoudEmail({ downloadUrl, expiresHours: 24 });
    const messageId = await deps.sendEmail(email, message, `zasu-loud/${paymentId}`);
    await deps.markSent(row.id, messageId);
    return { status: 'sent', orderId: row.id };
  } catch (error) {
    const reason = cleanError(error);
    await deps.markFailed(row.id, reason);
    return { status: 'failed', orderId: row.id, reason };
  }
}
