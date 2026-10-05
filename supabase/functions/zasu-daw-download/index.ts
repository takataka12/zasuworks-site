import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { createHandler } from './handler.mjs';
import { findPaymentForReceipt } from './receipt.mjs';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const files = [
  { os: 'mac', version: '0.0.14', filename: 'ZASUDAW-0.0.14-macOS-Universal.dmg' },
  { os: 'windows', version: '0.0.14', filename: 'ZASU-DAW-v0.0.14-Windows-Setup.exe' },
];
async function square(path: string) {
  const token = Deno.env.get('SQUARE_ACCESS_TOKEN');
  if (!token) throw new Error('Square is not configured');
  const response = await fetch(`https://connect.squareup.com/v2/${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Square-Version': '2026-09-16' },
    signal: AbortSignal.timeout(12000),
  });
  if (response.status === 404) return {};
  if (!response.ok) throw new Error('Square lookup failed');
  return await response.json();
}
Deno.serve(createHandler({
  getOrder: async (id: string) => (await square(`orders/${encodeURIComponent(id)}`)).order,
  getPayment: async (id: string) => (await square(`payments/${encodeURIComponent(id)}`)).payment,
  findPaymentByReceiptUrl: async (receiptUrl: string) => await findPaymentForReceipt(receiptUrl, {
    fetchReceipt: async (url: string) => await fetch(url, {
      redirect: 'error',
      headers: { 'User-Agent': 'ZASU-WORKS-Purchase-Recovery/1.0' },
      signal: AbortSignal.timeout(12000),
    }),
    listPayments: async (cursor: string | null) => {
      const params = new URLSearchParams({
        location_id: 'LTF93YQYAF2MF', sort_order: 'DESC', limit: '100',
      });
      if (cursor) params.set('cursor', cursor);
      return await square(`payments?${params.toString()}`);
    },
  }),
  rateLimit: async (request: Request) => {
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 64);
    // Namespace the actor so DAW retries do not consume other products' limits.
    const { data, error } = await supabase.rpc('zasu_rate_limit_check', {
      p_ip: `daw-download:${ip}`, p_user_agent: '', p_scope: 'daw_download',
      p_burst_limit: 12, p_burst_seconds: 60, p_hour_limit: 60,
      p_global_burst_limit: 12, p_global_burst_seconds: 60,
    });
    if (error) throw new Error('Rate limit unavailable');
    return data?.allowed === true;
  },
  signDownloads: async () => await Promise.all(files.map(async file => {
    const { data, error } = await supabase.storage.from('zasu-daw-releases')
      .createSignedUrl(`${file.version}/${file.filename}`, 600, { download: file.filename });
    if (error || !data?.signedUrl) throw new Error('File unavailable');
    return { ...file, url: data.signedUrl };
  })),
}));
