const status = document.getElementById('status');

document.getElementById('edit').addEventListener('click', () => chrome.runtime.openOptionsPage());

document.getElementById('fill').addEventListener('click', async () => {
  status.textContent = 'Filling…';
  const res = await chrome.runtime.sendMessage({ type: 'fill' });
  if (!res?.ok) { status.textContent = `Error: ${res?.error || 'unknown'}`; return; }
  status.textContent = `Filled ${res.filled} field${res.filled === 1 ? '' : 's'}.`;
  if (res.skipped.length) {
    const ul = document.createElement('ul');
    for (const s of res.skipped) ul.appendChild(document.createElement('li')).textContent = s;
    status.append(' Skipped:', ul);
  }
});
