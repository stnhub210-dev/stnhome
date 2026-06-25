/**
 * 헥토파이낸셜 SettlePG v1.2 — 신용카드 표준 결제창
 * SETTLE_PG.pay(options, null) popup
 *
 * 해시·금액 암호화는 Worker /hecto-prepare 에서 처리
 */
(function (global) {
  function cfg() {
    return global.STN_SETTLE_PG || {};
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function tradeTimestamp() {
    var now = new Date();
    return {
      trdDt: String(now.getFullYear()) + pad2(now.getMonth() + 1) + pad2(now.getDate()),
      trdTm: pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds()),
    };
  }

  function envUrl() {
    return cfg().isTest ? 'https://tbnpg.settlebank.co.kr' : 'https://npg.settlebank.co.kr';
  }

  function sdkUrl() {
    return envUrl() + '/resources/js/v1/SettlePG_v1.2.js';
  }

  function workerUrl(path) {
    var base = String(cfg().workerBaseUrl || '').replace(/\/$/, '');
    return base + path;
  }

  function buildMchtParam(options) {
    var parts = [];
    if (options.tier) parts.push('tier=' + encodeURIComponent(options.tier));
    if (options.referrer) parts.push('referrer=' + encodeURIComponent(options.referrer));
    if (options.referralCode) parts.push('ref=' + encodeURIComponent(options.referralCode));
    return parts.join('&');
  }

  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (global.SETTLE_PG && typeof global.SETTLE_PG.pay === 'function') {
        resolve(global.SETTLE_PG);
        return;
      }

      var existing = document.querySelector('script[data-settle-pg-sdk]');
      if (existing) {
        existing.addEventListener('load', function () {
          if (global.SETTLE_PG) resolve(global.SETTLE_PG);
          else reject(new Error('SETTLE_PG 로드 실패'));
        });
        existing.addEventListener('error', function () {
          reject(new Error('결제 스크립트 로드 실패'));
        });
        return;
      }

      var script = document.createElement('script');
      script.src = sdkUrl();
      script.async = true;
      script.setAttribute('data-settle-pg-sdk', '1');
      script.onload = function () {
        if (global.SETTLE_PG && typeof global.SETTLE_PG.pay === 'function') {
          resolve(global.SETTLE_PG);
        } else {
          reject(new Error('SETTLE_PG 객체를 찾을 수 없습니다.'));
        }
      };
      script.onerror = function () {
        reject(new Error('SettlePG 스크립트를 불러오지 못했습니다.'));
      };
      document.head.appendChild(script);
    });
  }

  function parsePrepareBody(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.pktHash && data.trdAmt) return data;
    if (data.error) throw new Error(data.error);

    // 구 Worker 등 비정상 응답 형식
    if (Array.isArray(data.content) && data.content[0] && data.content[0].text) {
      try {
        var inner = JSON.parse(data.content[0].text);
        if (inner && inner.pktHash && inner.trdAmt) return inner;
      } catch (_) {}
    }
    return null;
  }

  async function sha256Hex(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  function aesKeyBytes(aesKeyStr) {
    var raw = new TextEncoder().encode(String(aesKeyStr));
    if (raw.length >= 32) return raw.slice(0, 32);
    var padded = new Uint8Array(32);
    padded.set(raw);
    return padded;
  }

  function bytesToBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  var aesJsPromise = null;

  function loadAesJs() {
    if (!aesJsPromise) {
      aesJsPromise = import('https://cdn.jsdelivr.net/npm/aes-js@3.1.2/+esm');
    }
    return aesJsPromise;
  }

  async function aes256EcbEncryptBase64(plainText, aesKeyStr) {
    var aesjs = await loadAesJs();
    var key = aesKeyBytes(aesKeyStr);
    var textBytes = aesjs.utils.utf8.toBytes(String(plainText));
    var padded = aesjs.padding.pkcs7.pad(textBytes);
    var aesEcb = new aesjs.ModeOfOperation.ecb(key);
    return bytesToBase64(aesEcb.encrypt(padded));
  }

  async function prepareLocally(payload) {
    var c = cfg();
    if (!c.isTest || !c.testHashKey || !c.testAesKey) return null;

    var method = payload.method || 'card';
    var trdAmtPlain = String(payload.trdAmt);
    var raw =
      String(payload.mchtId) +
      String(method) +
      String(payload.mchtTrdNo) +
      String(payload.trdDt) +
      String(payload.trdTm) +
      trdAmtPlain +
      String(c.testHashKey);

    var result = {
      pktHash: await sha256Hex(raw),
      trdAmt: await aes256EcbEncryptBase64(trdAmtPlain, c.testAesKey),
      mchtTrdNo: payload.mchtTrdNo,
      method: method,
    };

    if (payload.mchtCustNm) {
      result.mchtCustNm = await aes256EcbEncryptBase64(payload.mchtCustNm, c.testAesKey);
    }
    if (payload.email) {
      result.email = await aes256EcbEncryptBase64(payload.email, c.testAesKey);
    }

    return result;
  }

  async function fetchPrepare(payload) {
    var prepared = null;
    var workerError = null;

    try {
      var res = await fetch(workerUrl('/hecto-prepare'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        prepared = parsePrepareBody(await res.json());
      } else {
        workerError = await res.text();
      }
    } catch (err) {
      workerError = err.message || String(err);
    }

    if (prepared) return prepared;

    var local = await prepareLocally(payload);
    if (local) {
      console.warn('Worker 결제 준비 실패 — 테스트 로컬 폴백 사용:', workerError || '빈 응답');
      return local;
    }

    throw new Error(
      workerError ||
        'pktHash 생성 실패: Cloudflare Worker(stn-api)에 결제 코드를 배포하고 HECTO_HASH_KEY, HECTO_AES_KEY 시크릿을 설정해 주세요.'
    );
  }

  global.STNSettlePG = {
    /** 신용카드 결제창 실행 */
    startCardPayment: async function (options) {
      var c = cfg();
      if (!c.mchtId) throw new Error('SettlePG mchtId가 설정되지 않았습니다.');
      if (!c.workerBaseUrl) throw new Error('SettlePG workerBaseUrl이 설정되지 않았습니다.');

      var ts = tradeTimestamp();
      var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      var prefix = options.orderPrefix || 'STN';
      var mchtTrdNo = prefix + '-' + ts.trdDt + '-' + rand;
      var trdAmtPlain = String(options.amount);

      if (typeof options.onPending === 'function') {
        options.onPending({
          orderId: mchtTrdNo,
          amount: Number(options.amount),
          applicantName: options.customer.name,
          phone: options.customer.phone,
          email: options.customer.email,
          referrer: options.referrer || null,
          referral_code: options.referralCode || null,
          programName: options.programName || c.productName,
          tier: options.tier || '',
          period: options.period || '2026. 8. 15 ~ 8. 17 (2박 3일)',
          payMethodKey: 'card',
        });
      }

      var prepared = await fetchPrepare({
        mchtId: c.mchtId,
        method: 'card',
        trdDt: ts.trdDt,
        trdTm: ts.trdTm,
        mchtTrdNo: mchtTrdNo,
        trdAmt: trdAmtPlain,
        mchtCustNm: options.customer.name,
        email: options.customer.email,
      });

      if (!prepared.pktHash || !prepared.trdAmt) {
        throw new Error('pktHash 또는 거래금액 암호화에 실패했습니다.');
      }

      var payOptions = {
        env: envUrl(),
        mchtId: c.mchtId,
        method: 'card',
        trdDt: ts.trdDt,
        trdTm: ts.trdTm,
        mchtTrdNo: mchtTrdNo,
        trdAmt: prepared.trdAmt,
        mchtName: c.mchtName,
        mchtEName: c.mchtEName,
        pmtPrdtNm: options.programName || c.productName,
        mchtCustNm: prepared.mchtCustNm || options.customer.name,
        notiUrl: workerUrl('/hecto-notify'),
        nextUrl: c.nextUrl,
        cancUrl: options.cancUrl,
        pktHash: prepared.pktHash,
        ui: c.ui || { type: 'popup', width: '430', height: '660' },
        instmtMon: options.installment || '00',
      };

      if (prepared.email) {
        payOptions.email = prepared.email;
      }

      var mchtParam = buildMchtParam(options);
      if (mchtParam) payOptions.mchtParam = mchtParam;

      var sdk = await loadSdk();
      sdk.pay(payOptions, null);
    },

    startPayment: async function (options) {
      if (options.payMethodKey && options.payMethodKey !== 'card') {
        throw new Error('현재 신용카드 결제만 연동되어 있습니다. 카드를 선택해 주세요.');
      }
      return this.startCardPayment(options);
    },
  };
})(window);
