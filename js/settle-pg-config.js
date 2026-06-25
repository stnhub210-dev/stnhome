/**
 * 헥토파이낸셜 신용카드 표준 결제창 — 운영
 *
 * MID: stnmedia01
 * PG: https://npg.settlebank.co.kr
 * 해시·암호화 키 → Cloudflare Worker 시크릿 (HECTO_HASH_KEY, HECTO_AES_KEY)
 *
 * MID·키·PG URL은 헥토에서 발급한 세트와 반드시 일치해야 합니다.
 */
window.STN_SETTLE_PG = {
  isTest: false,
  pgEnv: 'https://npg.settlebank.co.kr',
  mchtId: 'stnmedia01',
  workerBaseUrl: 'https://stn-api.stnhub210.workers.dev',
  mchtName: 'STN스킬업',
  mchtEName: 'STNSkillUp',
  productName: 'STN 스킬업 1기 집중캠프',
  nextUrl: 'https://stnmedia.kr/payment_result.html',
  taxTypeCd: 'N',
  ui: { type: 'popup', width: '430', height: '660' },
};
