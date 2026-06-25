# STN API Worker (헥토파이낸셜 신용카드)

## pktHash 오류가 날 때

브라우저 Network 탭에서 `/hecto-prepare` 응답이 `{}` 이거나 `pktHash`가 없으면 **배포된 Worker 코드가 옛 버전**입니다.

1. Cloudflare 대시보드 → Workers → `stn-api` → **Edit code**
2. `stn-api-worker.standalone.js` 내용 전체를 붙여넣고 **Deploy**
3. Settings → Variables → Secrets 에 아래 키 등록
4. 터미널 배포 시: `cd workers` 후 `npx wrangler login` → `npx wrangler deploy`

## Cloudflare 시크릿 설정

**MID와 키는 반드시 한 세트로 맞춰야 합니다.** 키가 다르면 `1901 해시값 불일치` 오류가 납니다.

### 오류 코드 정리

| 코드 | PG URL | 의미 | 조치 |
|------|--------|------|------|
| **1901** | tbnpg | 해시·암호화키가 **해당 서버**와 불일치 | 운영 키는 `npg`만 사용. tbnpg는 `nxca_jt_il` 테스트 키 전용 |
| **ST09** | npg | **MID 미등록** (운영 미개통) | 헥토에 해당 MID npg 개통·카드사 심사 완료 요청 |

운영 MID + 발급받은 운영 키 → **`npg.settlebank.co.kr`만** 사용합니다.

### ST09 (가맹점 정보 미확인)

`npg`에 MID가 없거나, `mchtName`이 헥토 등록명과 다를 때 발생합니다.

- 카드사 심사·연동 중 → `tbnpg.settlebank.co.kr` + 해당 MID
- 운영 개통 완료 → `npg.settlebank.co.kr` + 운영 MID·키

### 운영 (MID `stnmedia01` 등)

```bash
cd workers
npx wrangler secret put HECTO_HASH_KEY
# 헥토에서 발급한 운영 해시(라이선스) 키

npx wrangler secret put HECTO_AES_KEY
# 헥토에서 발급한 운영 암호화 키

npx wrangler deploy
```

프론트: `js/settle-pg-config.js` → `isTest: false`, `mchtId: 'stnmedia01'`, PG `npg.settlebank.co.kr`

### 테스트 (MID `nxca_jt_il` — 헥토 기술문서 표준)

개발·검증용만 사용. 운영 MID·키와 섞지 마세요.

```bash
npx wrangler secret put HECTO_HASH_KEY
# ST1009281328226982205

npx wrangler secret put HECTO_AES_KEY
# pgSettle30y739r82jtd709yOfZ2yK5K
```

### 관리자 대시보드 연동 (선택, 권장)

노티 수신 시 `payment_applications` 상태를 갱신합니다.

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

`service_role` 키는 **절대** 프론트엔드에 넣지 마세요.

## 엔드포인트

| 경로 | 설명 |
|------|------|
| `POST /hecto-prepare` | pktHash + AES 암호화(trdAmt, 고객명, 이메일) |
| `POST /hecto-notify` | PG 노티 → Supabase 상태 갱신, 응답 `OK` |
| `POST /hecto-return` | PG 결제 완료 POST 수신 → `payment_result.html`로 302 리다이렉트 |

## nextUrl (결제 완료 리다이렉트)

프론트 `js/settle-pg-config.js`의 `nextUrl`은 Worker `/hecto-return`을 가리킵니다.
PG가 POST로 결과를내면 Worker가 쿼리스트링을 붙여 `payment_result.html`로 이동시킵니다.

```
https://stn-api.stnhub210.workers.dev/hecto-return
```

## 해시 공식 (신용카드)

```
SHA256( mchtId + method + mchtTrdNo + trdDt + trdTm + trdAmt평문 + hashKey )
```

- `method` = `card` (고정)

## 프론트 설정

`js/settle-pg-config.js`

- `isTest: false` → `npg.settlebank.co.kr`, MID `stnmedia01` (운영)
- `isTest: true` → `tbnpg.settlebank.co.kr`, MID `nxca_jt_il` (테스트)

## 헥토에 등록할 notiUrl

```
https://stn-api.stnhub210.workers.dev/hecto-notify
```
