export type ValidationResult = { ok: true } | { ok: false; reason: string };
export type EmailMessage = { subject: string; text: string; html: string };

export function normalizeLabel(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validEmail(value: unknown): string | null {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function extractEmailFromNote(note: unknown): string | null {
  const text = String(note ?? '');
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const labels = ['ダウンロード送付先', 'メール', 'email'];
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  for (const line of lines) {
    const normalized = normalizeLabel(line);
    if (!labels.some((label) => normalized.includes(label))) continue;
    const match = line.match(emailRegex);
    if (!match) continue;
    const email = validEmail(match[0]);
    if (email) return email;
  }
  return null;
}

export function extractDeliveryEmail(order: unknown, fallbackEmail?: unknown): string | null {
  const o = order as any;
  for (const fulfillment of Array.isArray(o?.fulfillments) ? o.fulfillments : []) {
    const explicit = extractEmailFromNote(fulfillment?.delivery_details?.note);
    if (explicit) return explicit;
  }
  return validEmail(fallbackEmail);
}

export function validateZasuLoudOrder(payment: unknown, order: unknown): ValidationResult {
  const p = payment as any;
  const o = order as any;
  if (Number(p?.amount_money?.amount) !== 2980) return { ok: false, reason: 'wrong_payment_amount' };
  if (String(p?.amount_money?.currency ?? '') !== 'JPY') return { ok: false, reason: 'wrong_payment_currency' };
  if (Number(o?.total_money?.amount) !== 2980) return { ok: false, reason: 'wrong_order_amount' };
  if (String(o?.total_money?.currency ?? '') !== 'JPY') return { ok: false, reason: 'wrong_order_currency' };
  const names = Array.isArray(o?.line_items) ? o.line_items.map((x: any) => normalizeLabel(x?.name)) : [];
  const matches = names.some((name: string) => name.includes('zasu loud'));
  if (!matches) return { ok: false, reason: 'wrong_product' };
  return { ok: true };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[ch] as string));
}

export function buildZasuLoudEmail(input: { downloadUrl: string; expiresHours: number }): EmailMessage {
  const subject = 'ZASU LOUD v2.0.0 — ダウンロードのご案内';
  const text = [
    'ZASU LOUDをご購入いただきありがとうございます。', '',
    'ZASU LOUD v2.0.0',
    'Mac: Apple Silicon / Intel対応 Universal — AU / VST3 / Standalone',
    'Windows x64: VST3 / Standalone', '',
    `購入後ダウンロード: ${input.downloadUrl}`, '',
    'Mac: ZASU-LOUD-v2.0.0-macOS-Universal.dmg',
    'Windows: ZASU-LOUD-v2.0.0-Windows-Setup.exe', '',
    'Mac版はDeveloper ID署名・Apple公証・Staple・Gatekeeper確認済みです。',
    'Windows版は現在未署名のため、SmartScreen等の警告が表示される場合があります。', '',
    'ページで購入を再確認すると、Mac版・Windows版の両方を取得できます。',
    'ファイルのダウンロードリンクは10分間有効です。ページで更新できます。',
    '別の端末やブラウザーでは、Squareの領収書URLまたは取引IDで再ダウンロードできます。', '',
    'MacはDMG内のPKG、WindowsはSetup.exeからインストールしてください。',
    'サポート: zasuworks@gmail.com', '', 'LOUDER. NOT WORSE.', 'ZASU WORKS',
  ].join('\n');
  const safeUrl = escapeHtml(input.downloadUrl);
  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;background:#050505;color:#f5f5f2;padding:32px"><div style="max-width:640px;margin:auto;background:#0b0b0c;border:1px solid #292929;padding:32px"><h1>ZASU LOUD v2.0.0</h1><p>ご購入いただきありがとうございます。</p><p>Mac: Apple Silicon / Intel対応 Universal<br>AU / VST3 / Standalone</p><p>Windows x64: VST3 / Standalone</p><p><a href="${safeUrl}" style="display:inline-block;background:#ffd91a;color:#050505;padding:16px 22px;text-decoration:none;font-weight:800">購入後ダウンロード・再ダウンロード</a></p><p>ZASU-LOUD-v2.0.0-macOS-Universal.dmg<br>ZASU-LOUD-v2.0.0-Windows-Setup.exe</p><p>Mac版はDeveloper ID署名・Apple公証・Staple・Gatekeeper確認済みです。</p><p>Windows版は現在未署名のため、SmartScreen等の警告が表示される場合があります。</p><p>ページで購入を確認すると両方を取得できます。ファイルのリンクは10分間有効です。ページで更新できます。</p><p>別の端末やブラウザーでは、Squareの領収書URLまたは取引IDで再ダウンロードできます。</p><p>MacはDMG内のPKG、WindowsはSetup.exeからインストールしてください。</p><p>サポート: <a href="mailto:zasuworks@gmail.com">zasuworks@gmail.com</a></p><p>LOUDER. NOT WORSE.</p></div></body></html>`;
  return { subject, text, html };
}

export function buildZasuLoudOwnerNotification(input: {
  status: 'sent' | 'already_sent' | 'failed' | 'missing_email';
  buyerEmail?: string | null;
  paymentId: string;
  orderId: string;
  paidAt: string;
  error?: string | null;
}): EmailMessage {
  const delivered = input.status === 'sent' || input.status === 'already_sent';
  const subject = delivered
    ? '🎉 ZASU LOUDが売れました！— ¥2,980'
    : '⚠️ ZASU LOUD納品要確認';

  const buyerEmail = input.buyerEmail || '(取得できませんでした)';
  const deliveryStatus = delivered ? '納品成功' : input.status === 'missing_email' ? 'メールアドレス未取得' : '納品失敗';
  const error = input.error ? String(input.error).slice(0, 500) : '';

  const text = [
    delivered ? 'ZASU LOUDの購入があり、自動納品まで完了しました。' : 'ZASU LOUDの購入処理で確認が必要です。',
    '',
    '商品: ZASU LOUD v2.0.0',
    '金額: ¥2,980',
    `購入者メール: ${buyerEmail}`,
    `納品状態: ${deliveryStatus}`,
    `購入日時: ${input.paidAt}`,
    `Square Payment ID: ${input.paymentId}`,
    `Square Order ID: ${input.orderId}`,
    ...(error ? [`エラー: ${error}`] : []),
    '',
    'ZASU WORKS',
  ].join('\n');

  const safeBuyer = escapeHtml(buyerEmail);
  const safePaymentId = escapeHtml(input.paymentId);
  const safeOrderId = escapeHtml(input.orderId);
  const safePaidAt = escapeHtml(input.paidAt);
  const safeError = escapeHtml(error);
  const accent = delivered ? '#ffd91a' : '#ff6b57';
  const headline = delivered ? 'ZASU LOUD SOLD' : 'DELIVERY CHECK REQUIRED';

  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;background:#050505;color:#f5f5f2;padding:32px"><div style="max-width:640px;margin:auto;background:#0b0b0c;border:1px solid #292929;padding:32px"><div style="color:${accent};font-size:12px;font-weight:800;letter-spacing:.15em">ZASU WORKS / SALES NOTICE</div><h1 style="font-size:30px;margin:16px 0;color:${accent}">${headline}</h1><p>${delivered ? '購入と自動納品が完了しました。' : '購入処理で確認が必要です。'}</p><table style="width:100%;border-collapse:collapse;margin-top:24px"><tr><td style="padding:8px 0;color:#999">商品</td><td style="padding:8px 0;text-align:right">ZASU LOUD v2.0.0</td></tr><tr><td style="padding:8px 0;color:#999">金額</td><td style="padding:8px 0;text-align:right;font-weight:800">¥2,980</td></tr><tr><td style="padding:8px 0;color:#999">購入者メール</td><td style="padding:8px 0;text-align:right">${safeBuyer}</td></tr><tr><td style="padding:8px 0;color:#999">納品状態</td><td style="padding:8px 0;text-align:right">${deliveryStatus}</td></tr><tr><td style="padding:8px 0;color:#999">購入日時</td><td style="padding:8px 0;text-align:right">${safePaidAt}</td></tr></table><hr style="border:0;border-top:1px solid #292929;margin:24px 0"><p style="font-size:12px;color:#999;word-break:break-all">Payment: ${safePaymentId}<br>Order: ${safeOrderId}${error ? `<br><span style="color:#ff8a7a">Error: ${safeError}</span>` : ''}</p></div></body></html>`;

  return { subject, text, html };
}


