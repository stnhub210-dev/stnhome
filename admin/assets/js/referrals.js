(function () {
  var TABLE = 'referral_codes';
  var PAGE_SIZE = 10;
  var PAYMENT_LINK_BASE = 'https://stnmedia.kr/payment-regular.html?ref=';

  var demoRows = [
    { id: 'demo-1', code: 'STN10', label: '김강사', discount_type: 'percent', discount_value: 10, max_uses: null, used_count: 8, valid_until: '2026-12-31', is_active: true, notes: '강사 추천 기본 코드', created_at: '2026-05-01T10:00:00+09:00' },
    { id: 'demo-2', code: 'WELCOME50', label: '오픈 기념', discount_type: 'fixed', discount_value: 50000, max_uses: 100, used_count: 23, valid_until: '2026-08-31', is_active: true, notes: '', created_at: '2026-05-10T14:00:00+09:00' },
    { id: 'demo-3', code: 'VIP20', label: '박멘토', discount_type: 'percent', discount_value: 20, max_uses: 5, used_count: 5, valid_until: null, is_active: false, notes: '사용 완료', created_at: '2026-04-20T09:00:00+09:00' },
    { id: 'demo-4', code: 'STUDENT5', label: '학생 제휴', discount_type: 'percent', discount_value: 5, max_uses: 50, used_count: 12, valid_until: '2026-10-31', is_active: true, notes: '', created_at: '2026-05-15T11:30:00+09:00' },
    { id: 'demo-5', code: 'PARTNER100', label: '제휴사 A', discount_type: 'fixed', discount_value: 100000, max_uses: 20, used_count: 3, valid_until: '2026-09-30', is_active: true, notes: 'B2B 제휴', created_at: '2026-05-18T16:00:00+09:00' },
    { id: 'demo-6', code: 'LAUNCH15', label: '런칭 프로모', discount_type: 'percent', discount_value: 15, max_uses: null, used_count: 41, valid_until: null, is_active: true, notes: '', created_at: '2026-05-20T08:00:00+09:00' },
    { id: 'demo-7', code: 'OFFLINE30', label: '오프라인 박람회', discount_type: 'fixed', discount_value: 30000, max_uses: 30, used_count: 7, valid_until: '2026-07-31', is_active: true, notes: '', created_at: '2026-05-22T13:00:00+09:00' },
    { id: 'demo-8', code: 'TESTCODE', label: '테스트', discount_type: 'percent', discount_value: 1, max_uses: 1, used_count: 0, valid_until: '2026-06-30', is_active: false, notes: '비활성 테스트', created_at: '2026-05-25T10:00:00+09:00' },
    { id: 'demo-9', code: 'MEDIA7', label: '미디어팀', discount_type: 'percent', discount_value: 7, max_uses: null, used_count: 15, valid_until: null, is_active: true, notes: '', created_at: '2026-05-26T09:00:00+09:00' },
    { id: 'demo-10', code: 'FRIEND5', label: '지인 추천', discount_type: 'percent', discount_value: 5, max_uses: 200, used_count: 56, valid_until: '2026-12-31', is_active: true, notes: '', created_at: '2026-05-27T15:00:00+09:00' },
    { id: 'demo-11', code: 'SPECIAL200', label: '스페셜 VIP', discount_type: 'fixed', discount_value: 200000, max_uses: 3, used_count: 1, valid_until: '2026-11-30', is_active: true, notes: 'VIP 전용', created_at: '2026-05-28T11:00:00+09:00' }
  ];

  var allRows = [];
  var currentPage = 1;

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDiscount(row) {
    if (row.discount_type === 'fixed') {
      return Number(row.discount_value).toLocaleString('ko-KR') + '원';
    }
    return row.discount_value + '%';
  }

  function formatDateOnly(iso) {
    if (!iso) return '무기한';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ko-KR');
  }

  function formatUsage(row) {
    var used = Number(row.used_count) || 0;
    if (row.max_uses == null || row.max_uses === '') return used + ' / 무제한';
    return used + ' / ' + row.max_uses;
  }

  function generateCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'STN';
    for (var i = 0; i < 5; i += 1) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function showFormMessage(text, type) {
    var el = document.getElementById('form-message');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.className = 'form-message' + (type ? ' is-' + type : '');
  }

  function showTableMessage(text) {
    var tbody = document.getElementById('referrals-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">' + escapeHtml(text) + '</td></tr>';
    hidePagination();
  }

  function hidePagination() {
    var el = document.getElementById('referrals-pagination');
    if (el) el.hidden = true;
  }

  function getTotalPages() {
    return Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  }

  function getPageRows() {
    var start = (currentPage - 1) * PAGE_SIZE;
    return allRows.slice(start, start + PAGE_SIZE);
  }

  function buildPageList(totalPages, page) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, function (_, i) { return i + 1; });
    }
    var pages = [1];
    var start = Math.max(2, page - 1);
    var end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push('...');
    for (var p = start; p <= end; p += 1) pages.push(p);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  function renderPagination() {
    var pagination = document.getElementById('referrals-pagination');
    var numbers = document.getElementById('page-numbers');
    var prevBtn = document.getElementById('page-prev');
    var nextBtn = document.getElementById('page-next');
    if (!pagination || !numbers) return;

    var totalPages = getTotalPages();
    if (allRows.length <= PAGE_SIZE) {
      pagination.hidden = true;
      return;
    }

    pagination.hidden = false;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    numbers.innerHTML = buildPageList(totalPages, currentPage).map(function (item) {
      if (item === '...') return '<span class="page-ellipsis">...</span>';
      var active = item === currentPage ? ' is-active' : '';
      return '<button type="button" class="page-num' + active + '" data-page="' + item + '">' + item + '</button>';
    }).join('');

    numbers.querySelectorAll('[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goToPage(Number(btn.getAttribute('data-page')));
      });
    });
  }

  function goToPage(page) {
    currentPage = Math.min(Math.max(1, page), getTotalPages());
    renderTable();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function renderTable() {
    var tbody = document.getElementById('referrals-body');
    if (!tbody) return;

    if (!allRows.length) {
      showTableMessage('발급된 추천인 코드가 없습니다.');
      setText('list-meta', '0건');
      return;
    }

    setText('list-meta', allRows.length + '건');

    tbody.innerHTML = getPageRows().map(function (row) {
      var statusClass = row.is_active ? 'status-paid' : 'status-cancelled';
      var statusText = row.is_active ? '활성' : '비활성';
      var toggleLabel = row.is_active ? '비활성화' : '활성화';
      return (
        '<tr data-id="' + escapeHtml(row.id) + '">' +
          '<td><strong class="code-pill">' + escapeHtml(row.code) + '</strong></td>' +
          '<td>' + escapeHtml(row.label) + '</td>' +
          '<td>' + escapeHtml(formatDiscount(row)) + '</td>' +
          '<td>' + escapeHtml(formatUsage(row)) + '</td>' +
          '<td>' + escapeHtml(formatDateOnly(row.valid_until)) + '</td>' +
          '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
          '<td class="table-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="copy-code" data-code="' + escapeHtml(row.code) + '">코드</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="copy-link" data-code="' + escapeHtml(row.code) + '">링크</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="toggle" data-id="' + escapeHtml(row.id) + '">' + toggleLabel + '</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        if (action === 'copy-code') {
          copyText(btn.getAttribute('data-code')).then(function () {
            showFormMessage('코드가 복사되었습니다.', 'ok');
          });
        } else if (action === 'copy-link') {
          copyText(PAYMENT_LINK_BASE + encodeURIComponent(btn.getAttribute('data-code'))).then(function () {
            showFormMessage('결제 링크가 복사되었습니다.', 'ok');
          });
        } else if (action === 'toggle') {
          toggleActive(btn.getAttribute('data-id'));
        }
      });
    });

    renderPagination();
  }

  function setRows(rows) {
    allRows = rows.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    currentPage = 1;
    renderTable();
  }

  async function loadRows() {
    showTableMessage('데이터를 불러오는 중...');
    hidePagination();

    if (window.stnAdminAuth.isDemoSession()) {
      setRows(demoRows.slice());
      return;
    }

    var client = window.getSupabaseClient();
    var result = await client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;
    setRows(result.data || []);
  }

  async function createReferral(payload) {
    if (window.stnAdminAuth.isDemoSession()) {
      var exists = demoRows.some(function (r) {
        return r.code.toUpperCase() === payload.code.toUpperCase();
      });
      if (exists) throw new Error('이미 존재하는 코드입니다.');

      demoRows.unshift({
        id: 'demo-' + Date.now(),
        code: payload.code.toUpperCase(),
        label: payload.label,
        discount_type: payload.discount_type,
        discount_value: payload.discount_value,
        max_uses: payload.max_uses,
        used_count: 0,
        valid_until: payload.valid_until,
        is_active: true,
        notes: payload.notes || '',
        created_at: new Date().toISOString()
      });
      setRows(demoRows.slice());
      return;
    }

    var client = window.getSupabaseClient();
    var result = await client.from(TABLE).insert(payload).select().single();
    if (result.error) throw result.error;
    await loadRows();
  }

  async function toggleActive(id) {
    var row = allRows.find(function (r) { return String(r.id) === String(id); });
    if (!row) return;

    if (window.stnAdminAuth.isDemoSession()) {
      row.is_active = !row.is_active;
      setRows(demoRows.slice());
      return;
    }

    var client = window.getSupabaseClient();
    var result = await client
      .from(TABLE)
      .update({ is_active: !row.is_active })
      .eq('id', id);
    if (result.error) throw result.error;
    await loadRows();
  }

  function bindForm() {
    var form = document.getElementById('referral-form');
    var genBtn = document.getElementById('btn-gen-code');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        document.getElementById('ref-code').value = generateCode();
      });
    }

    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      showFormMessage('', '');

      var code = form.code.value.trim().toUpperCase();
      var label = form.label.value.trim();
      var discountType = form.discount_type.value;
      var discountValue = Number(form.discount_value.value);
      var maxUsesRaw = form.max_uses.value.trim();
      var maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
      var validUntil = form.valid_until.value || null;
      var notes = form.notes.value.trim();

      if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
        showFormMessage('코드는 영문 대문자·숫자·_- 만 3~20자로 입력하세요.', 'error');
        return;
      }
      if (!label) {
        showFormMessage('추천인명을 입력하세요.', 'error');
        return;
      }
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        showFormMessage('할인 값을 확인하세요.', 'error');
        return;
      }
      if (discountType === 'percent' && discountValue > 100) {
        showFormMessage('퍼센트 할인은 100 이하여야 합니다.', 'error');
        return;
      }
      if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
        showFormMessage('최대 사용 횟수를 확인하세요.', 'error');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '발급 중...';

      try {
        await createReferral({
          code: code,
          label: label,
          discount_type: discountType,
          discount_value: Math.round(discountValue),
          max_uses: maxUses,
          valid_until: validUntil ? validUntil + 'T23:59:59+09:00' : null,
          notes: notes || null,
          is_active: true
        });
        form.reset();
        showFormMessage('추천인 코드가 발급되었습니다.', 'ok');
      } catch (err) {
        showFormMessage(err.message || '발급에 실패했습니다.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '코드 발급';
      }
    });
  }

  function bindPagination() {
    var prevBtn = document.getElementById('page-prev');
    var nextBtn = document.getElementById('page-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { goToPage(currentPage - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goToPage(currentPage + 1); });
  }

  function showDemoBanner() {
    var banner = document.getElementById('demo-banner');
    if (banner && window.stnAdminAuth.isDemoSession()) banner.hidden = false;
  }

  window.stnAdminReferrals = {
    init: async function () {
      var session = await window.stnAdminAuth.requireAuth();
      if (!session) return;

      setText('admin-user-email', (session.user && session.user.email) || '관리자');
      showDemoBanner();
      bindForm();
      bindPagination();
      window.stnAdminAuth.bindLogout(document.getElementById('logout-btn'));

      var refreshBtn = document.getElementById('refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
          loadRows().catch(function (err) {
            showTableMessage('데이터 로드 실패: ' + (err.message || err));
          });
        });
      }

      await loadRows();
    }
  };
})();
