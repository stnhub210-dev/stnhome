/**
 * 헥토파이낸셜 신용카드 표준 결제창
 * 기술문서 /card/main.do 직접 POST (popup)
 *
 * 해시: SHA256(mchtId + method + mchtTrdNo + trdDt + trdTm + trdAmt평문 + hashKey)
 * 암호화: Worker /hecto-prepare (AES-256/ECB/PKCS5 + Base64)
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
    var c = cfg();
    if (c.pgEnv) return String(c.pgEnv).replace(/\/$/, '');
    return c.isTest ? 'https://tbnpg.settlebank.co.kr' : 'https://npg.settlebank.co.kr';
  }

  function workerUrl(path) {
    var base = String(cfg().workerBaseUrl || '').replace(/\/$/, '');
    return base + path;
  }

  function normalizeAmount(amount) {
    var n = Math.max(0, Math.round(Number(amount)));
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error('결제 금액이 올바르지 않습니다.');
    }
    return String(n);
  }

  function buildMchtParam(options) {
    var parts = [];
    if (options.tier) parts.push('tier=' + encodeURIComponent(options.tier));
    if (options.referrer) parts.push('referrer=' + encodeURIComponent(options.referrer));
    if (options.referralCode) parts.push('ref=' + encodeURIComponent(options.referralCode));
    return parts.join('&');
  }

  function parsePrepareBody(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.pktHash && data.trdAmt) return data;
    if (data.error) throw new Error(data.error);

    if (Array.isArray(data.content) && data.content[0] && data.content[0].text) {
      try {
        var inner = JSON.parse(data.content[0].text);
        if (inner && inner.pktHash && inner.trdAmt) return inner;
      } catch (_) {}
    }
    return null;
  }

  async function fetchPrepare(payload) {
    var res = await fetch(workerUrl('/hecto-prepare'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      var text = await res.text();
      throw new Error(text || '결제 준비 API 오류');
    }

    var prepared = parsePrepareBody(await res.json());
    if (!prepared) {
      throw new Error(
        'pktHash 생성 실패: Worker에 HECTO_HASH_KEY, HECTO_AES_KEY가 MID와 맞게 설정되어 있는지 확인해 주세요.'
      );
    }
    return prepared;
  }

  function appendHidden(form, name, value) {
    if (value === undefined || value === null || value === '') return;
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }

  /** 기술문서 FORM-SUBMIT 방식 — 문서에 있는 필드만 전송 */
  function openCardPaymentPopup(payData) {
    var ui = payData.ui || { width: 430, height: 660 };
    var width = parseInt(ui.width, 10) || 430;
    var height = parseInt(ui.height, 10) || 660;
    var left = Math.max(0, Math.floor((screen.width - width) / 2));
    var top = Math.max(0, Math.floor((screen.height - height) / 2));
    var popupName = 'STN_HectoPay_' + Date.now();

    var popup = window.open(
      '',
      popupName,
      'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes'
    );
    if (!popup) {
      throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제한 뒤 다시 시도해 주세요.');
    }

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = envUrl() + '/card/main.do';
    form.target = popupName;
    form.acceptCharset = 'UTF-8';

    appendHidden(form, 'mchtId', payData.mchtId);
    appendHidden(form, 'method', 'card');
    appendHidden(form, 'trdDt', payData.trdDt);
    appendHidden(form, 'trdTm', payData.trdTm);
    appendHidden(form, 'mchtTrdNo', payData.mchtTrdNo);
    appendHidden(form, 'mchtName', payData.mchtName);
    appendHidden(form, 'mchtEName', payData.mchtEName);
    appendHidden(form, 'pmtPrdtNm', payData.pmtPrdtNm);
    appendHidden(form, 'trdAmt', payData.trdAmt);
    appendHidden(form, 'notiUrl', payData.notiUrl);
    appendHidden(form, 'nextUrl', payData.nextUrl);
    appendHidden(form, 'cancUrl', payData.cancUrl);
    appendHidden(form, 'pktHash', payData.pktHash);

    if (payData.mchtCustNm) appendHidden(form, 'mchtCustNm', payData.mchtCustNm);
    if (payData.email) appendHidden(form, 'email', payData.email);
    if (payData.cphoneNo) appendHidden(form, 'cphoneNo', payData.cphoneNo);
    if (payData.mchtParam) appendHidden(form, 'mchtParam', payData.mchtParam);
    if (payData.taxTypeCd) appendHidden(form, 'taxTypeCd', payData.taxTypeCd);
    if (payData.instmtMon) appendHidden(form, 'instmtMon', payData.instmtMon);

    document.body.appendChild(form);
    form.submit();
    setTimeout(function () {
      if (form.parentNode) form.parentNode.removeChild(form);
    }, 1000);

    return popup;
  }

  function resultPageMarker() {
    var c = cfg();
    var path = c.resultPath || '/payment_result.html';
    return path.charAt(0) === '/' ? path : '/' + path.replace(/^https?:\/\/[^/]+/, '');
  }

  function watchPaymentPopup(popup, options) {
    if (!popup) return;
    var completed = false;
    var marker = resultPageMarker();

    function finishCompleted(href) {
      if (completed) return;
      completed = true;
      clearInterval(timer);
      if (href) {
        window.location.href = href;
      }
      try {
        popup.close();
      } catch (_) {}
    }

    function handlePopupClosed() {
      if (completed) return;
      completed = true;
      clearInterval(timer);
      if (typeof options.onPopupClosed === 'function') {
        options.onPopupClosed();
      } else if (global.STNPaymentUI && global.STNPaymentUI.showFailModal) {
        global.STNPaymentUI.showFailModal();
      }
    }

    var timer = setInterval(function () {
      if (completed) return;
      if (!popup || popup.closed) {
        handlePopupClosed();
        return;
      }
      try {
        var href = popup.location.href || '';
        if (href.indexOf(marker) !== -1) {
          finishCompleted(href);
        }
      } catch (_) {}
    }, 400);
  }

  global.STNSettlePG = {
    startCardPayment: async function (options) {
      var c = cfg();
      if (!c.mchtId) throw new Error('SettlePG mchtId가 설정되지 않았습니다.');
      if (!c.workerBaseUrl) throw new Error('SettlePG workerBaseUrl이 설정되지 않았습니다.');

      var ts = tradeTimestamp();
      var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      var prefix = String(options.orderPrefix || 'STN').replace(/[^A-Za-z0-9]/g, '');
      var mchtTrdNo = prefix + ts.trdDt + ts.trdTm + rand;
      var trdAmtPlain = normalizeAmount(options.amount);

      if (typeof options.onPending === 'function') {
        options.onPending({
          orderId: mchtTrdNo,
          amount: Number(trdAmtPlain),
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

      var popup = openCardPaymentPopup({
        mchtId: c.mchtId,
        trdDt: ts.trdDt,
        trdTm: ts.trdTm,
        mchtTrdNo: mchtTrdNo,
        trdAmt: prepared.trdAmt,
        mchtName: c.mchtName,
        mchtEName: c.mchtEName,
        pmtPrdtNm: options.programName || c.productName,
        mchtCustNm: prepared.mchtCustNm,
        cphoneNo: String(options.customer.phone || '').replace(/\D/g, ''),
        email: prepared.email,
        notiUrl: workerUrl('/hecto-notify'),
        nextUrl: c.nextUrl,
        cancUrl: options.cancUrl,
        pktHash: prepared.pktHash,
        taxTypeCd: c.taxTypeCd || 'N',
        instmtMon: options.installment || '00',
        mchtParam: buildMchtParam(options) || undefined,
        ui: c.ui || { type: 'popup', width: '430', height: '660' },
      });

      if (typeof options.onPopupOpen === 'function') {
        options.onPopupOpen();
      }

      watchPaymentPopup(popup, options);
    },

    startPayment: async function (options) {
      if (options.payMethodKey && options.payMethodKey !== 'card') {
        throw new Error('현재 신용카드 결제만 연동되어 있습니다. 카드를 선택해 주세요.');
      }
      return this.startCardPayment(options);
    },
  };
})(window);
