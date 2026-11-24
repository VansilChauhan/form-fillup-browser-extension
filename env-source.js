// Your details: a list of { name, value } rows saved in chrome.storage.local.
// .env text is only used for import/export and as a fallback for a bundled file.

const FIELDS = 'fields';
const LEGACY_TEXT = 'envText'; // saved by v1.1's text editor

export function parseEnv(text) {
  const fields = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([\w.\-]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, name, value] = m;
    const q = value[0];
    if ((q === '"' || q === "'") && value.indexOf(q, 1) > 0) {
      value = value.slice(1, value.indexOf(q, 1));
      if (q === '"') value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    } else {
      value = value.replace(/\s+#.*$/, ''); // strip inline comment on unquoted values
    }
    fields.push({ name, value });
  }
  return fields;
}

export function toEnv(fields) {
  return fields
    .map(({ name, value }) => {
      const key = name.trim().replace(/[^\w.\-]+/g, '_'); // matching ignores separators anyway
      if (!/[#"'\n\t]|^\s|\s$/.test(value)) return `${key}=${value}`;
      if (value.includes('"') && !/['\n\t]/.test(value)) return `${key}='${value}'`;
      return `${key}="${value.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
    })
    .join('\n') + '\n';
}

async function readBundled(names) {
  for (const name of names) {
    try {
      const res = await fetch(chrome.runtime.getURL(name), { cache: 'no-store' });
      if (res.ok) return await res.text();
    } catch { /* try next */ }
  }
  return null;
}

async function getSavedFields() {
  const r = await chrome.storage.local.get([FIELDS, LEGACY_TEXT]);
  if (r[FIELDS]) return r[FIELDS];
  if (typeof r[LEGACY_TEXT] === 'string') return parseEnv(r[LEGACY_TEXT]);
  return null;
}

export async function saveFields(fields) {
  await chrome.storage.local.set({ [FIELDS]: fields });
  await chrome.storage.local.remove(LEGACY_TEXT);
}

// Rows used for filling: saved details, else a bundled .env / env file, else null.
export async function getFields() {
  const saved = await getSavedFields();
  if (saved) return saved;
  const bundled = await readBundled(['.env', 'env']);
  return bundled === null ? null : parseEnv(bundled);
}

// Rows shown in the editor: same as above, else the example as a starting point.
export async function getEditorFields() {
  return (await getFields()) ?? parseEnv((await readBundled(['env.example'])) ?? '');
}
