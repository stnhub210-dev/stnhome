# STN API Worker (헥토파이낸셜 신용카드)

## pktHash 오류가 날 때

브라우저 Network 탭에서 `/hecto-prepare` 응답이 `{}` 이거나 `pktHash`가 없으면 **배포된 Worker 코드가 옛 버전**입니다.

1. Cloudflare 대시보드 → Workers → `stn-api` → **Edit code**
2. `stn-api-worker.standalone.js` 내용 전체를 붙여넣고 **Deploy**
3. Settings → Variables → Secrets 에 아래 키 등록
4. 터미널 배포 시: `cd workers` 후 `npx wrangler login` → `npx wrangler deploy`

## Cloudflare 시크릿 설정

**MID와 키는 반드시 한 세트로 맞춰야 합니다.** 키가 다르면 `1901 해시값 불일치` 오류가 납니다.

### 테스트 (MID `nxca_jt_il` — 기술문서 표준)

헥토 **신용카드 표준 결제창** 테스트는 아래 세트만 사용합니다. 다른 키를 넣으면 `1901` 해시 오류가 납니다.

```bash
npx wrangler secret put HECTO_HASH_KEY
# ST1009281328226982205

npx wrangler secret put HECTO_AES_KEY
# pgSettle30y739r82jtd709yOfZ2yK5K
```

검증 예시 (문서 샘플과 동일해야 함):

- 입력: `nxca_jt_il`, `card`, `CARD20260625104008`, `20260625`, `104008`, `1000`
- pktHash: `d0708f61b157d58b20a44a143887767d5cf2c0210c11d615d1881990f24ddf3e`
- trdAmt(암호화): `AntV/eDpxIaKF0hJiePDKA==`

### 운영 (MID `M2665490` 등)

```bash
npx wrangler secret put HECTO_HASH_KEY
# ST1009281328226982205

npx wrangler secret put HECTO_AES_KEY
# pgSettle30y739r82jtd709yOfZ2yK5K
```

### 운영 (헥토에서 발급받은 본인 MID·키)

운영 MID(예: `M2665490`)를 쓸 때는 **그 MID에 맞는** 해시·암호화 키를 넣으세요.  
`nxca_jt_il` 테스트 키와 운영 MID를 섞으면 안 됩니다.

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
- `isTest: false` → `npg.settlebank.co.kr`, 운영 MID·키

## 헥토에 등록할 notiUrl

```
https://stn-api.stnhub210.workers.dev/hecto-notify
```
