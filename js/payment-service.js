/**
 * 결제 신청 저장 · 이름+연락처 조회 · 추천인 코드 사용 집계
 * Supabase 연동 시 DB 저장, 미연동 시 localStorage 사용
 */
(function (global) {
  var STORAGE_KEY = 'stn_payment_records';
  var PENDING_KEY = 'stnPaymentPending';
  var TABLE = 'payment_applications';

  function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

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

  function readLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocal(rows) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 300)));
    } catch (_) {}
  }

  function generateOrderId(prefix) {
    var p = prefix || 'STN';
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return p + '-' + y + m + d + '-' + r;
  }

  function mapStatusForPayMethod(payMethod) {
    if (payMethod === 'card') return 'paid';
    return 'pending';
  }

  async function incrementReferralUsage(referralCode) {
    if (!referralCode || !isSupabaseConfigured()) return;
    try {
      var client = getClient();
      var result = await client.rpc('increment_referral_usage', { p_code: referralCode });
      if (result.error) throw result.error;
      if (result.data && result.data.ok === false) {
        console.warn('추천인 코드 사용 집계 실패:', result.data.message);
      }
    } catch (err) {
      console.warn('추천인 코드 사용 집계 오류:', err);
    }
  }

  function looksEncryptedText(value) {
    var text = String(value || '').trim();
    return text.length >= 16 && /^[A-Za-z0-9+/=]+$/.test(text);
  }

  function cleanApplicantName(name, fallback) {
    var value = String(name || '').trim();
    if (!value || value === '-' || looksEncryptedText(value)) {
      return String(fallback || '').trim() || '-';
    }
    return value;
  }

  async function savePayment(record) {
    var payload = {
      order_id: String(record.order_id || '').trim(),
      applicant_name: cleanApplicantName(record.applicant_name, record.applicant_name_fallback),
      applicant_phone: normalizePhone(record.applicant_phone),
      applicant_email: record.applicant_email || null,
      referrer: record.referrer || null,
      program_name: record.program_name || 'STN 스킬업 양성과정',
      tier: record.tier || null,
      amount: Number(record.amount) || 0,
      pay_method: record.pay_method || null,
      status: record.status || 'pending',
      notes: record.notes || null,
      created_at: record.created_at || new Date().toISOString()
    };

    if (!payload.order_id) {
      throw new Error('order_id가 없습니다.');
    }

    var local = readLocal();
    local.unshift(payload);
    writeLocal(local);

    if (isSupabaseConfigured()) {
      try {
        var client = getClient();
        var rpcResult = await client.rpc('save_payment_application', {
          p_order_id: payload.order_id,
          p_applicant_name: payload.applicant_name,
          p_applicant_phone: payload.applicant_phone,
          p_applicant_email: payload.applicant_email,
          p_referrer: payload.referrer,
          p_program_name: payload.program_name,
          p_tier: payload.tier,
          p_amount: payload.amount,
          p_pay_method: payload.pay_method,
          p_status: payload.status,
          p_notes: payload.notes
        });

        if (rpcResult.error) {
          var directResult = await client.from(TABLE).insert({
            order_id: payload.order_id,
            applicant_name: payload.applicant_name,
            applicant_phone: payload.applicant_phone || null,
            applicant_email: payload.applicant_email,
            referrer: payload.referrer,
            program_name: payload.program_name,
            tier: payload.tier,
            amount: payload.amount,
            pay_method: payload.pay_method,
            status: payload.status,
            notes: payload.notes
          });
          if (directResult.error) throw directResult.error;
        } else if (rpcResult.data && rpcResult.data.ok === false) {
          throw new Error(rpcResult.data.message || '결제 저장에 실패했습니다.');
        }

        if (record.referral_code) {
          await incrementReferralUsage(record.referral_code);
        }
      } catch (err) {
        console.warn('Supabase 저장 실패, localStorage에만 저장됨:', err);
        throw err;
      }
    }

    return payload;
  }

  async function lookupPayments(name, phone) {
    var trimmedName = String(name || '').trim();
    var normalizedPhone = normalizePhone(phone);

    if (!trimmedName || normalizedPhone.length < 10) {
      return [];
    }

    if (isSupabaseConfigured()) {
      try {
        var client = getClient();
        var result = await client.rpc('lookup_payment', {
          p_name: trimmedName,
          p_phone: normalizedPhone
        });
        if (!result.error && result.data) return result.data;
        if (result.error) {
          console.warn('Supabase 조회 오류:', result.error);
        }
      } catch (err) {
        console.warn('Supabase 조회 실패, localStorage 조회로 대체:', err);
      }
    }

    return readLocal().filter(function (row) {
      return (
        String(row.applicant_name || '').trim() === trimmedName &&
        normalizePhone(row.applicant_phone) === normalizedPhone
      );
    });
  }

  function savePending(data) {
    try {
      var raw = JSON.stringify(data);
      localStorage.setItem(PENDING_KEY, raw);
      sessionStorage.setItem(PENDING_KEY, raw);
    } catch (_) {}
  }

  function readPending() {
    try {
      var raw = localStorage.getItem(PENDING_KEY) || sessionStorage.getItem(PENDING_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearPending() {
    try {
      localStorage.removeItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
  }

  function formatPhoneInput(value) {
    var digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + '-' + digits.slice(3);
    return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);
  }

  function applyPhoneFormat(input) {
    if (!input) return;
    var start = input.selectionStart;
    var before = input.value;
    var formatted = formatPhoneInput(before);
    input.value = formatted;
    if (start == null) return;
    var diff = formatted.length - before.length;
    var nextPos = Math.max(0, Math.min(formatted.length, start + diff));
    try {
      input.setSelectionRange(nextPos, nextPos);
    } catch (_) {}
  }

  function bindPhoneFormat(input, onAfter) {
    if (!input) return;
    function after() {
      if (typeof onAfter === 'function') onAfter();
    }
    input.addEventListener('input', function () {
      applyPhoneFormat(input);
      after();
    });
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text');
      input.value = formatPhoneInput(text);
      after();
    });
  }

  global.STNPaymentService = {
    PENDING_KEY: PENDING_KEY,
    normalizePhone: normalizePhone,
    formatPhoneInput: formatPhoneInput,
    applyPhoneFormat: applyPhoneFormat,
    bindPhoneFormat: bindPhoneFormat,
    generateOrderId: generateOrderId,
    mapStatusForPayMethod: mapStatusForPayMethod,
    savePayment: savePayment,
    lookupPayments: lookupPayments,
    savePending: savePending,
    readPending: readPending,
    clearPending: clearPending,
    incrementReferralUsage: incrementReferralUsage
  };
})(window);
