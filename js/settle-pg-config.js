/**
 * 헥토파이낸셜 신용카드 표준 결제창 (SettlePG v1.2) — 운영
 *
 * MID: M2665490
 * PG: https://npg.settlebank.co.kr
 * 해시·암호화 키 → Cloudflare Worker 시크릿 (HECTO_HASH_KEY, HECTO_AES_KEY)
 *
 * 해시: SHA256(mchtId + method + mchtTrdNo + trdDt + trdTm + trdAmt평문 + hashKey)
 */
window.STN_SETTLE_PG = {
  isTest: false,
  mchtId: 'M2665490',
  workerBaseUrl: 'https://stn-api.stnhub210.workers.dev',
  mchtName: 'STN스킬업',
  mchtEName: 'STNSkillUp',
  productName: 'STN 스킬업 1기 집중캠프',
  nextUrl: 'https://stnmedia.kr/payment_result.html',
  taxTypeCd: 'N',
  ui: { type: 'popup', width: '430', height: '660' },
};
