/**
 * Cloudflare Worker — 헥토파이낸셜 신용카드 결제 (해시·암호화·노티)
 *
 * 시크릿 (Cloudflare Dashboard → Settings → Variables):
 *   HECTO_HASH_KEY  — 해시 생성 키
 *   HECTO_AES_KEY   — 암호화 키 (AES-256)
 *
 * 선택 (관리자 DB 노티 연동):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 해시: SHA256(mchtId + method + mchtTrdNo + trdDt + trdTm + trdAmt평문 + hashKey)
 * 암호화: AES-256/ECB/PKCS5Padding + Base64
 */

import { createCipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { corsHeaders } from './stn-api-cors-snippet.js';

const ALLOW_ORIGINS = [
  'https://stnmedia.kr',
  'https://www.stnmedia.kr',
  'https://stnhub210-dev.github.io',
];

const RESULT_PAGE_URL = 'https://stnmedia.kr/payment_result.html';

const CARD_METHOD = 'card';

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, ALLOW_ORIGINS),
    },
  });
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** PHP openssl_encrypt(AES-256-ECB)와 동일 — 키는 UTF-8 32바이트 */
function aesKeyBytes(aesKeyStr) {
  const raw = Buffer.from(String(aesKeyStr), 'utf8');
  if (raw.length === 32) return raw;
  if (raw.length > 32) return raw.subarray(0, 32);
  const padded = Buffer.alloc(32);
  raw.copy(padded);
  return padded;
}

/** AES-256-ECB + PKCS7 + Base64 (헥토 규격) */
function aes256EcbEncryptBase64(plainText, aesKeyStr) {
  const key = aesKeyBytes(aesKeyStr);
  const cipher = createCipheriv('aes-256-ecb', key, Buffer.alloc(0));
  return Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]).toString('base64');
}

function buildPktHash({ mchtId, method, mchtTrdNo, trdDt, trdTm, trdAmtPlain }, hashKey) {
  const raw =
    String(mchtId) +
    String(method) +
    String(mchtTrdNo) +
    String(trdDt) +
    String(trdTm) +
    String(trdAmtPlain) +
    String(hashKey);
  return sha256Hex(raw);
}

async function handlePrepare(body, env) {
  const hashKey = env.HECTO_HASH_KEY;
  const aesKey = env.HECTO_AES_KEY;
  if (!hashKey) return { error: 'HECTO_HASH_KEY 미설정', status: 500 };
  if (!aesKey) return { error: 'HECTO_AES_KEY 미설정', status: 500 };

  const { mchtId, trdDt, trdTm, mchtTrdNo, trdAmt, mchtCustNm, email } = body || {};
  const method = body.method || CARD_METHOD;
  const trdAmtPlain = String(trdAmt);

  if (!mchtId || !trdDt || !trdTm || !mchtTrdNo || !trdAmtPlain) {
    return { error: '필수 파라미터 누락', status: 400 };
  }

  const pktHash = await buildPktHash(
    { mchtId, method, mchtTrdNo, trdDt, trdTm, trdAmtPlain },
    hashKey
  );

  const trdAmtEnc = aes256EcbEncryptBase64(trdAmtPlain, aesKey);
  const result = {
    pktHash,
    trdAmt: trdAmtEnc,
    mchtTrdNo,
    method,
  };

  if (mchtCustNm) {
    result.mchtCustNm = aes256EcbEncryptBase64(mchtCustNm, aesKey);
  }
  if (email) {
    result.email = aes256EcbEncryptBase64(email, aesKey);
  }

  return { status: 200, data: result };
}

function parseNotifyPayload(request, rawText) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.parse(rawText);
  }
  return Object.fromEntries(new URLSearchParams(rawText));
}

function parseMchtParam(raw) {
  const out = {};
  if (!raw || typeof raw !== 'string') return out;
  raw.split('&').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx);
    const value = part.slice(idx + 1);
    try {
      out[key] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch (_) {
      out[key] = value;
    }
  });
  return out;
}

function looksEncryptedText(value) {
  const text = String(value || '').trim();
  return text.length >= 16 && /^[A-Za-z0-9+/=]+$/.test(text);
}

function plainAmount(trdAmt) {
  const digits = String(trdAmt || '').replace(/\D/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

async function syncPaymentToSupabase(payload, env) {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const orderId = payload.mchtTrdNo;
  if (!orderId) return;

  const outStatCd = String(payload.outStatCd || '');
  const isPaid = outStatCd === '0021';
  const isAuthOnly = outStatCd === '0061';
  const mcht = parseMchtParam(payload.mchtParam);
  const nameRaw = String(payload.mchtCustNm || '').trim();
  const applicantName = looksEncryptedText(nameRaw) ? '-' : nameRaw || '-';
  const applicantPhone = String(payload.cphoneNo || '').replace(/\D/g, '') || null;

  const row = {
    order_id: orderId,
    applicant_name: applicantName,
    applicant_phone: applicantPhone,
    program_name: payload.pmtPrdtNm || 'STN 스킬업 양성과정',
    tier: mcht.tier || null,
    referrer: mcht.referrer || null,
    amount: plainAmount(payload.trdAmt),
    pay_method: '신용카드',
    status: isPaid ? 'paid' : isAuthOnly ? 'pending' : 'failed',
    updated_at: new Date().toISOString(),
  };

  if (payload.authNo) row.notes = '승인번호:' + payload.authNo;

  const headers = {
    apikey: serviceKey,
    Authorization: 'Bearer ' + serviceKey,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };

  await fetch(supabaseUrl + '/rest/v1/payment_applications?on_conflict=order_id', {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
  });
}

function buildResultRedirectUrl(payload) {
  const params = new URLSearchParams();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value != null && String(value) !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? RESULT_PAGE_URL + '?' + qs : RESULT_PAGE_URL;
}

/** POST 수신 후 GET으로 결과 페이지 이동 (302는 POST가 유지되어 GitHub Pages 405 발생) */
function htmlRedirectResponse(targetUrl) {
  const escaped = targetUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
  const jsUrl = JSON.stringify(targetUrl);
  const html =
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">' +
    '<meta http-equiv="refresh" content="0;url=' +
    escaped +
    '">' +
    '<title>결제 결과 이동</title></head><body>' +
    '<p>결제 결과 페이지로 이동 중입니다…</p>' +
    '<script>location.replace(' +
    jsUrl +
    ');</script></body></html>';
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function handleReturn(request, env) {
  let payload = {};

  if (request.method === 'GET') {
    const url = new URL(request.url);
    url.searchParams.forEach((value, key) => {
      payload[key] = value;
    });
  } else if (request.method === 'POST') {
    const rawText = await request.text();
    try {
      payload = parseNotifyPayload(request, rawText);
    } catch (_) {
      payload = {};
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }

  console.log('hecto-return', JSON.stringify(payload));

  try {
    await syncPaymentToSupabase(payload, env);
  } catch (err) {
    console.error('hecto-return supabase sync error', err);
  }

  const targetUrl = buildResultRedirectUrl(payload);
  return htmlRedirectResponse(targetUrl);
}

async function handleNotify(request, env) {
  const rawText = await request.text();
  let payload = {};

  try {
    payload = parseNotifyPayload(request, rawText);
  } catch (_) {
    payload = {};
  }

  console.log('hecto-notify', JSON.stringify(payload));

  try {
    await syncPaymentToSupabase(payload, env);
  } catch (err) {
    console.error('supabase sync error', err);
  }

  return new Response('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, ALLOW_ORIGINS),
      });
    }

    try {
      if (
        request.method === 'POST' &&
        (url.pathname.endsWith('/hecto-prepare') || url.pathname.endsWith('/hecto-hash'))
      ) {
        const body = await request.json();
        const result = await handlePrepare(body, env);
        if (result.error) return json({ error: result.error }, result.status, request);
        return json(result.data, 200, request);
      }

      if (request.method === 'POST' && url.pathname.endsWith('/hecto-notify')) {
        return handleNotify(request, env);
      }

      if (
        (request.method === 'POST' || request.method === 'GET') &&
        url.pathname.endsWith('/hecto-return')
      ) {
        return handleReturn(request, env);
      }

      return json({ error: 'Not Found' }, 404, request);
    } catch (err) {
      console.error(err);
      return json({ error: err.message || 'Internal Error' }, 500, request);
    }
  },
};
