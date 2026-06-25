/**
 * Cloudflare 대시보드 Quick Edit용 Worker
 * Settings → Compatibility flags → nodejs_compat 활성화 필요
 *
 * 시크릿: HECTO_HASH_KEY, HECTO_AES_KEY
 */

import { createCipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';

const ALLOW_ORIGINS = [
  'https://stnmedia.kr',
  'https://www.stnmedia.kr',
  'https://stnhub210-dev.github.io',
];

const CARD_METHOD = 'card';

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  if (!origin || origin === 'null') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  const allow = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
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

function aesKeyBytes(aesKeyStr) {
  const raw = Buffer.from(String(aesKeyStr), 'utf8');
  if (raw.length >= 32) return raw.subarray(0, 32);
  const padded = Buffer.alloc(32);
  raw.copy(padded);
  return padded;
}

function aes256EcbEncryptBase64(plainText, aesKeyStr) {
  const key = aesKeyBytes(aesKeyStr);
  const cipher = createCipheriv('aes-256-ecb', key, Buffer.alloc(0));
  return Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]).toString('base64');
}

async function buildPktHash({ mchtId, method, mchtTrdNo, trdDt, trdTm, trdAmtPlain }, hashKey) {
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
  const result = { pktHash, trdAmt: trdAmtEnc, mchtTrdNo, method };

  if (mchtCustNm) {
    result.mchtCustNm = aes256EcbEncryptBase64(mchtCustNm, aesKey);
  }
  if (email) {
    result.email = aes256EcbEncryptBase64(email, aesKey);
  }

  return { status: 200, data: result };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      const url = new URL(request.url);

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
        const rawText = await request.text();
        console.log('hecto-notify', rawText);
        return new Response('OK', {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      return json({ error: 'Not Found' }, 404, request);
    } catch (err) {
      console.error(err);
      return json({ error: err.message || 'Internal Error' }, 500, request);
    }
  },
};
