(function () {
  function openPicker(input) {
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch (_) {}
    }
    input.click();
  }

  window.stnAdminDatePicker = {
    bind: function (root) {
      var scope = root || document;

      scope.querySelectorAll('.date-open-btn[data-for]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openPicker(document.getElementById(btn.getAttribute('data-for')));
        });
      });

      scope.querySelectorAll('input[type="date"].date-input').forEach(function (input) {
        input.addEventListener('click', function () {
          if (typeof input.showPicker === 'function') {
            try {
              input.showPicker();
            } catch (_) {}
          }
        });
      });
    }
  };
})();
