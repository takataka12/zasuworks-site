import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { fulfillZasuLoudPurchase, type FulfillmentDeps } from "./zasu_loud_fulfillment.ts";
import { buildZasuLoudOwnerNotification, extractDeliveryEmail, type EmailMessage } from "./zasu_loud_core.ts";

const WEBHOOK_URL =
  Deno.env.get("SQUARE_WEBHOOK_URL") ||
  "https://siwmzradvrtetotakkbi.supabase.co/functions/v1/square-payment-webhook";
const SIGNATURE_KEY = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY") || "";
const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_ACCESS_TOKEN") || "";
const SQUARE_VERSION = Deno.env.get("SQUARE_API_VERSION") || "2026-09-16";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string) {
  const ae = new TextEncoder().encode(a);
  const be = new TextEncoder().encode(b);
  if (ae.length !== be.length) return false;
  let diff = 0;
  for (let i = 0; i < ae.length; i++) diff |= ae[i] ^ be[i];
  return diff === 0;
}

async function hmacBase64(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)),
  );
  let binary = "";
  for (const byte of sig) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function verifySquare(rawBody: string, provided: string | null) {
  if (!SIGNATURE_KEY || !provided) return false;
  const expected = await hmacBase64(SIGNATURE_KEY, WEBHOOK_URL + rawBody);
  return constantTimeEqual(expected, provided);
}

async function squareGet(path: string) {
  const res = await fetch("https://connect.squareup.com" + path, {
    headers: {
      "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`square_api_${res.status}`);
  return body;
}

function normalizeTitle(s: unknown) {
  return String(s ?? "").replace(/\s+/g, "").toLowerCase();
}

function findField(attrs: any[], kind: "application" | "email") {
  for (const attr of attrs || []) {
    const name = normalizeTitle(attr?.definition?.name);
    const key = normalizeTitle(attr?.key);
    const hay = name + " " + key;

    if (kind === "application") {
      if (hay.includes("受付番号") || hay.includes("application") || hay.includes("receipt")) {
        return String(attr?.value ?? "").trim();
      }
    } else {
      if (hay.includes("メール") || hay.includes("email")) {
        return String(attr?.value ?? "").trim().toLowerCase();
      }
    }
  }
  return "";
}


const ZASU_LOUD_DOWNLOAD_PAGE = "https://zasuworks.jp/zasu-loud/download/";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

const ZASU_LOUD_OWNER_EMAIL = "zasuworks@gmail.com";

async function sendZasuLoudOwnerEmail(
  supabase: any,
  message: EmailMessage,
  idempotencyKey: string,
) {
  const { data: config, error: configError } = await supabase.rpc("zasu_alert_delivery_config");
  if (configError) throw configError;

  const delivery = config?.delivery || {};
  const apiKey = cleanString(config?.resend_api_key);
  const sendingDomain = cleanString(delivery?.sending_domain);
  if (
    delivery?.domain_verified !== true ||
    delivery?.transport_enabled !== true ||
    !apiKey ||
    !sendingDomain
  ) {
    throw new Error("resend_transport_not_ready");
  }

  const payload = {
    from: `ZASU WORKS <downloads@${sendingDomain}>`,
    to: [ZASU_LOUD_OWNER_EMAIL],
    reply_to: ZASU_LOUD_OWNER_EMAIL,
    subject: message.subject,
    text: message.text,
    html: message.html,
  };

  let lastError = "owner_notification_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body?.id) return String(body.id);

      lastError = cleanString(body?.message || body?.error || `HTTP ${response.status}`);
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) throw new Error(lastError || "owner_notification_permanent_error");
    } catch (error) {
      lastError = error instanceof Error ? error.message : cleanString(error);
      if (attempt === 2) throw new Error(lastError || "owner_notification_failed");
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
  }
  throw new Error(lastError || "owner_notification_failed");
}

function makeZasuLoudDeps(supabase: any): FulfillmentDeps {
  return {
    async findOrderByPaymentId(paymentId: string) {
      const { data, error } = await supabase
        .from("zasu_loud_orders")
        .select("id,square_payment_id,delivery_status,resend_message_id,delivery_error")
        .eq("square_payment_id", paymentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async upsertPendingOrder(input) {
      const { data, error } = await supabase
        .from("zasu_loud_orders")
        .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "square_payment_id" })
        .select("id,square_payment_id,delivery_status,resend_message_id,delivery_error")
        .single();
      if (error) throw error;
      return data;
    },

    async markAttempt(id: string) {
      const { data, error } = await supabase
        .from("zasu_loud_orders")
        .select("delivery_attempts")
        .eq("id", id)
        .single();
      if (error) throw error;
      const { error: updateError } = await supabase
        .from("zasu_loud_orders")
        .update({
          delivery_attempts: Number(data?.delivery_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updateError) throw updateError;
    },

    async markSent(id: string, resendMessageId: string) {
      const { error } = await supabase
        .from("zasu_loud_orders")
        .update({
          delivery_status: "sent",
          resend_message_id: resendMessageId,
          delivery_error: null,
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },

    async markFailed(id: string, message: string) {
      const { error } = await supabase
        .from("zasu_loud_orders")
        .update({
          delivery_status: "failed",
          delivery_error: cleanString(message).slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },

    async createDownloadUrl(paymentId: string) {
      return `${ZASU_LOUD_DOWNLOAD_PAGE}?transactionId=${encodeURIComponent(paymentId)}`;
    },

    async sendEmail(to: string, message, idempotencyKey: string) {
      const { data: config, error: configError } = await supabase.rpc("zasu_alert_delivery_config");
      if (configError) throw configError;

      const delivery = config?.delivery || {};
      const apiKey = cleanString(config?.resend_api_key);
      const sendingDomain = cleanString(delivery?.sending_domain);
      if (
        delivery?.domain_verified !== true ||
        delivery?.transport_enabled !== true ||
        !apiKey ||
        !sendingDomain
      ) {
        throw new Error("resend_transport_not_ready");
      }

      const payload = {
        from: `ZASU WORKS <downloads@${sendingDomain}>`,
        to: [to],
        reply_to: "zasuworks@gmail.com",
        subject: message.subject,
        text: message.text,
        html: message.html,
      };

      let lastError = "resend_failed";
      for (let attempt = 0; attempt < 3; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + apiKey,
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          const body = await response.json().catch(() => ({}));
          if (response.ok && body?.id) return String(body.id);

          lastError = cleanString(body?.message || body?.error || `HTTP ${response.status}`);
          const retryable = response.status === 429 || response.status >= 500;
          if (!retryable) throw new Error(lastError || "resend_permanent_error");
        } catch (error) {
          lastError = error instanceof Error ? error.message : cleanString(error);
          if (attempt === 2) throw new Error(lastError || "resend_failed");
        } finally {
          clearTimeout(timeout);
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
      }
      throw new Error(lastError || "resend_failed");
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const rawBody = await req.text();

  if (!SIGNATURE_KEY || !SQUARE_ACCESS_TOKEN) {
    return json({ error: "square_secrets_not_configured" }, 503);
  }

  const signature = req.headers.get("x-square-hmacsha256-signature");
  if (!(await verifySquare(rawBody, signature))) {
    return json({ error: "invalid_signature" }, 403);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const eventId = String(event?.event_id || "");
  const eventType = String(event?.type || "");
  if (!eventId) return json({ error: "missing_event_id" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: existing } = await supabase
    .from("square_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) return json({ ok: true, duplicate: true });

  const payment = event?.data?.object?.payment;
  const paymentId = String(payment?.id || "");
  const orderId = String(payment?.order_id || "");

  const { error: logError } = await supabase.from("square_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    square_payment_id: paymentId || null,
    square_order_id: orderId || null,
    result: "received",
  });
  if (logError) throw logError;

  try {
    if (!["payment.created", "payment.updated"].includes(eventType)) {
      await supabase
        .from("square_webhook_events")
        .update({ result: "ignored_event_type", processed_at: new Date().toISOString() })
        .eq("event_id", eventId);
      return json({ ok: true, ignored: true });
    }

    if (payment?.status !== "COMPLETED") {
      await supabase
        .from("square_webhook_events")
        .update({ result: "ignored_not_completed", processed_at: new Date().toISOString() })
        .eq("event_id", eventId);
      return json({ ok: true, ignored: true });
    }

    if (!paymentId || !orderId) throw new Error("missing_payment_or_order_id");

    // ZASU AUDIO commerce path. Additive to the existing ZASU MASTER beta flow.
    const { data: audioOrder, error: audioOrderError } = await supabase
      .from("audio_orders")
      .select("id,visitor_id,plan,amount_jpy,currency,status")
      .eq("square_order_id", orderId)
      .maybeSingle();
    if (audioOrderError) throw audioOrderError;

    if (audioOrder) {
      const paidAmount = Number(payment?.amount_money?.amount);
      const paidCurrency = String(payment?.amount_money?.currency || "");
      if (paidAmount !== Number(audioOrder.amount_jpy) || paidCurrency !== String(audioOrder.currency || "JPY")) {
        throw new Error("audio_order_amount_mismatch");
      }

      const orderBody = await squareGet(`/v2/orders/${encodeURIComponent(orderId)}`);
      const order = orderBody?.order;
      const orderAmount = Number(order?.total_money?.amount);
      const orderCurrency = String(order?.total_money?.currency || "");
      const itemNames = (order?.line_items || []).map((x: any) => String(x?.name || ""));
      const normalizeProduct=(name:string)=>name.normalize("NFKC").replace(/\s+/g,"");
      const productName=audioOrder.plan==="mix"?"MIX":audioOrder.plan==="master"?"MASTER":"MIX + MASTER";
      const acceptedNames=["ZASU AUDIO — "+productName,"ZASU AUDIO / "+productName].map(normalizeProduct);
      const isZasuAudio = itemNames.length===1&&acceptedNames.includes(normalizeProduct(itemNames[0]));
      if (orderAmount !== Number(audioOrder.amount_jpy) || orderCurrency !== "JPY" || !isZasuAudio) {
        throw new Error("order_does_not_match_zasu_audio");
      }

      const paidAt = String(payment?.updated_at || payment?.created_at || new Date().toISOString());
      const { error: paidError } = await supabase.from("audio_orders").update({
        status: "paid",
        square_payment_id: paymentId,
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
      }).eq("id", audioOrder.id);
      if (paidError) throw paidError;

      const kinds = audioOrder.plan === "full"
        ? ["mix", "master"]
        : [String(audioOrder.plan)];
      const creditRows = kinds.map((kind) => ({
        visitor_id: audioOrder.visitor_id,
        order_id: audioOrder.id,
        kind,
        status: "available",
        updated_at: new Date().toISOString(),
      }));
      const { error: creditError } = await supabase
        .from("audio_credits")
        .upsert(creditRows, { onConflict: "order_id,kind", ignoreDuplicates: true });
      if (creditError) throw creditError;

      await supabase.from("square_webhook_events").update({
        result: "audio_paid",
        processed_at: new Date().toISOString(),
      }).eq("event_id", eventId);

      return json({ ok: true, paid: true, audio_order_id: audioOrder.id, plan: audioOrder.plan });
    }

    const orderBody = await squareGet(`/v2/orders/${encodeURIComponent(orderId)}`);
    const order = orderBody?.order;
    // Official fixed-link payments are claimed only by the browser carrying
    // the preview's order token and Square's unguessable return reference.
    // A webhook must not guess a customer/preview from amount or timing.
    const fixedTitles=["ZASU AUDIO — MASTER","ZASU AUDIO — MIX","ZASU AUDIO — MIX + MASTER"];
    if((order?.line_items||[]).some((item:any)=>fixedTitles.map(x=>x.normalize("NFKC").replace(/\s/g,"")).includes(String(item?.name||"").normalize("NFKC").replace(/\s/g,"")))){
      await supabase.from("square_webhook_events").update({
        result:"audio_awaiting_return",processed_at:new Date().toISOString()
      }).eq("event_id",eventId);
      return json({ok:true,audio:true,awaiting_return:true});
    }
    const loudResult = await fulfillZasuLoudPurchase({
      eventId,
      payment,
      order,
      fallbackEmail: payment?.buyer_email_address,
    }, makeZasuLoudDeps(supabase));

    if (loudResult.status !== "not_zasu_loud") {
      const buyerEmail = extractDeliveryEmail(order, payment?.buyer_email_address);
      const paidAt = String(payment?.updated_at || payment?.created_at || new Date().toISOString());
      const ownerMessage = buildZasuLoudOwnerNotification({
        status: loudResult.status,
        buyerEmail,
        paymentId,
        orderId,
        paidAt,
        error:
          loudResult.status === "failed" ? loudResult.reason :
          loudResult.status === "missing_email" ? "missing_email" :
          null,
      });
      const ownerNotificationKey =
        loudResult.status === "sent" || loudResult.status === "already_sent"
          ? `zasu-loud-owner-sale/${paymentId}`
          : `zasu-loud-owner-issue/${paymentId}/${loudResult.status}`;

      try {
        await sendZasuLoudOwnerEmail(supabase, ownerMessage, ownerNotificationKey);
      } catch (ownerNotificationError) {
        console.error("zasu_loud_owner_notification_failed", {
          eventId,
          paymentId,
          status: loudResult.status,
          error: ownerNotificationError instanceof Error
            ? ownerNotificationError.message
            : cleanString(ownerNotificationError),
        });
      }

      const eventResult =
        loudResult.status === "sent" ? "zasu_loud_sent" :
        loudResult.status === "already_sent" ? "zasu_loud_already_sent" :
        loudResult.status === "missing_email" ? "zasu_loud_missing_email" :
        "zasu_loud_delivery_failed";
      const eventError =
        loudResult.status === "failed" ? loudResult.reason :
        loudResult.status === "missing_email" ? "missing_email" :
        null;

      await supabase.from("square_webhook_events").update({
        result: eventResult,
        error: eventError,
        processed_at: new Date().toISOString(),
      }).eq("event_id", eventId);

      return json({
        ok: true,
        zasu_loud: true,
        fulfillment: loudResult.status,
        order_id: "orderId" in loudResult ? loudResult.orderId : null,
      });
    }

    const amount = Number(payment?.amount_money?.amount);
    const currency = String(payment?.amount_money?.currency || "");
    if (amount !== 500 || currency !== "JPY") throw new Error("unexpected_amount_or_currency");

    const orderAmount = Number(order?.total_money?.amount);
    const orderCurrency = String(order?.total_money?.currency || "");
    const itemNames = (order?.line_items || []).map((x: any) => String(x?.name || ""));
    const isZasuMaster = itemNames.some((name: string) =>
      name.toLowerCase().includes("zasu master")
    );

    if (orderAmount !== 500 || orderCurrency !== "JPY" || !isZasuMaster) {
      throw new Error("order_does_not_match_zasu_master_paid_beta");
    }

    // New checkout flow: the generated Square order_id is stored on the
    // application before the buyer pays, so no customer re-entry is needed.
    let { data: app, error: appError } = await supabase
      .from("beta_applications")
      .select("id,application_no,email,payment_status")
      .eq("square_order_id", orderId)
      .maybeSingle();

    if (appError) throw appError;

    // Legacy fallback for old manually-created Square payment links.
    if (!app) {
      const attrsBody = await squareGet(
        `/v2/orders/${encodeURIComponent(orderId)}/custom-attributes?visibility_filter=ALL&limit=100&with_definitions=true`,
      );
      const attrs = attrsBody?.custom_attributes || [];
      const applicationRaw = findField(attrs, "application");
      const email = findField(attrs, "email");
      const legacyNo = Number(applicationRaw);
      if (Number.isFinite(legacyNo) && legacyNo >= 1 && email) {
        const legacy = await supabase
          .from("beta_applications")
          .select("id,application_no,email,payment_status")
          .eq("application_no", legacyNo)
          .eq("email", email)
          .maybeSingle();
        if (legacy.error) throw legacy.error;
        app = legacy.data;
      }
    }

    if (!app) throw new Error("beta_application_not_found");
    const applicationNo = Number(app.application_no);

    const paidAt = String(payment?.updated_at || payment?.created_at || new Date().toISOString());

    const { error: updateError } = await supabase
      .from("beta_applications")
      .update({
        payment_status: "paid",
        paid_at: paidAt,
        square_payment_id: paymentId,
        square_order_id: orderId,
      })
      .eq("id", app.id);

    if (updateError) throw updateError;

    await supabase
      .from("square_webhook_events")
      .update({
        application_id: app.id,
        result: "paid",
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);

    return json({
      ok: true,
      paid: true,
      application_no: applicationNo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    await supabase
      .from("square_webhook_events")
      .update({
        result: "failed",
        error: message.slice(0, 500),
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);

    // Returning 200 prevents endless retries for permanent matching errors.
    return json({ ok: true, processed: false, reason: message });
  }
});
