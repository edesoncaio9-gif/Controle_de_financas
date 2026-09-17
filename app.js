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

function summarizeDashboard(tx) {
  const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  const monthlyMap = new Map();
  tx.forEach(t => {
    const date = new Date(`${t.date}T00:00:00`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { income: 0, expense: 0 });
    const bucket = monthlyMap.get(key);
    if (t.type === 'income') bucket.income += Number(t.amount);
    else bucket.expense += Number(t.amount);
  });

  const trend = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      income: values.income,
      expense: values.expense,
    }));

  const categoryMap = new Map();
  tx.filter(t => t.type === 'expense').forEach(t => {
    const category = (t.category || 'Sem categoria').trim() || 'Sem categoria';
    categoryMap.set(category, (categoryMap.get(category) || 0) + Number(t.amount));
  });

  return {
    income,
    expense,
    balance,
    trend,
    categories: [...categoryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
  };
}

function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height, ctx };
}

function drawBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { width, height, ctx } = resizeCanvas(canvas);
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map(item => item.value), 1);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#ddd';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  data.forEach((item, index) => {
    const barWidth = chartWidth / data.length * 0.6;
    const x = padding.left + (index * chartWidth / data.length) + ((chartWidth / data.length) - barWidth) / 2;
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#555';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x + barWidth / 2, height - 8);
  });
}

function drawTrendChart(data) {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const { width, height, ctx } = resizeCanvas(canvas);
  const padding = { top: 20, right: 20, bottom: 35, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const allValues = data.flatMap(item => [item.income, item.expense]);
  const maxValue = Math.max(...allValues, 1);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#ddd';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const drawLine = (color, key) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    data.forEach((item, index) => {
      const x = padding.left + (index * chartWidth / Math.max(data.length - 1, 1));
      const y = padding.top + chartHeight - (item[key] / maxValue) * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  drawLine('#4caf50', 'income');
  drawLine('#e53935', 'expense');

  data.forEach((item, index) => {
    const x = padding.left + (index * chartWidth / Math.max(data.length - 1, 1));
    ctx.fillStyle = '#555';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x, height - 10);
  });
}

function drawCategoryBarChart(data) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const { width, height, ctx } = resizeCanvas(canvas);
  const padding = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map(([, value]) => value), 1);

  ctx.clearRect(0, 0, width, height);

  if (!data.length) {
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem despesas registradas', width / 2, height / 2);
    return;
  }

  const palette = ['#4caf50', '#198754', '#8bc34a', '#ff9800', '#e53935', '#9c27b0'];

  data.forEach(([label, value], index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding.left + (index * chartWidth / data.length) + 12;
    const y = padding.top + chartHeight - barHeight;
    const barWidth = (chartWidth / data.length) - 20;

    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + barWidth / 2, height - 10);
  });
}

function drawCategoryPieChart(data) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const { width, height, ctx } = resizeCanvas(canvas);
  const isCompact = width < 440;

  ctx.clearRect(0, 0, width, height);

  if (!data.length) {
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem despesas registradas', width / 2, height / 2);
    return;
  }

  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const centerX = isCompact ? width / 2 : width * 0.32;
  const centerY = isCompact ? 92 : height / 2;
  const radius = isCompact ? 68 : Math.min(92, height / 2 - 24);
  const palette = ['#4caf50', '#198754', '#8bc34a', '#ff9800', '#e53935', '#9c27b0'];

  let startAngle = -Math.PI / 2;
  data.forEach(([label, value], index) => {
    const sliceAngle = (value / total) * (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();

    startAngle += sliceAngle;
  });

  const legendStartY = isCompact ? 178 : 34;
  const legendX = isCompact ? 12 : width * 0.62;
  data.forEach(([label, value], index) => {
    const y = legendStartY + index * 18;
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    const maxLabelLength = isCompact ? 24 : 18;
    const shortLabel = label.length > maxLabelLength ? `${label.slice(0, maxLabelLength - 1)}...` : label;
    const text = isCompact ? shortLabel : `${shortLabel}: ${formatCurrencyBRL(value)}`;
    ctx.fillText(text, legendX + 18, y + 10);
  });
}

function renderCategoryChart(data) {
  const mode = document.getElementById('categoryChartMode')?.value || 'pizza';
  if (mode === 'bar') drawCategoryBarChart(data);
  else drawCategoryPieChart(data);
}

function renderDashboard(tx) {
  const summary = summarizeDashboard(tx);

  drawBarChart('balanceChart', [
    { label: 'Receita', value: summary.income, color: '#4caf50' },
    { label: 'Despesa', value: summary.expense, color: '#e53935' },
  ]);

  if (summary.trend.length) drawTrendChart(summary.trend);
  else {
    const canvas = document.getElementById('trendChart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sem movimentações', canvas.width / 2, canvas.height / 2);
    }
  }

  renderCategoryChart(summary.categories);
}

function renderSummary(tx) {
  const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  document.getElementById('income').textContent = formatCurrencyBRL(income);
  document.getElementById('expense').textContent = formatCurrencyBRL(expense);
  document.getElementById('balance').textContent = formatCurrencyBRL(balance);
  renderDashboard(tx);
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

  const categoryChartMode = document.getElementById('categoryChartMode');
  categoryChartMode.addEventListener('change', () => {
    const tx = loadTransactions();
    renderSummary(tx);
  });

  window.addEventListener('resize', () => {
    const tx = loadTransactions();
    renderSummary(tx);
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
