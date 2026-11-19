(function (scope) {
  'use strict';
  if (scope.__LEEWAY_COURIER__) return;
  const B = scope.LeeWaySafari;
  if (!B) return;
  scope.__LEEWAY_COURIER__ = Object.freeze({ selected: () => B.excerpt({ href: location.href, title: document.title.slice(0, 256), selection: String(getSelection?.() || '') }) });
})(window);
