/**
 * 헥토파이낸셜 SettlePG v1.2 — 신용카드(표준 결제창)
 *
 * mchtId: 헥토에서 발급한 상점 ID
 * 해시·암호화 키는 Worker 시크릿(HECTO_HASH_KEY, HECTO_AES_KEY)에만 저장
 */
window.STN_SETTLE_PG = {
  isTest: true,
  mchtId: 'M2665490',
  workerBaseUrl: 'https://stn-api.stnhub210.workers.dev',
  mchtName: 'STN스킬업',
  mchtEName: 'STNSkillUp',
  productName: 'STN 스킬업 1기 집중캠프',
  nextUrl: 'https://stnmedia.kr/payment_result.html',
  ui: { type: 'popup', width: '430', height: '660' },
};
