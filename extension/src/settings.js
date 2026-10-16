/*
 * 把使用者設定套到頁面：寫在 <html> 的 inline style 上，蓋過 ptt-theme.css 開頭 :root 的預設值。
 * 沒設定過的變數就移除 inline 值，回到預設。設定頁改了會即時套用，不用重新整理。
 */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const root = document.documentElement;

  const cssValue = (v, val) =>
    v.type === 'range' || v.type === 'number' ? `${val}${v.unit}` : v.type === 'checkbox' ? (val ? '1' : '0') : val;

  const apply = (vars = {}) => {
    for (const v of PTT_SCHEMA) {
      if (v.name in vars) root.style.setProperty(`--${v.name}`, cssValue(v, vars[v.name]));
      else root.style.removeProperty(`--${v.name}`);
    }
  };

  // 內附字體：content script 的 CSS 裡 url() 沒辦法指到擴充功能自己的檔案
  // （Chrome / Safari 的網址開頭還不一樣），所以在這裡用 runtime.getURL 組出來再插進頁面
  if (PTT_FONTS.length) {
    const style = document.createElement('style');
    style.textContent = PTT_FONTS.map((f) => `@font-face {
      font-family: "${f.family}";
      src: url("${api.runtime.getURL(f.file)}") format("${f.file.endsWith('.woff2') ? 'woff2' : f.file.endsWith('.woff') ? 'woff' : 'truetype'}");
      font-weight: ${f.weight};
      font-style: ${f.style};
      font-display: swap;
    }`).join('\n');
    root.append(style);
  }

  api.storage.sync.get('vars').then(({ vars }) => apply(vars));
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.vars) apply(changes.vars.newValue);
  });
})();
