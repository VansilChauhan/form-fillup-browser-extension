import { getEditorFields, saveFields, parseEnv, toEnv } from './env-source.js';

const rows = document.getElementById('rows');
const status = document.getElementById('status');
const fileInput = document.getElementById('file');
let saved = '[]';

function addRow({ name = '', value = '' } = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="name" placeholder="e.g. First name"></td>
    <td><input class="value" placeholder="e.g. Jane"></td>
    <td><button class="del" title="Remove">✕</button></td>`;
  tr.querySelector('.name').value = name;
  tr.querySelector('.value').value = value;
  tr.querySelector('.del').addEventListener('click', () => { tr.remove(); changed(); });
  rows.append(tr);
  return tr;
}

function setRows(fields) {
  rows.replaceChildren();
  fields.forEach(addRow);
  if (!fields.length) addRow();
}

function current() {
  return [...rows.querySelectorAll('tr')]
    .map((tr) => ({ name: tr.querySelector('.name').value.trim(), value: tr.querySelector('.value').value }))
    .filter((f) => f.name);
}

const dirty = () => JSON.stringify(current()) !== saved;
function changed() { status.textContent = dirty() ? 'Unsaved changes' : ''; }

async function save() {
  const fields = current();
  await saveFields(fields);
  saved = JSON.stringify(fields);
  setRows(fields); // drops blank rows
  status.textContent = 'Saved.';
}

rows.addEventListener('input', changed);
document.getElementById('add').addEventListener('click', () => addRow().querySelector('.name').focus());
document.getElementById('save').addEventListener('click', save);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
  // Enter in the last value box adds a new row.
  if (e.key === 'Enter' && e.target.classList?.contains('value') && e.target.closest('tr') === rows.lastElementChild) {
    addRow().querySelector('.name').focus();
  }
});

document.getElementById('import').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  const fields = parseEnv(await file.text());
  if (!fields.length) { status.textContent = 'No NAME=value lines found in that file.'; return; }
  setRows(fields);
  status.textContent = `Imported ${fields.length} rows. Click Save to keep them.`;
});

document.getElementById('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toEnv(current())], { type: 'text/plain' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'form-fill.env' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

window.addEventListener('beforeunload', (e) => { if (dirty()) e.preventDefault(); });

const initial = await getEditorFields();
setRows(initial);
saved = JSON.stringify(current());
rows.querySelector('.name')?.focus();
