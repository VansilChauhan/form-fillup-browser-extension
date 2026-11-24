// Loads the bundled .env and injects the filler into the active tab.

function parseEnv(text) {
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([\w.\-]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, key, value] = m;
    const q = value[0];
    if ((q === '"' || q === "'") && value.indexOf(q, 1) > 0) {
      value = value.slice(1, value.indexOf(q, 1));
      if (q === '"') value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    } else {
      value = value.replace(/\s+#.*$/, ''); // strip inline comment on unquoted values
    }
    env[key] = value;
  }
  return env;
}

async function loadEnv() {
  // `.env` is tried first; `env` is a fallback in case a Chrome build refuses dotfiles.
  for (const name of ['.env', 'env']) {
    try {
      const res = await fetch(chrome.runtime.getURL(name), { cache: 'no-store' });
      if (res.ok) return parseEnv(await res.text());
    } catch { /* try next */ }
  }
  throw new Error('No .env file found in the extension folder.');
}

// Runs inside the page (each frame). Must be self-contained.
function fillPage(env) {
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lookup = new Map();
  for (const [k, v] of Object.entries(env)) lookup.set(norm(k), v);

  const labelText = (el) => {
    const parts = [];
    if (el.labels) for (const l of el.labels) parts.push(l.textContent);
    const by = el.getAttribute('aria-labelledby');
    if (by) for (const id of by.split(/\s+/)) parts.push(document.getElementById(id)?.textContent);
    return parts;
  };

  const findValue = (el) => {
    const candidates = [
      el.getAttribute('name'),
      el.id,
      ...labelText(el),
      el.getAttribute('aria-label'),
      el.getAttribute('placeholder'),
    ];
    for (const c of candidates) {
      const n = norm(c);
      if (n && lookup.has(n)) return lookup.get(n);
    }
    return undefined;
  };

  const setNative = (el, value) => {
    // Use the prototype setter so React/Vue-controlled inputs notice the change.
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter ? setter.call(el, value) : (el.value = value);
  };
  const fire = (el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const SKIP = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file']);
  let filled = 0;

  for (const el of document.querySelectorAll('input, textarea, select')) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (SKIP.has(type) || el.disabled || el.readOnly) continue;
    const value = findValue(el);
    if (value === undefined) continue;

    if (type === 'checkbox') {
      const want = /^(1|true|yes|on|y)$/i.test(value.trim());
      if (el.checked !== want) el.click();
    } else if (type === 'radio') {
      if (norm(el.value) !== norm(value)) continue;
      if (!el.checked) el.click();
    } else if (el.tagName === 'SELECT') {
      const opt = [...el.options].find(
        (o) => norm(o.value) === norm(value) || norm(o.text) === norm(value)
      );
      if (!opt) continue;
      setNative(el, opt.value);
      fire(el);
    } else {
      setNative(el, value);
      fire(el);
    }
    filled++;
  }
  return filled;
}

async function fillActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab.');
  const env = await loadEnv();
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: fillPage,
    args: [env],
  });
  return results.reduce((n, r) => n + (r.result || 0), 0);
}

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'fill-form') fillActiveTab().catch((e) => console.error('[env-fill]', e));
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'fill') return;
  fillActiveTab()
    .then((count) => sendResponse({ ok: true, count }))
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true; // async response
});
