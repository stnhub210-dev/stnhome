/**
 * 결제 페이지 할인코드 검증·할인 적용
 */
(function (global) {
  var applied = null;

  function isSupabaseConfigured() {
    var cfg = global.STN_ADMIN_CONFIG || {};
    return !!(
      cfg.supabaseUrl &&
      cfg.supabaseUrl !== 'YOUR_SUPABASE_URL' &&
      cfg.supabaseAnonKey &&
      cfg.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
      global.supabase
    );
  }

  function getClient() {
    var cfg = global.STN_ADMIN_CONFIG;
    return global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  function formatWon(n) {
    var num = Number(n);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString('ko-KR') + '원';
  }

  function calculateDiscountedAmount(baseAmount, discount) {
    var base = Number(baseAmount) || 0;
    if (!discount || !discount.valid) return base;

    if (discount.discount_type === 'percent') {
      var pct = Number(discount.discount_value) || 0;
      return Math.max(0, Math.round(base * (1 - pct / 100)));
    }

    if (discount.discount_type === 'fixed') {
      return Math.max(0, base - (Number(discount.discount_value) || 0));
    }

    return base;
  }

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase();
  }

  function isNoneValue(value) {
    var v = String(value || '').trim();
    return !v || v === '추천인 없음' || v === '-';
  }

  window.STNReferralPublic = {
    init: function (options) {
      var opts = options || {};
      var state = {
        baseAmount: Number(opts.baseAmount) || 0,
        elInput: document.getElementById(opts.inputId || 'applicant-discount-code'),
        elMsg: document.getElementById(opts.msgId || 'err-discount-code'),
        elTotal: document.getElementById(opts.totalId || 'sum-total-val'),
        elDiscountRow: document.getElementById(opts.discountRowId || 'sum-referral-discount'),
        onAmountChange: typeof opts.onAmountChange === 'function' ? opts.onAmountChange : null,
        showToast: typeof opts.showToast === 'function' ? opts.showToast : null
      };

      this._state = state;
      applied = null;

      var applyBtn = document.getElementById(opts.applyBtnId || 'btn-apply-discount');

      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          window.STNReferralPublic.applyCode();
        });
      }

      if (state.elInput) {
        state.elInput.addEventListener('input', function () {
          if (applied && normalizeCode(state.elInput.value) !== normalizeCode(applied.code)) {
            applied = null;
            window.STNReferralPublic.updateDisplay();
          }
          window.STNReferralPublic.clearMessage();
        });
      }

      var ref = new URLSearchParams(global.location.search).get('ref');
      if (ref && state.elInput) {
        state.elInput.value = ref;
        window.STNReferralPublic.applyCode(true);
      } else {
        window.STNReferralPublic.updateDisplay();
      }
    },

    clearMessage: function () {
      var elMsg = this._state && this._state.elMsg;
      if (!elMsg) return;
      elMsg.textContent = '';
      elMsg.classList.remove('is-ok');
    },

    setMessage: function (text, type) {
      var elMsg = this._state && this._state.elMsg;
      if (!elMsg) return;
      elMsg.textContent = text || '';
      elMsg.classList.toggle('is-ok', type === 'ok');
    },

    applyCode: async function (silent) {
      var state = this._state;
      if (!state || !state.elInput) return false;

      var code = normalizeCode(state.elInput.value);
      if (isNoneValue(code)) {
        this.clearCode();
        return true;
      }

      if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
        if (!silent) this.setMessage('코드 형식을 확인해 주세요.');
        applied = null;
        this.updateDisplay();
        return false;
      }

      if (!isSupabaseConfigured()) {
        if (!silent && state.showToast) {
          state.showToast('코드 확인은 Supabase 연동 후 사용할 수 있습니다.');
        }
        return false;
      }

      try {
        var client = getClient();
        var result = await client.rpc('validate_referral_code', { p_code: code });
        if (result.error) throw result.error;

        var data = result.data;
        if (!data || !data.valid) {
          applied = null;
          this.setMessage((data && data.message) || '유효하지 않은 코드입니다.');
          this.updateDisplay();
          return false;
        }

        applied = {
          code: data.code,
          label: data.label,
          discount_type: data.discount_type,
          discount_value: data.discount_value
        };
        state.elInput.value = applied.code;

        var discountText = applied.discount_type === 'fixed'
          ? formatWon(applied.discount_value) + ' 할인'
          : applied.discount_value + '% 할인';
        this.setMessage(applied.label + ' · ' + discountText + ' 적용됨', 'ok');
        this.updateDisplay();
        return true;
      } catch (err) {
        applied = null;
        this.setMessage(err.message || '코드 확인에 실패했습니다.');
        this.updateDisplay();
        return false;
      }
    },

    clearCode: function () {
      applied = null;
      this.clearMessage();
      this.updateDisplay();
    },

    getApplied: function () {
      return applied;
    },

    getReferralCode: function () {
      return applied ? applied.code : null;
    },

    getReferrerValue: function () {
      if (!applied) return null;
      return applied.code + ' (' + applied.label + ')';
    },

    getFinalAmount: function () {
      var state = this._state;
      var base = state ? state.baseAmount : 0;
      return calculateDiscountedAmount(base, applied ? Object.assign({ valid: true }, applied) : null);
    },

    getBaseAmount: function () {
      return this._state ? this._state.baseAmount : 0;
    },

    validateBeforeSubmit: function () {
      var state = this._state;
      if (!state || !state.elInput) return true;

      var raw = state.elInput.value.trim();
      if (isNoneValue(raw)) return true;
      if (applied && normalizeCode(raw) === normalizeCode(applied.code)) return true;

      if (state.showToast) {
        state.showToast('할인코드 확인 버튼을 눌러 주세요.');
      } else {
        this.setMessage('할인코드 확인 버튼을 눌러 주세요.');
      }
      return false;
    },

    updateDisplay: function () {
      var state = this._state;
      if (!state) return;

      var finalAmount = this.getFinalAmount();
      var discount = Math.max(0, state.baseAmount - finalAmount);

      if (state.elTotal) {
        state.elTotal.textContent = formatWon(finalAmount);
      }

      if (state.elDiscountRow) {
        state.elDiscountRow.hidden = !(applied && discount > 0);
        var strong = state.elDiscountRow.querySelector('strong');
        if (strong) strong.textContent = '-' + formatWon(discount);
      }

      if (state.onAmountChange) {
        state.onAmountChange(finalAmount, applied);
      }
    },

    calculateDiscountedAmount: calculateDiscountedAmount,
    formatWon: formatWon
  };
})(window);
