const API_URL = 'http://172.28.4.149:3000/api';

let authToken = localStorage.getItem('authToken');
let transactions = [];

if (!authToken) {
    window.location.href = 'login.html';
}

async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
      }
        throw new Error(data.error || 'Erro na comunicação com a API.');
    }

    return data;
}

function mapAPITransaction(transaction) {
    return {
        id: String(transaction.id),
        type: transaction.type === 'receita' ? 'income' : 'expense',
        amount: Number(transaction.amount),
        date: String(transaction.date).slice(0, 10),
        category: transaction.category || '',
        note: transaction.note || ''
    };
}

async function getTransactionsFromAPI() {
    const data = await apiRequest('/transactions');
    return data.transactions.map(mapAPITransaction);
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

async function addTransactionFromForm(e) {
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

  try {
    const data = await apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: type === 'income' ? 'receita' : 'despesa',
        amount: Math.abs(amount),
        date,
        category: category || null,
        note: note || null
      })
    });
    transactions.push(mapAPITransaction(data.transaction));
    renderTransactions(transactions, document.getElementById('filter').value);
    renderSummary(transactions);
    e.target.reset();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteTransaction(id) {
  try {
    await apiRequest(`/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    transactions = transactions.filter(transaction => transaction.id !== id);
    renderTransactions(transactions, document.getElementById('filter').value);
    renderSummary(transactions);
  } catch (error) {
    alert(error.message);
  }
}

function exportCSV() {
  if (!transactions.length) {
    alert('Nenhuma transação para exportar.');
    return;
  }
  const header = ['ID', 'Tipo', 'Valor', 'Data', 'Categoria', 'Observação'];
  const rows = transactions.map(t => [
    t.id,
    t.type === 'income' ? 'Receita' : 'Despesa',
    Number(t.amount).toFixed(2).replace('.', ','),
    formatDateForCSV(t.date),
    t.category,
    t.note
  ].map(csvSafe).join(';'));
  const csv = [header.map(csvSafe).join(';'), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  if (window.AndroidCsv && typeof window.AndroidCsv.saveCsv === 'function') {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      window.AndroidCsv.saveCsv('transacoes.csv', dataUrl.split(',')[1] || '');
    };
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transacoes.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDateForCSV(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '';
}

function importCSVFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const rows = parseCSV(ev.target.result);
    if (!rows.length) return;
    const header = rows.shift().map(normalizeCSVHeader);
    const fields = {
      type: ['type', 'tipo'],
      amount: ['amount', 'valor'],
      date: ['date', 'data'],
      category: ['category', 'categoria'],
      note: ['note', 'nota', 'observacao']
    };
    const columnIndexes = Object.fromEntries(
      Object.entries(fields).map(([field, aliases]) => [field, header.findIndex(value => aliases.includes(value))])
    );

    if (['type', 'amount', 'date'].some(field => columnIndexes[field] < 0)) {
      alert('O CSV precisa conter as colunas tipo, valor e data.');
      return;
    }

    const importedTransactions = [];
    for (const cols of rows) {
      const value = field => columnIndexes[field] < 0 ? '' : (cols[columnIndexes[field]] || '').trim();
      const rawAmount = value('amount');
      const amountText = rawAmount.includes(',')
        ? rawAmount.replace(/\./g, '').replace(',', '.')
        : rawAmount;
      const rawType = value('type').toLowerCase();
      const rawDate = value('date');
      const dateMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : rawDate;
      const amount = Number(amountText);
      const type = ['income', 'receita'].includes(rawType)
        ? 'receita'
        : ['expense', 'despesa'].includes(rawType) ? 'despesa' : null;

      if (!type || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        alert('O CSV contém uma linha com tipo, valor ou data inválidos. Nenhuma linha foi importada.');
        return;
      }

      importedTransactions.push({
        type,
        amount,
        date,
        category: value('category') || null,
        note: value('note') || null
      });
    }

    if (!importedTransactions.length) {
      alert('O CSV não contém transações para importar.');
      return;
    }

    let importedCount = 0;
    try {
      for (const transaction of importedTransactions) {
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify(transaction)
        });
        importedCount++;
      }
      transactions = await getTransactionsFromAPI();
      renderTransactions(transactions, document.getElementById('filter').value);
      renderSummary(transactions);
      alert(`Importação concluída: ${importedCount} transações.`);
    } catch (error) {
      try {
        transactions = await getTransactionsFromAPI();
        renderTransactions(transactions, document.getElementById('filter').value);
        renderSummary(transactions);
      } catch (refreshError) {
        console.error('Erro ao atualizar transações:', refreshError);
      }
      alert(`Importação interrompida após ${importedCount} de ${importedTransactions.length} transações. ${error.message}`);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function csvSafe(value) {
  if (value == null) return '';
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
}

function normalizeCSVHeader(value) {
  return String(value)
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseCSV(text) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  let commas = 0;
  let semicolons = 0;
  let quoted = false;

  for (let index = 0; index < input.length && input[index] !== '\n' && input[index] !== '\r'; index++) {
    const character = input[index];
    if (character === '"' && input[index + 1] === '"' && quoted) index++;
    else if (character === '"') quoted = !quoted;
    else if (!quoted && character === ',') commas++;
    else if (!quoted && character === ';') semicolons++;
  }

  const delimiter = semicolons > commas ? ';' : ',';
  const rows = [];
  let row = [];
  let value = '';
  quoted = false;

  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (character === '"' && quoted && input[index + 1] === '"') {
      value += '"';
      index++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      row.push(value);
      value = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && input[index + 1] === '\n') index++;
      row.push(value);
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some(cell => cell !== '')) rows.push(row);
  return rows;
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
    renderTransactions(transactions, e.target.value);
  });

  const categoryChartMode = document.getElementById('categoryChartMode');
  categoryChartMode.addEventListener('change', () => {
    renderSummary(transactions);
  });

  window.addEventListener('resize', () => {
    renderSummary(transactions);
  });

  getTransactionsFromAPI().then(data => {
    transactions = data;
    renderTransactions(transactions);
    renderSummary(transactions);
  }).catch(error => {
    console.error('Erro ao carregar transações:', error);
    alert(error.message);
  });
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

const backToLoginButton = document.getElementById('back-to-login');

backToLoginButton.addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.href = 'login.html';
});
