(() => {
  const api = globalThis.leewayBrowser?.raw;
  if (!api || globalThis.__LEEWAY_CONTENT_COURIER__) return;
  globalThis.__LEEWAY_CONTENT_COURIER__ = true;
  const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 16_384) : '';

  const activeTargets = new Map(); // targetId -> { element, submitButton, origin, expiresAt, nonce }

  function findComposerElements() {
    const composer =
      document.querySelector("rich-textarea [contenteditable='true']") || // Gemini
      document.querySelector("#prompt-textarea") ||                        // ChatGPT
      document.querySelector("div[contenteditable='true'][role='textbox']") || // Antigravity / Slack / Web
      document.querySelector("textarea, [contenteditable='true']");

    const submitBtn =
      document.querySelector("button[aria-label*='Send' i], button[data-testid='send-button']") ||
      document.querySelector("button[aria-label*='Submit' i]") ||
      composer?.closest("form")?.querySelector("button[type='submit']");

    return { composer, submitBtn };
  }

  async function handleCourierCommand(cmd) {
    if (cmd.type === 'COURIER_OBSERVE') {
      return {
        type: 'COURIER_PAGE_CONTEXT',
        requestId: cmd.requestId,
        url: location.href.slice(0, 2_048),
        title: text(document.title),
        selection: text(getSelection()?.toString()),
        observedUtc: new Date().toISOString(),
        authority: 'ACTIVE_TAB_DOM_OBSERVATION'
      };
    }

    if (cmd.type === 'COURIER_COMPOSER_OBSERVE') {
      const { composer, submitBtn } = findComposerElements();
      if (!composer) return { type: 'COURIER_COMPOSER_OBSERVE_RESULT', requestId: cmd.requestId, ok: false, error: 'COMPOSER_NOT_FOUND' };

      const targetId = (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : ('target-' + Date.now() + '-' + Math.random().toString(36).slice(2)));
      activeTargets.set(targetId, {
        element: composer,
        submitButton: submitBtn,
        origin: window.location.origin,
        nonce: cmd.nonce,
        expiresAt: Date.now() + 30_000
      });
      return {
        type: 'COURIER_COMPOSER_OBSERVE_RESULT',
        requestId: cmd.requestId,
        ok: true,
        targetId,
        origin: window.location.origin,
        tagName: composer.tagName,
        hasSubmitButton: Boolean(submitBtn)
      };
    }

    if (cmd.type === 'COURIER_COMPOSER_INPUT') {
      const entry = activeTargets.get(cmd.targetId);
      if (!entry || Date.now() > entry.expiresAt) return { type: 'COURIER_COMPOSER_INPUT_RESULT', requestId: cmd.requestId, ok: false, error: 'TARGET_HANDLE_EXPIRED' };
      if (entry.origin !== window.location.origin) return { type: 'COURIER_COMPOSER_INPUT_RESULT', requestId: cmd.requestId, ok: false, error: 'ORIGIN_MISMATCH' };

      const el = entry.element;
      el.focus();
      if ('value' in el) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        nativeSetter ? nativeSetter.call(el, cmd.text) : (el.value = cmd.text);
      } else {
        el.textContent = cmd.text;
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: cmd.text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      const readback = ('value' in el ? el.value : el.textContent).trim();
      if (readback !== cmd.text.trim()) {
        return { type: 'COURIER_COMPOSER_INPUT_RESULT', requestId: cmd.requestId, ok: false, error: 'DOM_INPUT_READBACK_MISMATCH', readback };
      }
      return { type: 'COURIER_COMPOSER_INPUT_RESULT', requestId: cmd.requestId, ok: true, targetId: cmd.targetId, verifiedLength: readback.length };
    }

    if (cmd.type === 'COURIER_COMPOSER_SUBMIT') {
      const entry = activeTargets.get(cmd.targetId);
      if (!entry || Date.now() > entry.expiresAt) return { type: 'COURIER_COMPOSER_SUBMIT_RESULT', requestId: cmd.requestId, ok: false, error: 'TARGET_HANDLE_EXPIRED' };

      if (entry.submitButton && !entry.submitButton.disabled) {
        entry.submitButton.click();
      } else {
        entry.element.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })
        );
      }
      activeTargets.delete(cmd.targetId);
      return { type: 'COURIER_COMPOSER_SUBMIT_RESULT', requestId: cmd.requestId, ok: true, submitted: true };
    }

    if (cmd.type === 'COURIER_RESPONSE_READ') {
      const isStreaming = Boolean(
        document.querySelector("button[aria-label*='Stop' i], [data-testid='stop-button'], .result-streaming")
      );
      const messages = Array.from(
        document.querySelectorAll("model-response, [data-message-author-role='assistant'], .markdown-body")
      );
      const lastText = messages.at(-1)?.innerText?.trim() || '';
      return { type: 'COURIER_RESPONSE_READ_RESULT', requestId: cmd.requestId, ok: true, isStreaming, text: lastText };
    }

    return null;
  }

  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TABLET_STATUS' || message?.type === 'TABLET_MESSAGE') {
      window.dispatchEvent(new CustomEvent('leeway-tablet-host-message', { detail: message }));
      return false;
    }
    handleCourierCommand(message).then(res => {
      if (res) sendResponse(res);
    });
    return true; // async sendResponse
  });
})();
