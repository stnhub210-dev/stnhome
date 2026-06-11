(function () {
  var DEMO_KEY = 'stn_admin_demo';

  function getConfig() {
    return window.STN_ADMIN_CONFIG || {};
  }

  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.className = 'form-message' + (type ? ' is-' + type : '');
  }

  function isDemoSession() {
    return sessionStorage.getItem(DEMO_KEY) === '1';
  }

  function createDemoSession() {
    var cfg = getConfig();
    return {
      user: {
        email: (cfg.demoEmail || 'demo@stnmedia.kr') + ' (데모)'
      }
    };
  }

  window.stnAdminAuth = {
    isDemoSession: isDemoSession,

    getClient: function () {
      return window.getSupabaseClient();
    },

    getSession: async function () {
      if (isDemoSession()) return createDemoSession();
      if (!window.isSupabaseConfigured()) return null;

      var client = this.getClient();
      var result = await client.auth.getSession();
      return result.data.session;
    },

    requireAuth: async function () {
      var session = await this.getSession();
      if (!session) {
        window.location.replace('index.html');
        return null;
      }
      return session;
    },

    redirectIfAuthed: async function () {
      var session = await this.getSession();
      if (session) window.location.replace('dashboard.html');
    },

    signInDemo: function (email, password) {
      var cfg = getConfig();
      if (email !== cfg.demoEmail || password !== cfg.demoPassword) {
        return { error: { message: '데모 계정 정보가 올바르지 않습니다.' } };
      }
      sessionStorage.setItem(DEMO_KEY, '1');
      return { error: null };
    },

    signIn: async function (email, password) {
      if (window.isDemoMode()) {
        return this.signInDemo(email, password);
      }
      var client = this.getClient();
      return client.auth.signInWithPassword({ email: email, password: password });
    },

    signOut: async function () {
      sessionStorage.removeItem(DEMO_KEY);
      if (window.isSupabaseConfigured()) {
        try {
          var client = this.getClient();
          await client.auth.signOut();
        } catch (_) {}
      }
      window.location.replace('index.html');
    },

    bindLoginForm: function (form, messageEl) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        showMessage(messageEl, '', '');

        var email = form.email.value.trim();
        var password = form.password.value;
        var submitBtn = form.querySelector('[type="submit"]');

        if (!email || !password) {
          showMessage(messageEl, '이메일과 비밀번호를 입력해 주세요.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '로그인 중...';

        try {
          if (window.isDemoMode()) {
            var demoResult = window.stnAdminAuth.signInDemo(email, password);
            if (demoResult.error) throw demoResult.error;
            window.location.replace('dashboard.html');
            return;
          }

          var result = await window.stnAdminAuth.signIn(email, password);
          if (result.error) throw result.error;
          window.location.replace('dashboard.html');
        } catch (err) {
          showMessage(messageEl, err.message || '로그인에 실패했습니다.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '로그인';
        }
      });
    },

    bindDemoEnter: function (btn) {
      if (!btn || !window.isDemoMode()) return;
      btn.addEventListener('click', function () {
        sessionStorage.setItem(DEMO_KEY, '1');
        window.location.replace('dashboard.html');
      });
    },

    bindLogout: function (btn) {
      if (!btn) return;
      btn.addEventListener('click', function () {
        window.stnAdminAuth.signOut();
      });
    }
  };
})();
