/**
 * 헥토파이낸셜 신용카드 표준 결제창 — 운영
 *
 * MID M2665490 + 운영 키 → 반드시 npg 사용
 * tbnpg에 같은 키를 쓰면 1901, npg에 MID 미개통이면 ST09
 *
 * 해시·암호화 키 → Worker 시크릿 (HECTO_HASH_KEY, HECTO_AES_KEY)
 */
window.STN_SETTLE_PG = {
  isTest: false,
  pgEnv: 'https://npg.settlebank.co.kr',
  mchtId: 'M2665490',
  workerBaseUrl: 'https://stn-api.stnhub210.workers.dev',
  // 헥토 가맹점관리자(nspay.settlebank.co.kr) > 기본정보 와 동일하게 맞출 것
  mchtName: 'STN스킬업',
  mchtEName: 'STNSkillUp',
  productName: 'STN 스킬업 1기 집중캠프',
  nextUrl: 'https://stnmedia.kr/payment_result.html',
  taxTypeCd: 'N',
  ui: { type: 'popup', width: '430', height: '660' },
};
