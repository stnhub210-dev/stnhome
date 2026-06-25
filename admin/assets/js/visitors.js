(function () {
  var TABLE = 'page_views';
  var PAGE_SIZE = 10;

  var DEMO_VIEWS = [
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v1', referrer: 'https://www.google.com/', user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Chrome/120.0.0.0 Mobile Safari/537.36', created_at: '2026-05-29T10:12:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v2', referrer: 'https://www.naver.com/', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36', created_at: '2026-05-29T09:40:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v3', referrer: '', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', created_at: '2026-05-29T08:55:00+09:00' },
    { page_path: '/curriculum.html', page_title: '교육 커리큘럼', visitor_id: 'v4', referrer: 'https://stnmedia.kr/start.html', user_agent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36', created_at: '2026-05-28T22:10:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v1', referrer: 'https://www.youtube.com/', user_agent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', created_at: '2026-05-28T20:30:00+09:00' },
    { page_path: '/score.html', page_title: '유튜브 채널 점수 진단', visitor_id: 'v5', referrer: 'https://search.naver.com/', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', created_at: '2026-05-28T18:05:00+09:00' },
    { page_path: '/payment-earlybird.html', page_title: '얼리버드 결제', visitor_id: 'v6', referrer: 'https://stnmedia.kr/start.html', user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', created_at: '2026-05-28T15:20:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v7', referrer: 'https://www.instagram.com/', user_agent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36', created_at: '2026-05-28T11:00:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v8', referrer: 'https://www.google.com/', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/124.0.0.0', created_at: '2026-05-27T16:45:00+09:00' },
    { page_path: '/curriculum.html', page_title: '교육 커리큘럼', visitor_id: 'v2', referrer: 'https://stnmedia.kr/', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36', created_at: '2026-05-27T14:30:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v9', referrer: '', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36', created_at: '2026-05-27T09:15:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v10', referrer: 'https://blog.naver.com/example', user_agent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36', created_at: '2026-05-26T21:00:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v11', referrer: 'https://www.google.com/', user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', created_at: '2026-05-26T13:40:00+09:00' },
    { page_path: '/score.html', page_title: '유튜브 채널 점수 진단', visitor_id: 'v3', referrer: 'https://stnmedia.kr/start.html', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36', created_at: '2026-05-25T19:20:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v12', referrer: 'https://www.naver.com/', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', created_at: '2026-05-25T10:05:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v13', referrer: 'https://www.youtube.com/', user_agent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36', created_at: '2026-05-24T17:50:00+09:00' },
    { page_path: '/curriculum.html', page_title: '교육 커리큘럼', visitor_id: 'v14', referrer: 'https://search.daum.net/', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', created_at: '2026-05-24T12:30:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v15', referrer: '', user_agent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', created_at: '2026-05-23T08:20:00+09:00' },
    { page_path: '/payment-earlybird.html', page_title: '얼리버드 결제', visitor_id: 'v16', referrer: 'https://stnmedia.kr/curriculum.html', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36', created_at: '2026-05-22T14:10:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v17', referrer: 'https://www.google.com/', user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', created_at: '2026-05-21T11:35:00+09:00' },
    { page_path: '/score.html', page_title: '유튜브 채널 점수 진단', visitor_id: 'v18', referrer: 'https://www.naver.com/', user_agent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/121.0.0.0 Mobile Safari/537.36', created_at: '2026-05-20T09:50:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v19', referrer: 'https://t.co/example', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36', created_at: '2026-05-19T18:25:00+09:00' },
    { page_path: '/curriculum.html', page_title: '교육 커리큘럼', visitor_id: 'v20', referrer: 'https://stnmedia.kr/start.html', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/124.0.0.0', created_at: '2026-05-18T16:00:00+09:00' }
  ];

  var allRows = [];
  var currentPage = 1;
  var chartPeriod = 'week';
  var chartDaysWeek = [];
  var chartDaysMonth = [];

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function startOfDay(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function isSameDay(a, b) {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
  }

  function dayKey(d) {
    var x = new Date(d);
    var m = String(x.getMonth() + 1).padStart(2, '0');
    var day = String(x.getDate()).padStart(2, '0');
    return x.getFullYear() + '-' + m + '-' + day;
  }

  function formatDateLabel(key, compact) {
    var parts = key.split('-');
    if (compact) return Number(parts[2]) + '일';
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseDevice(ua) {
    if (!ua) return '-';
    var lower = String(ua).toLowerCase();
    var device = 'PC';
    if (/ipad|tablet|kindle|playbook/.test(lower)) device = '태블릿';
    else if (/mobile|android|iphone|ipod|phone/.test(lower)) device = '모바일';

    var browser = '기타';
    if (lower.indexOf('edg/') !== -1) browser = 'Edge';
    else if (lower.indexOf('chrome/') !== -1) browser = 'Chrome';
    else if (lower.indexOf('firefox/') !== -1) browser = 'Firefox';
    else if (lower.indexOf('safari/') !== -1) browser = 'Safari';

    return device + ' · ' + browser;
  }

  function formatReferrer(ref) {
    var value = String(ref || '').trim();
    if (!value) return '직접 입력';
    try {
      var url = new URL(value);
      var host = url.hostname.replace(/^www\./, '');
      if (host === location.hostname.replace(/^www\./, '')) {
        var path = url.pathname || '/';
        return '내부: ' + path;
      }
      return host;
    } catch (_) {
      return value.length > 48 ? value.slice(0, 48) + '…' : value;
    }
  }

  function buildChartDays(byDay, daysCount, compactLabels) {
    var todayStart = startOfDay(new Date());
    var days = [];
    for (var i = daysCount - 1; i >= 0; i -= 1) {
      var d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      var k = dayKey(d);
      days.push({
        key: k,
        label: formatDateLabel(k, compactLabels),
        count: byDay[k] || 0
      });
    }
    return days;
  }

  function aggregate(rows) {
    var now = new Date();
    var todayStart = startOfDay(now);
    var weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    var monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 29);

    var today = 0;
    var week = 0;
    var month = 0;
    var visitorsToday = {};
    var visitorsWeek = {};
    var visitorsMonth = {};
    var byDay = {};

    rows.forEach(function (row) {
      var at = new Date(row.created_at);
      if (Number.isNaN(at.getTime())) return;

      if (at >= monthStart) {
        month += 1;
        if (row.visitor_id) visitorsMonth[row.visitor_id] = true;
        var key = dayKey(at);
        byDay[key] = (byDay[key] || 0) + 1;
      }

      if (at >= weekStart) {
        week += 1;
        if (row.visitor_id) visitorsWeek[row.visitor_id] = true;
      }

      if (isSameDay(at, now)) {
        today += 1;
        if (row.visitor_id) visitorsToday[row.visitor_id] = true;
      }
    });

    var sorted = rows.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return {
      today: today,
      week: week,
      month: month,
      uniqueToday: Object.keys(visitorsToday).length,
      uniqueWeek: Object.keys(visitorsWeek).length,
      uniqueMonth: Object.keys(visitorsMonth).length,
      chartDaysWeek: buildChartDays(byDay, 7, false),
      chartDaysMonth: buildChartDays(byDay, 30, true),
      allRows: sorted
    };
  }

  function renderChart(days, period) {
    var wrap = document.getElementById('visitor-chart');
    if (!wrap) return;

    wrap.classList.toggle('is-month', period === 'month');

    if (!days.length) {
      wrap.innerHTML = '<p class="table-empty" style="grid-column:1/-1;">데이터가 없습니다.</p>';
      return;
    }

    var max = Math.max.apply(null, days.map(function (d) { return d.count; }).concat([1]));

    wrap.innerHTML = days.map(function (d) {
      var h = Math.round((d.count / max) * 100);
      return (
        '<div class="chart-col">' +
          '<div class="chart-bar-wrap">' +
            '<div class="chart-bar" style="height:' + h + '%" title="' + d.count + '회"></div>' +
          '</div>' +
          '<span class="chart-label">' + escapeHtml(d.label) + '</span>' +
          '<span class="chart-value">' + d.count + '</span>' +
        '</div>'
      );
    }).join('');
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

  function hidePagination() {
    var pagination = document.getElementById('visits-pagination');
    if (pagination) pagination.hidden = true;
  }

  function renderPagination() {
    var pagination = document.getElementById('visits-pagination');
    var numbers = document.getElementById('visits-page-numbers');
    var prevBtn = document.getElementById('visits-page-prev');
    var nextBtn = document.getElementById('visits-page-next');
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

  function renderRecent() {
    var tbody = document.getElementById('recent-views-body');
    if (!tbody) return;

    if (!allRows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">데이터가 없습니다.</td></tr>';
      hidePagination();
      return;
    }

    var rows = getPageRows();
    tbody.innerHTML = rows.map(function (row) {
      var at = new Date(row.created_at);
      var time = Number.isNaN(at.getTime())
        ? '-'
        : at.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      var referrerTitle = row.referrer ? escapeHtml(row.referrer) : '직접 입력 또는 북마크';

      return (
        '<tr>' +
          '<td>' + escapeHtml(time) + '</td>' +
          '<td class="mono">' + escapeHtml(row.page_path || '/') + '</td>' +
          '<td>' + escapeHtml(row.page_title || '-') + '</td>' +
          '<td>' + escapeHtml(parseDevice(row.user_agent)) + '</td>' +
          '<td title="' + referrerTitle + '">' + escapeHtml(formatReferrer(row.referrer)) + '</td>' +
          '<td class="mono">' + escapeHtml(row.visitor_id || '-') + '</td>' +
        '</tr>'
      );
    }).join('');

    renderPagination();
  }

  function goToPage(page) {
    var totalPages = getTotalPages();
    currentPage = Math.min(Math.max(1, page), totalPages);
    renderRecent();
  }

  function setChartPeriod(period) {
    chartPeriod = period === 'month' ? 'month' : 'week';

    var weekBtn = document.getElementById('chart-period-week');
    var monthBtn = document.getElementById('chart-period-month');
    if (weekBtn && monthBtn) {
      weekBtn.classList.toggle('is-active', chartPeriod === 'week');
      monthBtn.classList.toggle('is-active', chartPeriod === 'month');
      weekBtn.setAttribute('aria-selected', chartPeriod === 'week' ? 'true' : 'false');
      monthBtn.setAttribute('aria-selected', chartPeriod === 'month' ? 'true' : 'false');
    }

    renderChart(chartPeriod === 'month' ? chartDaysMonth : chartDaysWeek, chartPeriod);
  }

  function renderStats(stats) {
    setText('stat-views-today', stats.today.toLocaleString('ko-KR'));
    setText('stat-views-week', stats.week.toLocaleString('ko-KR'));
    setText('stat-views-month', stats.month.toLocaleString('ko-KR'));
    setText('stat-unique-today', stats.uniqueToday.toLocaleString('ko-KR'));
    setText('stat-unique-week', stats.uniqueWeek.toLocaleString('ko-KR'));
    setText('stat-unique-month', stats.uniqueMonth.toLocaleString('ko-KR'));

    chartDaysWeek = stats.chartDaysWeek;
    chartDaysMonth = stats.chartDaysMonth;
    allRows = stats.allRows;
    currentPage = 1;

    setChartPeriod(chartPeriod);
    renderRecent();
  }

  function showDemoBanner() {
    var banner = document.getElementById('demo-banner');
    if (banner && window.stnAdminAuth.isDemoSession()) banner.hidden = false;
  }

  function bindPaginationControls() {
    var prevBtn = document.getElementById('visits-page-prev');
    var nextBtn = document.getElementById('visits-page-next');
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

  function bindChartPeriodTabs() {
    var weekBtn = document.getElementById('chart-period-week');
    var monthBtn = document.getElementById('chart-period-month');
    if (weekBtn) weekBtn.addEventListener('click', function () { setChartPeriod('week'); });
    if (monthBtn) monthBtn.addEventListener('click', function () { setChartPeriod('month'); });
  }

  async function loadViews() {
    if (window.stnAdminAuth.isDemoSession()) {
      renderStats(aggregate(DEMO_VIEWS));
      return;
    }

    var client = window.getSupabaseClient();
    var since = new Date();
    since.setDate(since.getDate() - 60);

    var result = await client
      .from(TABLE)
      .select('page_path,page_title,visitor_id,referrer,user_agent,created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000);

    if (result.error) throw result.error;
    renderStats(aggregate(result.data || []));
  }

  window.stnAdminVisitors = {
    init: async function () {
      var session = await window.stnAdminAuth.requireAuth();
      if (!session) return;

      setText('admin-user-email', (session.user && session.user.email) || '관리자');
      showDemoBanner();
      window.stnAdminAuth.bindLogout(document.getElementById('logout-btn'));
      bindPaginationControls();
      bindChartPeriodTabs();

      var refreshBtn = document.getElementById('refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
          loadViews().catch(function (err) {
            console.error(err);
          });
        });
      }

      await loadViews();
    }
  };
})();
