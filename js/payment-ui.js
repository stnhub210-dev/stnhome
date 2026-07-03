/**
 * 결제 페이지 공통 UI (팝업 취소·실패 모달)
 */
(function (global) {
  var MODAL_ID = 'stn-pay-fail-modal';

  function ensureModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;

    var wrap = document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.className = 'stn-pay-fail-modal';
    wrap.hidden = true;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'stn-pay-fail-title');
    wrap.innerHTML =
      '<div class="stn-pay-fail-modal__backdrop" data-close="1"></div>' +
      '<div class="stn-pay-fail-modal__box">' +
        '<h2 class="stn-pay-fail-modal__title" id="stn-pay-fail-title">결제가 완료되지 않았습니다</h2>' +
        '<p class="stn-pay-fail-modal__msg" id="stn-pay-fail-msg"></p>' +
        '<button type="button" class="stn-pay-fail-modal__btn" data-close="1">확인</button>' +
      '</div>';

    if (!document.getElementById('stn-pay-fail-modal-style')) {
      var style = document.createElement('style');
      style.id = 'stn-pay-fail-modal-style';
      style.textContent =
        '.stn-pay-fail-modal{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;padding:20px}' +
        '.stn-pay-fail-modal[hidden]{display:none!important}' +
        '.stn-pay-fail-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(3px)}' +
        '.stn-pay-fail-modal__box{position:relative;z-index:1;width:min(100%,400px);padding:28px 24px;border-radius:16px;background:#111;border:1px solid #333;text-align:center}' +
        '.stn-pay-fail-modal__title{margin:0 0 12px;font-size:1.1rem;font-weight:900;color:#fff}' +
        '.stn-pay-fail-modal__msg{margin:0 0 20px;font-size:.9rem;line-height:1.6;color:#bdbdbd;font-weight:600}' +
        '.stn-pay-fail-modal__btn{width:100%;padding:14px 18px;border:none;border-radius:12px;background:#7cfc00;color:#0a0a0a;font:inherit;font-weight:900;cursor:pointer}';
      document.head.appendChild(style);
    }

    wrap.addEventListener('click', function (e) {
      if (e.target && e.target.getAttribute('data-close') === '1') {
        hideFailModal();
      }
    });

    document.body.appendChild(wrap);
    return wrap;
  }

  function showFailModal(message, title) {
    var modal = ensureModal();
    var msgEl = document.getElementById('stn-pay-fail-msg');
    var titleEl = document.getElementById('stn-pay-fail-title');
    if (titleEl) titleEl.textContent = title || '결제가 완료되지 않았습니다';
    if (msgEl) {
      msgEl.textContent =
        message ||
        '결제창이 닫혔거나 결제가 취소되었습니다. 다시 시도해 주세요. 문의: 1599-5053';
    }
    modal.hidden = false;
  }

  function hideFailModal() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.hidden = true;
  }

  global.STNPaymentUI = {
    showFailModal: showFailModal,
    hideFailModal: hideFailModal,
  };
})(window);
