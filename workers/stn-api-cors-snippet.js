/**
 * stn-api (Cloudflare Worker)에 붙일 CORS 스니펫입니다.
 * 기존 fetch 핸들러 맨 앞에 OPTIONS 분기 추가 후,
 * 모든 JSON 응답 헤더에 ...corsHeaders(request) 를 합치세요.
 *
 * 중요: Worker가 처리 중 예외로 죽으면 Cloudflare 기본 500(text/plain, error code: 1101)에는
 * CORS 헤더가 없습니다. 브라우저는 이걸 CORS 실패로 보고 Failed to fetch 가 납니다.
 * → 전체 로직을 try/catch로 감싸고, catch에서도 JSON + corsHeaders 로 응답하세요.
 */

const ALLOW_ORIGINS = [
  'https://stnmedia.kr',
  'https://www.stnmedia.kr',
  'https://stnhub210-dev.github.io',
  'https://strhub210-dev.github.io',
];

export function corsHeaders(request, allowList) {
  const origins = allowList || ALLOW_ORIGINS;
  const origin = request.headers.get('Origin');
  if (!origin || origin === 'null') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  const allow = origins.includes(origin) ? origin : origins[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * 사용 예 (기존 Worker의 fetch 안에서):
 *
 *   import { corsHeaders } from './stn-api-cors-snippet.js';
 *
 *   async fetch(request, env, ctx) {
 *     if (request.method === 'OPTIONS') {
 *       return new Response(null, { status: 204, headers: corsHeaders(request) });
 *     }
 *     // ... 기존 POST 처리 ...
 *     return new Response(JSON.stringify(data), {
 *       headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
 *     });
 *   }
 *
 * 권장 패턴 (에러에도 CORS 유지):
 *
 *   export default {
 *     async fetch(request, env, ctx) {
 *       const cors = () => corsHeaders(request);
 *       try {
 *         if (request.method === 'OPTIONS') {
 *           return new Response(null, { status: 204, headers: cors() });
 *         }
 *         // ... 본문 ...
 *       } catch (err) {
 *         return new Response(JSON.stringify({ error: String(err.message || err) }), {
 *           status: 500,
 *           headers: { 'Content-Type': 'application/json', ...cors() },
 *         });
 *       }
 *     },
 *   };
 */
