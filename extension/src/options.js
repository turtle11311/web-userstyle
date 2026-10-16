/*
 * 設定頁：依 settings-schema.js（從 userstyle 的 @var 產生）長出表單。
 * 只存「跟預設不同」的值，這樣之後改了預設值，沒動過的設定會跟著新預設走。
 */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const form = document.getElementById('form');
  const status = document.getElementById('status');
  let vars = {};
  const inputs = {};

  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids);
    return e;
  };

  const read = (v, input) =>
    v.type === 'range' || v.type === 'number' ? Number(input.value) : v.type === 'checkbox' ? input.checked : input.value;

  const write = (v, input, val) => {
    if (v.type === 'checkbox') input.checked = val;
    else input.value = val;
    input.dispatchEvent(new Event('sync'));
  };

  let flash;
  const save = () => {
    api.storage.sync.set({ vars }).then(() => {
      status.textContent = '已儲存';
      clearTimeout(flash);
      flash = setTimeout(() => (status.textContent = ''), 1200);
    });
  };

  for (const v of PTT_SCHEMA) {
    const id = `var-${v.name}`;
    let input;
    let extra = null;

    if (v.type === 'select') {
      input = el('select', { id }, ...v.options.map((o) => el('option', { value: o.value, textContent: o.label })));
    } else if (v.type === 'range') {
      input = el('input', { id, type: 'range', min: v.min, max: v.max, step: v.step });
      extra = el('output', { htmlFor: id });
      input.addEventListener('sync', () => (extra.value = `${input.value}${v.unit}`));
      input.addEventListener('input', () => input.dispatchEvent(new Event('sync')));
    } else if (v.type === 'checkbox') {
      input = el('input', { id, type: 'checkbox' });
    } else {
      input = el('input', { id, type: v.type === 'number' ? 'number' : v.type === 'color' ? 'color' : 'text', spellcheck: false });
    }
    inputs[v.name] = input;

    // 文字框打字時不要每個字都存，離開或停手才存
    const evt = v.type === 'text' ? 'change' : 'input';
    input.addEventListener(evt, () => {
      const val = read(v, input);
      if (val === v.default) delete vars[v.name];
      else vars[v.name] = val;
      save();
    });

    form.append(el('div', { className: `field field-${v.type}` },
      el('label', { htmlFor: id, textContent: v.label }),
      el('div', { className: 'control' }, input, ...(extra ? [extra] : []))));
  }

  const render = () => {
    for (const v of PTT_SCHEMA) write(v, inputs[v.name], v.name in vars ? vars[v.name] : v.default);
  };

  document.getElementById('reset').addEventListener('click', () => {
    vars = {};
    render();
    save();
  });

  api.storage.sync.get('vars').then((r) => {
    vars = r.vars ?? {};
    render();
  });
})();
