/**
 * 사이트 콘텐츠 보호 (우클릭·드래그·선택·단축키 제한)
 * 폼 입력(input/textarea/select)에서는 붙여넣기·선택·복사를 허용합니다.
 */
(function () {
  'use strict';

  if (window.__STN_SITE_PROTECTION__) return;
  window.__STN_SITE_PROTECTION__ = true;

  var STYLE_ID = 'stn-site-protection-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      'html.stn-protected, html.stn-protected body {' +
      '-webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }' +
      'html.stn-protected input, html.stn-protected textarea, html.stn-protected select,' +
      'html.stn-protected [contenteditable="true"], html.stn-protected [data-allow-select] {' +
      '-webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }' +
      'html.stn-protected img, html.stn-protected video, html.stn-protected svg,' +
      'html.stn-protected picture, html.stn-protected canvas {' +
      '-webkit-user-drag: none; user-drag: none; pointer-events: auto; }' +
      'html.stn-protected a {' + '-webkit-user-drag: none; user-drag: none; }';
    (document.head || document.documentElement).appendChild(style);
    document.documentElement.classList.add('stn-protected');
  }

  function targetFromEvent(e) {
    var t = e.target;
    if (!t) return null;
    return t.nodeType === 3 ? t.parentElement : t;
  }

  function isEditableArea(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(
      'input, textarea, select, option, [contenteditable="true"], [data-allow-select]'
    );
  }

  function blockUnlessEditable(e) {
    if (isEditableArea(targetFromEvent(e))) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  function blockShortcut(e) {
    if (isEditableArea(targetFromEvent(e))) return;

    var key = String(e.key || '').toLowerCase();
    var ctrl = e.ctrlKey || e.metaKey;
    var shift = e.shiftKey;

    if (key === 'f12') {
      e.preventDefault();
      return;
    }

    if (!ctrl) return;

    if (key === 'u' || key === 's') {
      e.preventDefault();
      return;
    }

    if (shift && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) {
      e.preventDefault();
    }
  }

  injectStyles();

  document.addEventListener('contextmenu', blockUnlessEditable, true);
  document.addEventListener('dragstart', blockUnlessEditable, true);
  document.addEventListener('selectstart', blockUnlessEditable, true);
  document.addEventListener('copy', blockUnlessEditable, true);
  document.addEventListener('cut', blockUnlessEditable, true);
  document.addEventListener('drop', blockUnlessEditable, true);
  document.addEventListener('keydown', blockShortcut, true);

  document.addEventListener(
    'mousedown',
    function (e) {
      if (e.button === 1 && !isEditableArea(targetFromEvent(e))) {
        e.preventDefault();
      }
    },
    true
  );
})();
