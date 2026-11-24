const status = document.getElementById('status');

document.getElementById('fill').addEventListener('click', async () => {
  status.textContent = 'Filling…';
  const res = await chrome.runtime.sendMessage({ type: 'fill' });
  status.textContent = res?.ok
    ? `Filled ${res.count} field${res.count === 1 ? '' : 's'}.`
    : `Error: ${res?.error || 'unknown'}`;
});
