(function () {
  var TABLE = 'referral_codes';
  var PAGE_SIZE = 10;
  var PAYMENT_LINK_BASE = 'https://stnmedia.kr/payment-regular.html?ref=';

  var allRows = [];
  var currentPage = 1;
  var editingRowId = null;

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

  function formatDateOnly(iso, emptyLabel) {
    if (!iso) return emptyLabel || '무기한';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ko-KR');
  }

  function formatUsage(row) {
    var used = Number(row.used_count) || 0;
    if (row.max_uses == null || row.max_uses === '') return used + ' / 무제한';
    return used + ' / ' + row.max_uses;
  }

  function toDateInputValue(iso) {
    if (!iso) return '';
    var text = String(iso);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function buildReferralPayload(values, options) {
    var opts = options || {};
    var code = values.code ? values.code.trim().toUpperCase() : '';
    var label = values.label ? values.label.trim() : '';
    var discountType = values.discount_type;
    var discountValue = Number(values.discount_value);
    var maxUsesRaw = values.max_uses != null ? String(values.max_uses).trim() : '';
    var maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
    var validFrom = values.valid_from || null;
    var validUntil = values.valid_until || null;
    var notes = values.notes ? values.notes.trim() : '';
    var usedCount = Number(opts.usedCount) || 0;

    if (!opts.skipCodeValidation) {
      if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
        return { error: '코드는 영문 대문자·숫자·_- 만 3~20자로 입력하세요.' };
      }
    }
    if (!label) {
      return { error: '추천인명을 입력하세요.' };
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { error: '할인 값을 확인하세요.' };
    }
    if (discountType === 'percent' && discountValue > 100) {
      return { error: '퍼센트 할인은 100 이하여야 합니다.' };
    }
    if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
      return { error: '최대 사용 횟수를 확인하세요.' };
    }
    if (maxUses != null && maxUses < usedCount) {
      return { error: '최대 사용 횟수는 현재 사용 횟수(' + usedCount + '회)보다 작을 수 없습니다.' };
    }
    if (validFrom && validUntil && validFrom > validUntil) {
      return { error: '시작일은 만료일보다 늦을 수 없습니다.' };
    }

    return {
      payload: {
        code: code || undefined,
        label: label,
        discount_type: discountType,
        discount_value: Math.round(discountValue),
        max_uses: maxUses,
        valid_from: validFrom ? validFrom + 'T00:00:00+09:00' : null,
        valid_until: validUntil ? validUntil + 'T23:59:59+09:00' : null,
        notes: notes || null,
        is_active: !!values.is_active
      }
    };
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

  function showEditFormMessage(text, type) {
    var el = document.getElementById('edit-form-message');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.className = 'form-message' + (type ? ' is-' + type : '');
  }

  function showTableMessage(text) {
    var tbody = document.getElementById('referrals-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">' + escapeHtml(text) + '</td></tr>';
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
          '<td>' + escapeHtml(formatDateOnly(row.valid_from, '즉시')) + '</td>' +
          '<td>' + escapeHtml(formatDateOnly(row.valid_until, '무기한')) + '</td>' +
          '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
          '<td class="table-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="' + escapeHtml(row.id) + '">수정</button>' +
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
        } else if (action === 'edit') {
          openEditModal(btn.getAttribute('data-id'));
        } else if (action === 'toggle') {
          toggleActive(btn.getAttribute('data-id'));
        }
      });
    });

    renderPagination();
  }

  function setRows(rows, keepPage) {
    allRows = rows.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    if (!keepPage) currentPage = 1;
    renderTable();
  }

  async function createReferral(payload) {
    var client = window.getSupabaseClient();
    var result = await client.from(TABLE).insert(payload).select().single();
    if (result.error) throw result.error;
    await loadRows();
  }

  async function updateReferral(id, payload) {
    var client = window.getSupabaseClient();
    var updatePayload = {
      label: payload.label,
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      max_uses: payload.max_uses,
      valid_from: payload.valid_from,
      valid_until: payload.valid_until,
      notes: payload.notes,
      is_active: payload.is_active
    };
    var result = await client.from(TABLE).update(updatePayload).eq('id', id);
    if (result.error) throw result.error;
    await loadRows(true);
  }

  async function toggleActive(id) {
    var row = allRows.find(function (r) { return String(r.id) === String(id); });
    if (!row) return;

    var client = window.getSupabaseClient();
    var result = await client
      .from(TABLE)
      .update({ is_active: !row.is_active })
      .eq('id', id);
    if (result.error) throw result.error;
    await loadRows(true);
  }

  function openEditModal(id) {
    var row = allRows.find(function (r) { return String(r.id) === String(id); });
    if (!row) return;

    editingRowId = row.id;
    showEditFormMessage('', '');

    document.getElementById('edit-id').value = row.id;
    document.getElementById('edit-code').value = row.code || '';
    document.getElementById('edit-used-count').value = String(Number(row.used_count) || 0) + '회';
    document.getElementById('edit-label').value = row.label || '';
    document.getElementById('edit-discount-type').value = row.discount_type || 'percent';
    document.getElementById('edit-discount-value').value = row.discount_value || '';
    document.getElementById('edit-max-uses').value = row.max_uses == null || row.max_uses === '' ? '' : row.max_uses;
    document.getElementById('edit-valid-from').value = toDateInputValue(row.valid_from);
    document.getElementById('edit-valid-until').value = toDateInputValue(row.valid_until);
    document.getElementById('edit-notes').value = row.notes || '';
    document.getElementById('edit-is-active').checked = !!row.is_active;

    var modal = document.getElementById('referral-edit-modal');
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('edit-label').focus();
  }

  function closeEditModal() {
    editingRowId = null;
    var modal = document.getElementById('referral-edit-modal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    showEditFormMessage('', '');
    var form = document.getElementById('referral-edit-form');
    if (form) form.reset();
  }

  function bindEditModal() {
    var modal = document.getElementById('referral-edit-modal');
    var form = document.getElementById('referral-edit-form');
    if (!modal || !form) return;

    modal.querySelectorAll('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', closeEditModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeEditModal();
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      showEditFormMessage('', '');

      if (!editingRowId) {
        showEditFormMessage('수정할 코드를 찾을 수 없습니다.', 'error');
        return;
      }

      var row = allRows.find(function (r) { return String(r.id) === String(editingRowId); });
      var parsed = buildReferralPayload({
        label: form.label.value,
        discount_type: form.discount_type.value,
        discount_value: form.discount_value.value,
        max_uses: form.max_uses.value,
        valid_from: form.valid_from.value || null,
        valid_until: form.valid_until.value || null,
        notes: form.notes.value,
        is_active: form.is_active.checked
      }, {
        skipCodeValidation: true,
        usedCount: row ? row.used_count : 0
      });

      if (parsed.error) {
        showEditFormMessage(parsed.error, 'error');
        return;
      }

      var submitBtn = document.getElementById('edit-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = '저장 중...';

      try {
        await updateReferral(editingRowId, parsed.payload);
        closeEditModal();
        showFormMessage('추천인 코드가 수정되었습니다.', 'ok');
      } catch (err) {
        showEditFormMessage(err.message || '수정에 실패했습니다.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
      }
    });

    window.stnAdminDatePicker.bind(modal);
  }

  async function loadRows(keepPage) {
    showTableMessage('데이터를 불러오는 중...');
    hidePagination();

    var client = window.getSupabaseClient();
    var result = await client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;
    setRows(result.data || [], keepPage);
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

      var parsed = buildReferralPayload({
        code: form.code.value,
        label: form.label.value,
        discount_type: form.discount_type.value,
        discount_value: form.discount_value.value,
        max_uses: form.max_uses.value,
        valid_from: form.valid_from.value || null,
        valid_until: form.valid_until.value || null,
        notes: form.notes.value,
        is_active: true
      });

      if (parsed.error) {
        showFormMessage(parsed.error, 'error');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '발급 중...';

      try {
        await createReferral(parsed.payload);
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

  window.stnAdminReferrals = {
    init: async function () {
      var session = await window.stnAdminShell.initAuth();
      if (!session) return;

      bindForm();
      bindEditModal();
      bindPagination();
      window.stnAdminDatePicker.bind();

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
