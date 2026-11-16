(() => {
  const api = globalThis.leewayBrowser?.raw;
  if (!api || globalThis.__LEEWAY_CONTENT_COURIER__) return;
  globalThis.__LEEWAY_CONTENT_COURIER__ = true;
  const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 16_384) : '';
  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'COURIER_OBSERVE') {
      sendResponse({ type: 'COURIER_PAGE_CONTEXT', requestId: message.requestId,
        url: location.href.slice(0, 2_048), title: text(document.title), selection: text(getSelection()?.toString()),
        observedUtc: new Date().toISOString(), authority: 'ACTIVE_TAB_DOM_OBSERVATION' });
      return false;
    }
    if (message?.type === 'TABLET_STATUS' || message?.type === 'TABLET_MESSAGE') {
      window.dispatchEvent(new CustomEvent('leeway-tablet-host-message', { detail: message }));
    }
    return false;
  });
})();
