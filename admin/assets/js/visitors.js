(function () {
  var TABLE = 'page_views';

  var DEMO_VIEWS = [
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v1', created_at: '2026-05-29T10:12:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v2', created_at: '2026-05-29T09:40:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v3', created_at: '2026-05-29T08:55:00+09:00' },
    { page_path: '/curriculum.html', page_title: '교육 커리큘럼', visitor_id: 'v4', created_at: '2026-05-28T22:10:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v1', created_at: '2026-05-28T20:30:00+09:00' },
    { page_path: '/score.html', page_title: '유튜브 채널 점수 진단', visitor_id: 'v5', created_at: '2026-05-28T18:05:00+09:00' },
    { page_path: '/payment-earlybird.html', page_title: '얼리버드 결제', visitor_id: 'v6', created_at: '2026-05-28T15:20:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v7', created_at: '2026-05-28T11:00:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v8', created_at: '2026-05-27T16:45:00+09:00' },
    { page_path: '/curriculum.html', page_title: '교육 커리큘럼', visitor_id: 'v2', created_at: '2026-05-27T14:30:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v9', created_at: '2026-05-27T09:15:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v10', created_at: '2026-05-26T21:00:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v11', created_at: '2026-05-26T13:40:00+09:00' },
    { page_path: '/score.html', page_title: '유튜브 채널 점수 진단', visitor_id: 'v3', created_at: '2026-05-25T19:20:00+09:00' },
    { page_path: '/start.html', page_title: 'STN 스킬업 양성과정', visitor_id: 'v12', created_at: '2026-05-25T10:05:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v13', created_at: '2026-05-24T17:50:00+09:00' },
    { page_path: '/curriculum.html', page_title: '교육 커리큘럼', visitor_id: 'v14', created_at: '2026-05-24T12:30:00+09:00' },
    { page_path: '/', page_title: '유튜브 채널 점수 진단', visitor_id: 'v15', created_at: '2026-05-23T08:20:00+09:00' }
  ];

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

  function formatDateLabel(key) {
    var parts = key.split('-');
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    var byDay = {};
    var byPage = {};

    rows.forEach(function (row) {
      var at = new Date(row.created_at);
      if (Number.isNaN(at.getTime())) return;

      var path = row.page_path || '/';
      byPage[path] = (byPage[path] || 0) + 1;

      if (at >= monthStart) {
        month += 1;
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

    var chartDays = [];
    for (var i = 6; i >= 0; i -= 1) {
      var d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      var k = dayKey(d);
      chartDays.push({ key: k, label: formatDateLabel(k), count: byDay[k] || 0 });
    }

    var topPages = Object.keys(byPage)
      .map(function (path) { return { path: path, count: byPage[path] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 10);

    return {
      total: rows.length,
      today: today,
      week: week,
      month: month,
      uniqueToday: Object.keys(visitorsToday).length,
      uniqueWeek: Object.keys(visitorsWeek).length,
      chartDays: chartDays,
      topPages: topPages,
      recent: rows.slice().sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      }).slice(0, 20)
    };
  }

  function renderChart(days) {
    var wrap = document.getElementById('visitor-chart');
    if (!wrap) return;

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

  function renderTopPages(pages) {
    var tbody = document.getElementById('top-pages-body');
    if (!tbody) return;

    if (!pages.length) {
      tbody.innerHTML = '<tr><td colspan="2" class="table-empty">데이터가 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = pages.map(function (p) {
      return (
        '<tr>' +
          '<td class="mono">' + escapeHtml(p.path) + '</td>' +
          '<td><strong>' + p.count.toLocaleString('ko-KR') + '</strong></td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderRecent(rows) {
    var tbody = document.getElementById('recent-views-body');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">데이터가 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (row) {
      var at = new Date(row.created_at);
      var time = Number.isNaN(at.getTime())
        ? '-'
        : at.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

      return (
        '<tr>' +
          '<td>' + escapeHtml(time) + '</td>' +
          '<td class="mono">' + escapeHtml(row.page_path || '/') + '</td>' +
          '<td>' + escapeHtml(row.page_title || '-') + '</td>' +
          '<td class="mono">' + escapeHtml(row.visitor_id || '-') + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderStats(stats) {
    setText('stat-views-today', stats.today.toLocaleString('ko-KR'));
    setText('stat-views-week', stats.week.toLocaleString('ko-KR'));
    setText('stat-views-month', stats.month.toLocaleString('ko-KR'));
    setText('stat-views-total', stats.total.toLocaleString('ko-KR'));
    setText('stat-unique-today', stats.uniqueToday.toLocaleString('ko-KR'));
    setText('stat-unique-week', stats.uniqueWeek.toLocaleString('ko-KR'));
    renderChart(stats.chartDays);
    renderTopPages(stats.topPages);
    renderRecent(stats.recent);
  }

  function showDemoBanner() {
    var banner = document.getElementById('demo-banner');
    if (banner && window.stnAdminAuth.isDemoSession()) banner.hidden = false;
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
      .select('page_path,page_title,visitor_id,created_at')
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

      var refreshBtn = document.getElementById('refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
          loadViews().catch(function (err) {
            setText('stat-views-total', '오류');
            console.error(err);
          });
        });
      }

      await loadViews();
    }
  };
})();
