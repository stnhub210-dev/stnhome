/**
 * 헥토파이낸셜 신용카드 표준 결제창
 *
 * MID: M2665490
 * pgEnv: 헥토 가맹점관리자에 안내된 결제 서버 URL (tbnpg=연동·심사, npg=운영)
 * mchtName/mchtEName: 가맹점관리자 > 기본정보 와 동일해야 함
 *
 * 해시·암호화 키 → Cloudflare Worker 시크릿 (HECTO_HASH_KEY, HECTO_AES_KEY)
 */
window.STN_SETTLE_PG = {
  // 헥토에서 '운영(npg)' 개통 전이면 tbnpg 사용 (ST09 = 해당 서버에 MID 미등록)
  isTest: true,
  pgEnv: 'https://tbnpg.settlebank.co.kr',
  mchtId: 'M2665490',
  workerBaseUrl: 'https://stn-api.stnhub210.workers.dev',
  // 아래 상점명은 헥토 가맹점관리자(nspay.settlebank.co.kr) 기본정보와 맞춰 주세요
  mchtName: 'STN스킬업',
  mchtEName: 'STNSkillUp',
  productName: 'STN 스킬업 1기 집중캠프',
  nextUrl: 'https://stnmedia.kr/payment_result.html',
  taxTypeCd: 'N',
  ui: { type: 'popup', width: '430', height: '660' },
};
