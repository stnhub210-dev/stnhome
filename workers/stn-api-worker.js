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
 * 선택 (결제 완료 관리자 메일):
 *   RESEND_API_KEY       — Resend API 키
 *   ADMIN_NOTIFY_EMAIL   — 수신 메일 (기본 lmj@stnsports.co.kr)
 *   ADMIN_MAIL_FROM      — 발신 표시 (기본 STN 스킬업 <onboarding@resend.dev>)
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
/** Resend 테스트 모드는 가입 메일로만 발송 가능 — 도메인 인증 전 기본값 */
const DEFAULT_ADMIN_EMAIL = 'stnhub210@gmail.com';
const DEFAULT_MAIL_FROM = 'STN 스킬업 <onboarding@resend.dev>';

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

function isPaymentPaid(payload) {
  const outStatCd = String(payload.outStatCd || '');
  const resultCd = String(payload.resultCd || payload.outRsltCd || '');
  // 0021: 승인완료, 0000: 결과코드 성공
  return outStatCd === '0021' || resultCd === '0000';
}

function formatWon(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('ko-KR') + '원';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildAdminPaymentSummary(payload) {
  const mcht = parseMchtParam(payload.mchtParam);
  const nameRaw = String(payload.mchtCustNm || '').trim();
  const applicantName = looksEncryptedText(nameRaw) ? '(암호화됨)' : nameRaw || '-';
  const phone = String(payload.cphoneNo || '').replace(/\D/g, '') || '-';
  const amount = plainAmount(payload.trdAmt);
  const orderId = String(payload.mchtTrdNo || '-');
  const programName = String(payload.pmtPrdtNm || 'STN 스킬업 양성과정');
  const tier = mcht.tier || '-';
  const referrer = mcht.referrer || '-';
  const authNo = String(payload.authNo || '-');

  return {
    applicantName,
    phone,
    amount,
    orderId,
    programName,
    tier,
    referrer,
    authNo,
  };
}

/** 결제 성공 시 관리자 메일 (Resend) — 실패해도 결제 처리는 막지 않음 */
async function notifyAdminPaymentEmail(payload, env) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY 미설정 — 관리자 메일 생략');
    return;
  }
  if (!isPaymentPaid(payload)) {
    console.log('admin mail skip — not paid', {
      outStatCd: payload.outStatCd,
      resultCd: payload.resultCd,
      outRsltCd: payload.outRsltCd,
    });
    return;
  }

  const recipients = String(env.ADMIN_NOTIFY_EMAIL || DEFAULT_ADMIN_EMAIL)
    .split(/[,;\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
  if (!recipients.length) recipients.push(DEFAULT_ADMIN_EMAIL);

  const from = String(env.ADMIN_MAIL_FROM || DEFAULT_MAIL_FROM).trim();
  const info = buildAdminPaymentSummary(payload);

  const subject = '[STN 스킬업] 결제 완료 — ' + info.applicantName + ' / ' + formatWon(info.amount);
  const text =
    'STN 스킬업 결제가 완료되었습니다.\n\n' +
    '주문자: ' + info.applicantName + '\n' +
    '연락처: ' + info.phone + '\n' +
    '과정: ' + info.programName + '\n' +
    '요금제: ' + info.tier + '\n' +
    '추천인: ' + info.referrer + '\n' +
    '결제금액: ' + formatWon(info.amount) + '\n' +
    '주문번호: ' + info.orderId + '\n' +
    '승인번호: ' + info.authNo + '\n' +
    '결제수단: 신용카드\n\n' +
    '관리자: https://stnmedia.kr/admin/dashboard.html\n';

  const html =
    '<div style="font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;line-height:1.6;color:#111">' +
    '<h2 style="margin:0 0 12px">STN 스킬업 결제 완료</h2>' +
    '<table style="border-collapse:collapse;width:100%;max-width:520px">' +
    '<tr><td style="padding:6px 0;color:#666">주문자</td><td style="padding:6px 0;font-weight:700">' +
    escapeHtml(info.applicantName) +
    '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#666">연락처</td><td style="padding:6px 0">' +
    escapeHtml(info.phone) +
    '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#666">과정</td><td style="padding:6px 0">' +
    escapeHtml(info.programName) +
    '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#666">요금제</td><td style="padding:6px 0">' +
    escapeHtml(info.tier) +
    '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#666">추천인</td><td style="padding:6px 0">' +
    escapeHtml(info.referrer) +
    '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#666">결제금액</td><td style="padding:6px 0;font-weight:700">' +
    escapeHtml(formatWon(info.amount)) +
    '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#666">주문번호</td><td style="padding:6px 0">' +
    escapeHtml(info.orderId) +
    '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#666">승인번호</td><td style="padding:6px 0">' +
    escapeHtml(info.authNo) +
    '</td></tr>' +
    '</table>' +
    '<p style="margin:16px 0 0"><a href="https://stnmedia.kr/admin/dashboard.html">관리자 대시보드 열기</a></p>' +
    '</div>';

  for (const to of recipients) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('admin mail send failed', to, res.status, errText);
      continue;
    }

    console.log('admin mail sent', to, info.orderId);
  }
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

  try {
    await notifyAdminPaymentEmail(payload, env);
  } catch (err) {
    console.error('hecto-return admin mail error', err);
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

  try {
    await notifyAdminPaymentEmail(payload, env);
  } catch (err) {
    console.error('admin mail error', err);
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
