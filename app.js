const STORAGE_KEY = 'transactions_v1';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler storage', e);
    return [];
  }
}

function saveTransactions(tx) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tx));
}

function formatCurrencyBRL(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderSummary(tx) {
  const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  document.getElementById('income').textContent = formatCurrencyBRL(income);
  document.getElementById('expense').textContent = formatCurrencyBRL(expense);
  document.getElementById('balance').textContent = formatCurrencyBRL(balance);
}

function renderTransactions(tx, filterText = '') {
  const list = document.getElementById('transactions-list');
  list.innerHTML = '';
  const normalizedFilter = filterText.trim().toLowerCase();

  tx
    .filter(t => {
      if (!normalizedFilter) return true;
      const cat = (t.category || '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      return cat.includes(normalizedFilter) || note.includes(normalizedFilter);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(t => {
      const li = document.createElement('li');
      li.className = `tx ${t.type}`;
      li.innerHTML = `<div class="tx-main">
          <div class="tx-info">
            <div class="tx-desc">${escapeHtml(t.category || '(Sem categoria)')} — ${escapeHtml(t.note || '')}</div>
            <div class="tx-date">${t.date}</div>
          </div>
          <div class="tx-amount">${formatCurrencyBRL(t.type === 'expense' ? -t.amount : t.amount)}</div>
        </div>
        <div class="tx-actions"><button data-id="${t.id}" class="delete">Remover</button></div>`;

      list.appendChild(li);
    });

  document.querySelectorAll('#transactions-list .delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      deleteTransaction(id);
    });
  });
}

function addTransactionFromForm(e) {
  e.preventDefault();
  const type = document.getElementById('type').value;
  const amountRaw = document.getElementById('amount').value;
  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value.trim();
  const note = document.getElementById('note').value.trim();

  const amount = parseFloat(amountRaw);
  if (!date || isNaN(amount) || amount === 0) {
    alert('Por favor informe uma data e um valor diferente de zero.');
    return;
  }

  const tx = loadTransactions();
  const transaction = { id: uid(), type, amount: Math.abs(amount), date, category, note };
  tx.push(transaction);
  saveTransactions(tx);
  renderTransactions(tx, document.getElementById('filter').value);
  renderSummary(tx);
  e.target.reset();
}

function deleteTransaction(id) {
  let tx = loadTransactions();
  tx = tx.filter(t => t.id !== id);
  saveTransactions(tx);
  renderTransactions(tx, document.getElementById('filter').value);
  renderSummary(tx);
}

function exportCSV() {
  const tx = loadTransactions();
  if (!tx.length) {
    alert('Nenhuma transação para exportar.');
    return;
  }
  const header = ['id','type','amount','date','category','note'];
  const rows = tx.map(t => header.map(h => csvSafe(t[h])).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importCSVFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const header = lines.shift().split(',').map(h => h.trim());
    const tx = loadTransactions();
    lines.forEach(line => {
      const cols = parseCsvLine(line);
      const obj = {};
      header.forEach((h, i) => obj[h] = cols[i] || '');
      const amount = parseFloat(String(obj.amount || '').replace(',', '.')) || 0;
      tx.push({ id: obj.id || uid(), type: obj.type || 'expense', amount: Math.abs(amount), date: obj.date || new Date().toISOString().slice(0,10), category: obj.category || '', note: obj.note || '' });
    });
    saveTransactions(tx);
    renderTransactions(tx, document.getElementById('filter').value);
    renderSummary(tx);
    alert('Importação concluída.');
  };
  reader.readAsText(file, 'UTF-8');
}

function csvSafe(value) {
  if (value == null) return '';
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result.map(s => s.replace(/""/g, '"').trim());
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('transaction-form');
  form.addEventListener('submit', addTransactionFromForm);

  document.getElementById('export-btn').addEventListener('click', exportCSV);
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importCSVFile(file);
    e.target.value = '';
  });

  document.getElementById('filter').addEventListener('input', (e) => {
    const tx = loadTransactions();
    renderTransactions(tx, e.target.value);
  });

  // Initialize
  const tx = loadTransactions();
  renderTransactions(tx);
  renderSummary(tx);
});

// Register service worker and handle PWA install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.hidden = false;
});

document.addEventListener('click', async (e) => {
  const btn = e.target.closest && e.target.closest('#install-btn');
  if (btn && deferredPrompt) {
    btn.hidden = true;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    console.log('ServiceWorker registrado', reg.scope);
  }).catch(err => console.warn('ServiceWorker falhou', err));
}
