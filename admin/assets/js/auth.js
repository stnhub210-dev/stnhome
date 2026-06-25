(function () {
  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.className = 'form-message' + (type ? ' is-' + type : '');
  }

  window.stnAdminAuth = {
    getClient: function () {
      return window.getSupabaseClient();
    },

    getSession: async function () {
      if (!window.isSupabaseConfigured()) return null;

      var client = this.getClient();
      var result = await client.auth.getSession();
      return result.data.session;
    },

    requireAuth: async function () {
      if (!window.isSupabaseConfigured()) {
        window.location.replace('index.html');
        return null;
      }

      var session = await this.getSession();
      if (!session) {
        window.location.replace('index.html');
        return null;
      }
      return session;
    },

    redirectIfAuthed: async function () {
      if (!window.isSupabaseConfigured()) return;

      var session = await this.getSession();
      if (session) window.location.replace('dashboard.html');
    },

    signIn: async function (email, password) {
      var client = this.getClient();
      return client.auth.signInWithPassword({ email: email, password: password });
    },

    signOut: async function () {
      document.querySelectorAll('[data-logout], #logout-btn').forEach(function (btn) {
        btn.disabled = true;
        if (btn.tagName === 'BUTTON') btn.textContent = '로그아웃 중...';
      });

      if (window.isSupabaseConfigured()) {
        try {
          var client = this.getClient();
          var result = await client.auth.signOut();
          if (result.error) throw result.error;
        } catch (err) {
          console.warn('로그아웃 오류:', err);
        }
      }

      window._stnSupabase = null;
      window.location.replace('index.html');
    },

    bindLogoutAll: function () {
      document.querySelectorAll('[data-logout], #logout-btn').forEach(function (btn) {
        if (btn.dataset.stnLogoutBound === '1') return;
        btn.dataset.stnLogoutBound = '1';
        btn.addEventListener('click', function () {
          window.stnAdminAuth.signOut();
        });
      });
    },

    bindLoginForm: function (form, messageEl) {
      if (!form) return;

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        showMessage(messageEl, '', '');

        if (!window.isSupabaseConfigured()) {
          showMessage(messageEl, 'Supabase가 설정되지 않았습니다. config.js를 확인하세요.', 'error');
          return;
        }

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

    bindLogout: function () {
      this.bindLogoutAll();
    }
  };
})();
