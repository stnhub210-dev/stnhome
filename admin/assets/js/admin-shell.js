(function () {
  window.stnAdminShell = {
    initAuth: async function () {
      var session = await window.stnAdminAuth.requireAuth();
      if (!session) return null;

      var emailEl = document.getElementById('admin-user-email');
      if (emailEl) {
        emailEl.textContent = (session.user && session.user.email) || '관리자';
      }

      window.stnAdminAuth.bindLogoutAll();
      return session;
    }
  };
})();
