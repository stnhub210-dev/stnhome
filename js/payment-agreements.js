/**
 * 결제 페이지 약관 동의 — 전체 동의 ↔ 개별 항목 연동
 */
(function (global) {
  function bind(opts) {
    var agreeAll = opts.agreeAll;
    var children = (opts.children || []).filter(Boolean);
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function () {};

    if (!agreeAll || !children.length) return;

    function setAllFromParent() {
      var on = agreeAll.checked;
      children.forEach(function (el) {
        el.checked = on;
      });
      onChange();
    }

    function syncParentFromChildren() {
      agreeAll.checked = children.every(function (el) {
        return el.checked;
      });
      onChange();
    }

    agreeAll.addEventListener('change', setAllFromParent);

    children.forEach(function (el) {
      el.addEventListener('change', syncParentFromChildren);
    });
  }

  global.STNPaymentAgreements = {
    bind: bind,
  };
})(window);
