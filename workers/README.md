# STN API Worker (헥토파이낸셜 신용카드)

## pktHash 오류가 날 때

브라우저 Network 탭에서 `/hecto-prepare` 응답이 `{}` 이거나 `pktHash`가 없으면 **배포된 Worker 코드가 옛 버전**입니다.

1. Cloudflare 대시보드 → Workers → `stn-api` → **Edit code**
2. `stn-api-worker.standalone.js` 내용 전체를 붙여넣고 **Deploy**
3. Settings → Variables → Secrets 에 아래 키 등록
4. 터미널 배포 시: `cd workers` 후 `npx wrangler login` → `npx wrangler deploy`

## Cloudflare 시크릿 설정

```bash
npx wrangler secret put HECTO_AES_KEY
# 테스트: pgSettle30y739r82jtd709yOfZ2yK5K

npx wrangler secret put HECTO_HASH_KEY
# 테스트: ST1009281328226982205
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

## 해시 공식 (신용카드)

```
SHA256( mchtId + method + mchtTrdNo + trdDt + trdTm + trdAmt평문 + hashKey )
```

- `method` = `card` (고정)

## 프론트 설정

`js/settle-pg-config.js`

- `isTest: true` → `tbnpg.settlebank.co.kr`, MID `nxca_jt_il`
- `isTest: false` → 운영 MID·키로 변경

## 헥토에 등록할 notiUrl

```
https://stn-api.stnhub210.workers.dev/hecto-notify
```
