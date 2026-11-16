(() => {
  const raw = globalThis.browser || globalThis.chrome;
  if (!raw || globalThis.leewayBrowser) return;
  const promiseCall = (owner, method, ...args) => {
    try {
      const value = owner[method](...args);
      if (value?.then) return value;
      return new Promise((resolve, reject) => owner[method](...args, result => {
        const error = raw.runtime?.lastError;
        error ? reject(new Error(error.message)) : resolve(result);
      }));
    } catch (error) { return Promise.reject(error); }
  };
  globalThis.leewayBrowser = Object.freeze({
    raw,
    tabsQuery: query => promiseCall(raw.tabs, 'query', query),
    tabsSend: (id, message) => promiseCall(raw.tabs, 'sendMessage', id, message),
    storageGet: keys => promiseCall(raw.storage.local, 'get', keys),
    storageSet: value => promiseCall(raw.storage.local, 'set', value),
  });
})();
