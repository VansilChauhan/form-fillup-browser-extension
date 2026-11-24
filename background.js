// Loads your saved details and injects the filler into the active tab.
import { getFields } from './env-source.js';

// Runs inside the page (each frame). Must be self-contained.
// Returns { filled, skipped: ["Name: reason", ...] }.
function fillPage(fields) {
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lookup = new Map();
  for (const f of fields) if (norm(f.name)) lookup.set(norm(f.name), f); // last row wins

  const labelText = (el) => {
    const parts = [];
    if (el.labels) for (const l of el.labels) parts.push(l.textContent);
    const by = el.getAttribute('aria-labelledby');
    if (by) for (const id of by.split(/\s+/)) parts.push(document.getElementById(id)?.textContent);
    return parts;
  };

  const findField = (el) => {
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

  // ---- Dates: built-in date inputs only accept ISO formats. ----
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const pad = (n) => String(n).padStart(2, '0');
  const monthNum = (word) => {
    const i = MONTHS.indexOf(word.toLowerCase().slice(0, 3));
    return i < 0 ? null : i + 1;
  };
  const validYMD = (y, m, d) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return y >= 1000 && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  };
  const ymd = (y, m, d) => (validYMD(+y, +m, +d) ? `${y}-${pad(m)}-${pad(d)}` : null);

  // Returns 'YYYY-MM-DD', or null if unrecognised or ambiguous (e.g. 03/04/2025).
  const toDate = (v) => {
    const s = v.trim().replace(/,/g, ' ').replace(/(\d)(st|nd|rd|th)\b/gi, '$1').replace(/\s+/g, ' ');
    let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return ymd(m[1], m[2], m[3]);
    if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
      const [a, b] = [+m[1], +m[2]];
      if (a > 12 && b <= 12) return ymd(m[3], b, a);      // day first
      if (b > 12 && a <= 12) return ymd(m[3], a, b);      // month first
      if (a === b) return ymd(m[3], a, b);
      return null;                                          // ambiguous
    }
    if ((m = s.match(/^(\d{1,2})[ -]([a-z]+)\.?[ -](\d{4})$/i)) && monthNum(m[2]))
      return ymd(m[3], monthNum(m[2]), m[1]);              // 14 March 2025
    if ((m = s.match(/^([a-z]+)\.? (\d{1,2}) (\d{4})$/i)) && monthNum(m[1]))
      return ymd(m[3], monthNum(m[1]), m[2]);              // March 14 2025
    return null;
  };
  const toMonth = (v) => {
    const s = v.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
    let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})$/)) && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${pad(m[2])}`;
    if ((m = s.match(/^(\d{1,2})[-/.](\d{4})$/)) && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${pad(m[1])}`;
    if ((m = s.match(/^([a-z]+)\.? (\d{4})$/i)) && monthNum(m[1])) return `${m[2]}-${pad(monthNum(m[1]))}`;
    return null;
  };
  const toTime = (v) => {
    const m = v.trim().match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([ap])\.?m?\.?$|^(\d{1,2}):(\d{2})(?::(\d{2}))?$/i);
    if (!m) return null;
    let h, min, sec;
    if (m[4]) {
      h = +m[1] % 12 + (m[4].toLowerCase() === 'p' ? 12 : 0);
      min = +(m[2] || 0); sec = m[3];
      if (+m[1] < 1 || +m[1] > 12) return null;
    } else {
      h = +m[5]; min = +m[6]; sec = m[7];
    }
    if (h > 23 || min > 59 || (sec && +sec > 59)) return null;
    return `${pad(h)}:${pad(min)}${sec ? ':' + sec : ''}`;
  };
  const toDateTime = (v) => {
    const m = v.trim().match(/^(.*?)[\sT,]+(\d{1,2}(?::\d{2}){0,2}\s*(?:[ap]\.?m?\.?)?)$/i);
    if (!m) return null;
    const d = toDate(m[1]), t = toTime(m[2]);
    return d && t ? `${d}T${t}` : null;
  };
  const CONVERT = { date: toDate, month: toMonth, time: toTime, 'datetime-local': toDateTime };
  const EXAMPLE = { date: '2025-03-14', month: '2025-03', time: '14:30', 'datetime-local': '2025-03-14 14:30' };

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
  const skipped = [];
  const radioGroups = new Map(); // group key -> { field, done }

  for (const el of document.querySelectorAll('input, textarea, select')) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (SKIP.has(type) || el.disabled || el.readOnly) continue;
    const field = findField(el);
    if (!field) continue;
    const value = field.value;

    if (type === 'checkbox') {
      const want = /^(1|true|yes|on|y)$/i.test(value.trim());
      if (el.checked !== want) el.click();
    } else if (type === 'radio') {
      const group = el.name ? `n:${el.name}` : `f:${norm(field.name)}`;
      const g = radioGroups.get(group) ?? { done: false, missField: null };
      radioGroups.set(group, g);
      if (norm(el.getAttribute('name')) === norm(field.name)) g.missField = field;
      const nv = norm(value);
      if (norm(el.value) !== nv && !labelText(el).some((t) => norm(t) === nv)) continue;
      if (!el.checked) el.click();
      g.done = true;
      continue; // counted once per group below
    } else if (el.tagName === 'SELECT') {
      const nv = norm(value);
      const opt = [...el.options].find((o) => norm(o.value) === nv || norm(o.text) === nv);
      if (!opt) { skipped.push(`${field.name}: no option "${value}"`); continue; }
      setNative(el, opt.value);
      fire(el);
    } else if (CONVERT[type]) {
      const v = value.trim() === '' ? '' : CONVERT[type](value);
      if (v === null) { skipped.push(`${field.name}: use a format like ${EXAMPLE[type]}`); continue; }
      setNative(el, v);
      if (v && !el.value) { skipped.push(`${field.name}: rejected by the page`); continue; }
      fire(el);
    } else {
      setNative(el, value);
      fire(el);
    }
    filled++;
  }

  for (const g of radioGroups.values()) {
    if (g.done) filled++;
    // Only report a miss when the group's own name matched; a lone radio whose label
    // happens to equal some name (e.g. "Email") isn't a miss.
    else if (g.missField) skipped.push(`${g.missField.name}: no choice "${g.missField.value}"`);
  }
  return { filled, skipped };
}

async function fillActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab.');
  const fields = await getFields();
  if (!fields) throw new Error('No details saved yet. Click "Edit details" first.');
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: fillPage,
    args: [fields],
  });
  const filled = results.reduce((n, r) => n + (r.result?.filled || 0), 0);
  const skipped = results.flatMap((r) => r.result?.skipped || []);

  // Badge feedback, mainly for the keyboard shortcut. Orange = something was skipped.
  chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: skipped.length ? '#d97706' : '#16a34a' });
  chrome.action.setBadgeText({ tabId: tab.id, text: String(filled) });
  setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: '' }).catch(() => {}), 4000);

  return { filled, skipped };
}

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'fill-form') fillActiveTab().catch((e) => console.error('[env-fill]', e));
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'fill') return;
  fillActiveTab()
    .then((r) => sendResponse({ ok: true, ...r }))
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true; // async response
});
