/**
 * 공개 페이지 방문 기록 (Supabase 연동 시에만 동작)
 * 각 HTML </body> 직전에 로드하세요.
 */
(function () {
  function isConfigured() {
    var cfg = window.STN_ADMIN_CONFIG || {};
    return !!(
      cfg.supabaseUrl &&
      cfg.supabaseUrl !== 'YOUR_SUPABASE_URL' &&
      cfg.supabaseAnonKey &&
      cfg.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'
    );
  }

  function canTrack() {
    if (!window.STN_ADMIN_CONFIG || !isConfigured()) {
      return false;
    }
    if (!window.supabase) return false;
    if (location.pathname.indexOf('/admin/') !== -1) return false;
    return true;
  }

  function getVisitorId() {
    var key = 'stn_vid';
    var id = localStorage.getItem(key);
    if (!id) {
      id = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  }

  async function track() {
    if (!canTrack()) return;

    var path = location.pathname || '/';
    var sessionKey = 'stn_pv_' + path;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    try {
      var cfg = window.STN_ADMIN_CONFIG;
      var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      await client.from('page_views').insert({
        page_path: path,
        page_title: document.title || null,
        referrer: document.referrer || null,
        visitor_id: getVisitorId(),
        user_agent: navigator.userAgent || null
      });
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
