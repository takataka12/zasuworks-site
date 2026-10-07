import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { createHandler } from './handler.mjs';
import { findPaymentForReceipt } from './receipt.mjs';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const files = [
  { os: 'mac', version: '2.0.0', filename: 'ZASU-LOUD-v2.0.0-macOS-Universal.dmg' },
  { os: 'windows', version: '2.0.0', filename: 'ZASU-LOUD-v2.0.0-Windows-Setup.exe' },
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    }),
    getPayment: async (id: string) => (await square(`payments/${encodeURIComponent(id)}`)).payment,
  }),
  rateLimit: async (request: Request) => {
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 64);
    // Namespace the actor so DAW retries do not consume other products' limits.
    const { data, error } = await supabase.rpc('zasu_rate_limit_check', {
      p_ip: `loud-download:${ip}`, p_user_agent: '', p_scope: 'loud_download',
      p_burst_limit: 12, p_burst_seconds: 60, p_hour_limit: 60,
      p_global_burst_limit: 12, p_global_burst_seconds: 60,
    });
    if (error) throw new Error('Rate limit unavailable');
    return data?.allowed === true;
  },
  signDownloads: async () => await Promise.all(files.map(async file => {
    const { data, error } = await supabase.storage.from('zasu-loud-releases')
      .createSignedUrl(`${file.version}/${file.filename}`, 600, { download: file.filename });
    if (error || !data?.signedUrl) throw new Error('File unavailable');
    return { ...file, url: data.signedUrl };
  })),
}));
