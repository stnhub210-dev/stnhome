(function () {
  var TABLE = 'payment_applications';
  var PAGE_SIZE = 10;

  var DEMO_ROWS = [
    { created_at: '2026-05-29T15:10:00+09:00', applicant_name: '정하은', applicant_phone: '010-2100-1101', program_name: '얼리버드 할인', amount: 1548000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260529-021', referrer: 'STN-EARLY10' },
    { created_at: '2026-05-29T13:25:00+09:00', applicant_name: '오준혁', applicant_phone: '010-2100-1102', program_name: '대학생 할인', amount: 990000, pay_method: '계좌이체', status: 'pending', order_id: 'STN-20260529-020', referrer: null },
    { created_at: '2026-05-29T11:40:00+09:00', applicant_name: '한지우', applicant_phone: '010-2100-1103', program_name: '일반 결제', amount: 1980000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260529-019', referrer: '추천인 없음' },
    { created_at: '2026-05-28T18:55:00+09:00', applicant_name: '김민수', applicant_phone: '010-1234-5678', program_name: '얼리버드 할인', amount: 1548000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260528-001', referrer: 'KIM2024' },
    { created_at: '2026-05-28T16:20:00+09:00', applicant_name: '윤서준', applicant_phone: '010-2100-1104', program_name: '일반 결제', amount: 1980000, pay_method: '계좌이체', status: 'failed', order_id: 'STN-20260528-018', referrer: null },
    { created_at: '2026-05-28T14:05:00+09:00', applicant_name: '배수아', applicant_phone: '010-2100-1105', program_name: '대학생 할인', amount: 990000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260528-017', referrer: 'YOUTUBE5' },
    { created_at: '2026-05-27T11:05:00+09:00', applicant_name: '이서연', applicant_phone: '010-9876-5432', program_name: '대학생 할인', amount: 990000, pay_method: '계좌이체', status: 'pending', order_id: 'STN-20260527-014', referrer: null },
    { created_at: '2026-05-27T09:30:00+09:00', applicant_name: '장도윤', applicant_phone: '010-2100-1106', program_name: '얼리버드 할인', amount: 1548000, pay_method: '신용카드', status: 'cancelled', order_id: 'STN-20260527-016', referrer: 'STN-EARLY10' },
    { created_at: '2026-05-26T20:15:00+09:00', applicant_name: '신예린', applicant_phone: '010-2100-1107', program_name: '일반 결제', amount: 1980000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260526-015', referrer: '추천인 없음' },
    { created_at: '2026-05-26T09:40:00+09:00', applicant_name: '박지훈', applicant_phone: '010-5555-1212', program_name: '일반 결제', amount: 1980000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260526-008', referrer: 'PARK15' },
    { created_at: '2026-05-25T17:50:00+09:00', applicant_name: '최유진', applicant_phone: '010-2100-1108', program_name: '얼리버드 할인', amount: 1548000, pay_method: '계좌이체', status: 'pending', order_id: 'STN-20260525-013', referrer: null },
    { created_at: '2026-05-25T10:20:00+09:00', applicant_name: '임태양', applicant_phone: '010-2100-1109', program_name: '대학생 할인', amount: 990000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260525-012', referrer: 'STUDENT10' },
    { created_at: '2026-05-24T14:35:00+09:00', applicant_name: '송민재', applicant_phone: '010-2100-1110', program_name: '일반 결제', amount: 1980000, pay_method: '신용카드', status: 'paid', order_id: 'STN-20260524-011', referrer: null },
    { created_at: '2026-05-23T11:10:00+09:00', applicant_name: '강하늘', applicant_phone: '010-2100-1111', program_name: '얼리버드 할인', amount: 1548000, pay_method: '계좌이체', status: 'paid', order_id: 'STN-20260523-010', referrer: 'KIM2024' },
    { created_at: '2026-05-22T08:45:00+09:00', applicant_name: '노지안', applicant_phone: '010-2100-1112', program_name: '대학생 할인', amount: 990000, pay_method: '신용카드', status: 'pending', order_id: 'STN-20260522-009', referrer: '추천인 없음' }
  ];

  var sourceRows = [];
  var allRows = [];
  var currentPage = 1;
  var activeFilters = {
    name: '',
    phoneSuffix: '',
    status: '',
    referrer: '',
    referrerText: '',
    dateFrom: '',
    dateTo: ''
  };

  function formatWon(n) {
    var num = Number(n);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString('ko-KR') + '원';
  }

  function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function statusLabel(status) {
    var map = {
      pending: '대기',
      paid: '결제완료',
      failed: '실패',
      cancelled: '취소'
    };
    return map[status] || status || '-';
  }

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

  function phoneDigits(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function hasReferrerValue(referrer) {
    var value = String(referrer || '').trim();
    if (!value || value === '-' || value === '추천인 없음') return false;
    return true;
  }

  function renderReferrerCell(referrer) {
    if (!hasReferrerValue(referrer)) {
      return '<span class="referrer-badge none">없음</span>';
    }
    return '<span class="referrer-badge has">' + escapeHtml(referrer) + '</span>';
  }

  function rowDateKey(iso) {
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function readFiltersFromForm() {
    var nameEl = document.getElementById('filter-name');
    var phoneEl = document.getElementById('filter-phone-suffix');
    var statusEl = document.getElementById('filter-status');
    var referrerEl = document.getElementById('filter-referrer');
    var referrerTextEl = document.getElementById('filter-referrer-text');
    var fromEl = document.getElementById('filter-date-from');
    var toEl = document.getElementById('filter-date-to');

    return {
      name: (nameEl && nameEl.value.trim()) || '',
      phoneSuffix: (phoneEl && phoneEl.value.replace(/\D/g, '')) || '',
      status: (statusEl && statusEl.value) || '',
      referrer: (referrerEl && referrerEl.value) || '',
      referrerText: (referrerTextEl && referrerTextEl.value.trim()) || '',
      dateFrom: (fromEl && fromEl.value) || '',
      dateTo: (toEl && toEl.value) || ''
    };
  }

  function hasActiveFilters(filters) {
    return !!(
      filters.name ||
      filters.phoneSuffix ||
      filters.status ||
      filters.referrer ||
      filters.referrerText ||
      filters.dateFrom ||
      filters.dateTo
    );
  }

  function matchesFilters(row, filters) {
    if (filters.name) {
      var name = String(row.applicant_name || '');
      if (name.indexOf(filters.name) === -1) return false;
    }

    if (filters.phoneSuffix) {
      var digits = phoneDigits(row.applicant_phone);
      if (!digits || digits.slice(-filters.phoneSuffix.length) !== filters.phoneSuffix) {
        return false;
      }
    }

    if (filters.status && row.status !== filters.status) {
      return false;
    }

    var hasReferrer = hasReferrerValue(row.referrer);
    if (filters.referrer === 'has' && !hasReferrer) return false;
    if (filters.referrer === 'none' && hasReferrer) return false;

    if (filters.referrerText) {
      var referrerValue = String(row.referrer || '');
      if (referrerValue.toLowerCase().indexOf(filters.referrerText.toLowerCase()) === -1) {
        return false;
      }
    }

    var dateKey = rowDateKey(row.created_at);
    if (filters.dateFrom && (!dateKey || dateKey < filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && (!dateKey || dateKey > filters.dateTo)) {
      return false;
    }

    return true;
  }

  function applyFilters() {
    activeFilters = readFiltersFromForm();

    if (activeFilters.dateFrom && activeFilters.dateTo && activeFilters.dateFrom > activeFilters.dateTo) {
      showTableMessage('시작일은 종료일보다 늦을 수 없습니다.');
      updateFilterResult(0, true);
      hidePagination();
      updateStats([]);
      return false;
    }

    allRows = sourceRows.filter(function (row) {
      return matchesFilters(row, activeFilters);
    });

    currentPage = 1;
    updateStats(allRows);
    updateFilterResult(allRows.length, false);
    renderRows();
    return true;
  }

  function updateFilterResult(count, isError) {
    var el = document.getElementById('filter-result-text');
    if (!el) return;

    if (isError) {
      el.hidden = false;
      el.innerHTML = '<span style="color:var(--err)">기간 조건을 확인해 주세요.</span>';
      return;
    }

    if (!hasActiveFilters(activeFilters)) {
      el.hidden = true;
      el.textContent = '';
      return;
    }

    el.hidden = false;
    el.innerHTML = '검색 결과 <strong>' + count.toLocaleString('ko-KR') + '</strong>건 (전체 ' + sourceRows.length.toLocaleString('ko-KR') + '건)';
  }

  function resetFilters() {
    var form = document.getElementById('applications-filter');
    if (form) form.reset();

    activeFilters = {
      name: '',
      phoneSuffix: '',
      status: '',
      referrer: '',
      referrerText: '',
      dateFrom: '',
      dateTo: ''
    };

    allRows = sourceRows.slice();
    currentPage = 1;
    updateStats(allRows);
    updateFilterResult(0, false);
    renderRows();
  }

  function showTableMessage(text) {
    var tbody = document.getElementById('applications-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty">' + text + '</td></tr>';
    hidePagination();
  }

  function hidePagination() {
    var pagination = document.getElementById('applications-pagination');
    if (pagination) pagination.hidden = true;
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
    var pagination = document.getElementById('applications-pagination');
    var numbers = document.getElementById('page-numbers');
    var prevBtn = document.getElementById('page-prev');
    var nextBtn = document.getElementById('page-next');
    if (!pagination || !numbers || !prevBtn || !nextBtn) return;

    var totalPages = getTotalPages();
    if (allRows.length <= PAGE_SIZE) {
      pagination.hidden = true;
      return;
    }

    pagination.hidden = false;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    numbers.innerHTML = buildPageList(totalPages, currentPage).map(function (item) {
      if (item === '...') {
        return '<span class="page-ellipsis">...</span>';
      }
      var active = item === currentPage ? ' is-active' : '';
      return '<button type="button" class="page-num' + active + '" data-page="' + item + '">' + item + '</button>';
    }).join('');

    numbers.querySelectorAll('[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goToPage(Number(btn.getAttribute('data-page')));
      });
    });
  }

  function renderRows() {
    var tbody = document.getElementById('applications-body');
    if (!tbody) return;

    if (!sourceRows.length) {
      showTableMessage('등록된 신청 내역이 없습니다.');
      return;
    }

    if (!allRows.length) {
      showTableMessage('조건에 맞는 신청 내역이 없습니다.');
      return;
    }

    var rows = getPageRows();
    tbody.innerHTML = rows.map(function (row) {
      return (
        '<tr>' +
          '<td>' + formatDate(row.created_at) + '</td>' +
          '<td>' + escapeHtml(row.applicant_name || '-') + '</td>' +
          '<td>' + escapeHtml(row.applicant_phone || '-') + '</td>' +
          '<td>' + escapeHtml(row.program_name || row.tier || '-') + '</td>' +
          '<td>' + formatWon(row.amount) + '</td>' +
          '<td>' + escapeHtml(row.pay_method || '-') + '</td>' +
          '<td>' + renderReferrerCell(row.referrer) + '</td>' +
          '<td><span class="status-badge status-' + escapeHtml(row.status || 'pending') + '">' + statusLabel(row.status) + '</span></td>' +
          '<td class="mono">' + escapeHtml(row.order_id || '-') + '</td>' +
        '</tr>'
      );
    }).join('');

    renderPagination();
  }

  function goToPage(page) {
    var totalPages = getTotalPages();
    currentPage = Math.min(Math.max(1, page), totalPages);
    renderRows();
  }

  function updateStats(rows) {
    var total = rows.length;
    var paid = rows.filter(function (r) { return r.status === 'paid'; }).length;
    var pending = rows.filter(function (r) { return r.status === 'pending'; }).length;
    var amount = rows.reduce(function (sum, r) {
      return sum + (r.status === 'paid' ? Number(r.amount) || 0 : 0);
    }, 0);

    setText('stat-total', String(total));
    setText('stat-paid', String(paid));
    setText('stat-pending', String(pending));
    setText('stat-amount', formatWon(amount));
  }

  function showDemoBanner() {
    var banner = document.getElementById('demo-banner');
    if (!banner) return;
    if (window.stnAdminAuth.isDemoSession()) {
      banner.hidden = false;
    }
  }

  function bindPaginationControls() {
    var prevBtn = document.getElementById('page-prev');
    var nextBtn = document.getElementById('page-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goToPage(currentPage - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goToPage(currentPage + 1);
      });
    }
  }

  function bindFilterControls() {
    var form = document.getElementById('applications-filter');
    var resetBtn = document.getElementById('filter-reset');
    var phoneEl = document.getElementById('filter-phone-suffix');

    if (phoneEl) {
      phoneEl.addEventListener('input', function () {
        phoneEl.value = phoneEl.value.replace(/\D/g, '').slice(0, 4);
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        applyFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetFilters();
      });
    }
  }

  function setApplications(rows) {
    sourceRows = rows.slice();
    allRows = rows.slice();
    currentPage = 1;
    activeFilters = {
      name: '',
      phoneSuffix: '',
      status: '',
      referrer: '',
      referrerText: '',
      dateFrom: '',
      dateTo: ''
    };

    var form = document.getElementById('applications-filter');
    if (form) form.reset();

    updateStats(allRows);
    updateFilterResult(0, false);
    renderRows();
  }

  async function loadApplications() {
    showTableMessage('데이터를 불러오는 중...');
    hidePagination();

    if (window.stnAdminAuth.isDemoSession()) {
      setApplications(DEMO_ROWS.slice());
      return;
    }

    var client = window.getSupabaseClient();
    var result = await client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (result.error) throw result.error;
    setApplications(result.data || []);
  }

  window.stnAdminDashboard = {
    init: async function () {
      var session = await window.stnAdminAuth.requireAuth();
      if (!session) return;

      var userEmail = session.user && session.user.email;
      setText('admin-user-email', userEmail || '관리자');
      showDemoBanner();
      bindPaginationControls();
      bindFilterControls();
      window.stnAdminDatePicker.bind();
      window.stnAdminAuth.bindLogout(document.getElementById('logout-btn'));

      var refreshBtn = document.getElementById('refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
          var hadFilters = hasActiveFilters(activeFilters);
          var savedFilters = hadFilters ? Object.assign({}, activeFilters) : null;

          loadApplications()
            .then(function () {
              if (!savedFilters) return;

              var nameEl = document.getElementById('filter-name');
              var phoneEl = document.getElementById('filter-phone-suffix');
              var statusEl = document.getElementById('filter-status');
              var referrerEl = document.getElementById('filter-referrer');
              var referrerTextEl = document.getElementById('filter-referrer-text');
              var fromEl = document.getElementById('filter-date-from');
              var toEl = document.getElementById('filter-date-to');

              if (nameEl) nameEl.value = savedFilters.name;
              if (phoneEl) phoneEl.value = savedFilters.phoneSuffix;
              if (statusEl) statusEl.value = savedFilters.status;
              if (referrerEl) referrerEl.value = savedFilters.referrer;
              if (referrerTextEl) referrerTextEl.value = savedFilters.referrerText;
              if (fromEl) fromEl.value = savedFilters.dateFrom;
              if (toEl) toEl.value = savedFilters.dateTo;

              applyFilters();
            })
            .catch(function (err) {
              showTableMessage('데이터 로드 실패: ' + (err.message || err));
            });
        });
      }

      try {
        await loadApplications();
      } catch (err) {
        showTableMessage('데이터 로드 실패: ' + (err.message || err));
      }
    }
  };
})();
