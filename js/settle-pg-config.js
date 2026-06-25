/**
 * 헥토파이낸셜 SettlePG v1.2 — 신용카드(표준 결제창)
 *
 * 테스트 MID: nxca_jt_il (인증)
 * 암호화·해시 키는 Worker 시크릿에만 저장 (브라우저/GitHub에 넣지 마세요)
 */
window.STN_SETTLE_PG = {
  isTest: true,
  mchtId: 'nxca_jt_il',
  workerBaseUrl: 'https://stn-api.stnhub210.workers.dev',
  // Worker 실패 시 폴백 — nxca_jt_il 테스트 키와 동일해야 함
  testHashKey: 'ST1009281328226982205',
  testAesKey: 'pgSettle30y739r82jtd709yOfZ2yK5K',
  mchtName: 'STN스킬업',
  mchtEName: 'STNSkillUp',
  productName: 'STN 스킬업 1기 집중캠프',
  nextUrl: 'https://stnmedia.kr/payment_result.html',
  ui: { type: 'popup', width: '430', height: '660' },
};
