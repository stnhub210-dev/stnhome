(function () {
  window.isSupabaseConfigured = function () {
    var cfg = window.STN_ADMIN_CONFIG || {};
    return !!(
      cfg.supabaseUrl &&
      cfg.supabaseUrl !== 'YOUR_SUPABASE_URL' &&
      cfg.supabaseAnonKey &&
      cfg.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'
    );
  };

  function getConfig() {
    var cfg = window.STN_ADMIN_CONFIG || {};
    if (!window.isSupabaseConfigured()) {
      throw new Error('Supabase URL이 설정되지 않았습니다. admin/assets/js/config.js 를 확인하세요.');
    }
    return cfg;
  }

  window.getSupabaseClient = function () {
    if (window._stnSupabase) return window._stnSupabase;
    var cfg = getConfig();
    window._stnSupabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return window._stnSupabase;
  };
})();
