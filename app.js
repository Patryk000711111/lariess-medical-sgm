const state = {
  token: null,
  user: null,
  users: [],
  telemetry: {},
  tasks: [],
  chatMessages: [],
  gasBoxes: [],
  outlets: [],
  dailyLogs: [],
  audits: [],
  documents: []
};

const socket = io();

function fmtDate(value) {
  return new Date(value).toLocaleString('pl-PL');
}

function renderPresence() {
  const el = document.getElementById('presenceList');
  el.innerHTML = state.users.map(u => `
    <div class="flex items-center justify-between rounded-2xl border border-slate-200 p-3 bg-white">
      <div>
        <div class="font-bold text-slate-800">${u.name}</div>
        <div class="text-xs uppercase font-black text-slate-400">${u.role}</div>
      </div>
      <span class="text-xs font-black uppercase ${u.online ? 'text-emerald-600' : 'text-slate-400'}">${u.online ? 'online' : 'offline'}</span>
    </div>
  `).join('');
}

function renderTelemetry() {
  document.getElementById('telemetryO2').textContent = `${state.telemetry.O2.left} / ${state.telemetry.O2.right} BAR`;
  document.getElementById('telemetryN2O').textContent = `${state.telemetry.N2O.left} / ${state.telemetry.N2O.right} / ${state.telemetry.N2O.emergency}`;
  document.getElementById('telemetryAIR').textContent = `${state.telemetry.AIR.value} BAR`;
  document.getElementById('telemetryVAC').textContent = `${state.telemetry.VAC.value} BAR`;
}

function renderTasks() {
  document.getElementById('taskCount').textContent = `${state.tasks.length} aktywnych`;
  document.getElementById('tasksList').innerHTML = state.tasks.map(t => `
    <div class="border border-slate-200 rounded-2xl p-4 bg-white">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="font-black text-slate-800">${t.id} · ${t.locationId}</div>
          <div class="text-sm text-slate-600 mt-1">${t.description}</div>
          <div class="text-xs uppercase font-black text-slate-400 mt-2">${t.assignee} · ${fmtDate(t.createdAt)}</div>
        </div>
        <div class="text-right">
          <div class="text-xs uppercase font-black ${t.status === 'ZAKOŃCZONE' ? 'text-emerald-600' : t.status === 'W TRAKCIE' ? 'text-violet-600' : 'text-slate-500'}">${t.status}</div>
          <button class="btn mt-3 bg-slate-800 text-white" onclick="advanceTask('${t.id}','${t.status}')">Zmień status</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderChat() {
  const el = document.getElementById('chatList');
  el.innerHTML = state.chatMessages.map(m => `
    <div class="rounded-2xl ${m.user === state.user.name ? 'bg-blue-700 text-white ml-8' : 'bg-slate-100 text-slate-800 mr-8'} p-3">
      <div class="text-xs font-black uppercase ${m.user === state.user.name ? 'text-blue-100' : 'text-slate-400'}">${m.user}</div>
      <div class="mt-1 text-sm font-semibold">${m.text}</div>
      <div class="mt-2 text-[11px] ${m.user === state.user.name ? 'text-blue-100' : 'text-slate-400'}">${fmtDate(m.createdAt)}</div>
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function renderBoxes() {
  document.getElementById('boxesList').innerHTML = state.gasBoxes.map(b => `
    <div class="rounded-2xl border ${b.status === 'AWARIA' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'} p-4">
      <div class="font-black text-slate-800">${b.id}</div>
      <div class="text-xs uppercase font-black text-slate-400 mt-1">${b.ward} · Budynek ${b.building}</div>
      <div class="text-sm text-slate-600 mt-2">${b.gases.join(', ')}</div>
      <div class="text-xs font-black uppercase mt-2 ${b.status === 'AWARIA' ? 'text-red-600' : 'text-emerald-600'}">${b.status}</div>
      <div class="text-xs text-slate-500 mt-1">${b.notes}</div>
    </div>
  `).join('');
}

function renderOutlets() {
  document.getElementById('outletsList').innerHTML = state.outlets.map(o => `
    <div class="rounded-2xl border ${o.status === 'AWARIA' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'} p-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="font-black text-slate-800">${o.roomId} · ${o.label}</div>
          <div class="text-xs uppercase font-black text-slate-400 mt-1">${o.id} · ${o.gasType} · ${o.producer}</div>
          <div class="text-sm text-slate-600 mt-2">${o.roomName} / ${o.ward}</div>
        </div>
        <button class="btn bg-blue-700 text-white" onclick="openOutletForm('${o.id}')">Dodaj wpis</button>
      </div>
      <div class="mt-3 space-y-2">
        ${o.history.slice(0,3).map(h => `
          <div class="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div class="text-xs uppercase font-black text-slate-400">${h.author} · ${fmtDate(h.createdAt)}</div>
            <div class="text-sm font-semibold text-slate-700 mt-1">${h.note}</div>
          </div>
        `).join('') || '<div class="text-sm text-slate-400">Brak wpisów.</div>'}
      </div>
    </div>
  `).join('');
}

function renderLogs() {
  document.getElementById('logsList').innerHTML = state.dailyLogs.map(l => `
    <div class="rounded-2xl border border-slate-200 p-4 bg-white">
      <div class="font-black text-slate-800">${l.type}</div>
      <div class="text-xs uppercase font-black text-slate-400 mt-1">${l.author} · ${fmtDate(l.createdAt)}</div>
      <pre class="text-xs text-slate-600 mt-2 whitespace-pre-wrap">${JSON.stringify(l.values, null, 2)}</pre>
    </div>
  `).join('');
}

function renderAudits() {
  document.getElementById('auditsList').innerHTML = state.audits.map(a => `
    <div class="rounded-2xl border border-slate-200 p-4 bg-white">
      <div class="font-black text-slate-800">${a.id}</div>
      <div class="text-sm text-slate-600 mt-1">${a.type}</div>
      <div class="text-xs uppercase font-black text-slate-400 mt-2">${a.gas} · ${a.building} · ${a.date}</div>
      <div class="text-xs font-black uppercase mt-2 ${a.status === 'Wykonany' ? 'text-emerald-600' : 'text-amber-600'}">${a.status}</div>
    </div>
  `).join('');
}

function renderDocuments() {
  document.getElementById('documentsList').innerHTML = state.documents.map(d => `
    <a class="block rounded-2xl border border-slate-200 p-4 bg-white hover:border-blue-300" href="${d.url}" target="_blank">
      <div class="font-black text-slate-800">${d.name}</div>
      <div class="text-xs uppercase font-black text-slate-400 mt-1">${d.linkedTo || 'bez powiązania'} · ${fmtDate(d.createdAt)}</div>
    </a>
  `).join('');
}

function renderAll() {
  renderPresence();
  renderTelemetry();
  renderTasks();
  renderChat();
  renderBoxes();
  renderOutlets();
  renderLogs();
  renderAudits();
  renderDocuments();
}

async function bootstrap() {
  const res = await fetch('/api/bootstrap');
  const data = await res.json();
  Object.assign(state, data);
  renderAll();
}

async function login() {
  const name = document.getElementById('loginName').value.trim();
  if (!name) return alert('Wpisz nazwę użytkownika');
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Błąd logowania');
  state.token = data.token;
  state.user = data.user;
  document.getElementById('currentUser').textContent = `${state.user.name} · ${state.user.role}`;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  await bootstrap();
}

document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch('/api/documents', { method: 'POST', body: formData });
  if (!res.ok) return alert('Nie udało się wysłać dokumentu');
  e.target.reset();
});

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: state.user.name, text })
  });
  input.value = '';
}

async function advanceTask(id, status) {
  const next = status === 'DO ZROBIENIA' ? 'W TRAKCIE' : status === 'W TRAKCIE' ? 'ZAKOŃCZONE' : 'DO ZROBIENIA';
  await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: next })
  });
}

async function saveTelemetry(type) {
  let payload;
  if (type === 'O2') {
    const left = prompt('O2 rampa lewa', state.telemetry.O2.left);
    const right = prompt('O2 rampa prawa', state.telemetry.O2.right);
    payload = { left: Number(left), right: Number(right), author: state.user.name };
  } else if (type === 'N2O') {
    const left = prompt('N2O lewa', state.telemetry.N2O.left);
    const right = prompt('N2O prawa', state.telemetry.N2O.right);
    const emergency = prompt('N2O awaryjna', state.telemetry.N2O.emergency);
    payload = { left: Number(left), right: Number(right), emergency: Number(emergency), author: state.user.name };
  } else if (type === 'AIR') {
    const value = prompt('AIR', state.telemetry.AIR.value);
    payload = { value: Number(value), author: state.user.name };
  } else {
    const value = prompt('VAC', state.telemetry.VAC.value);
    payload = { value: Number(value), author: state.user.name };
  }
  await fetch(`/api/telemetry/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function openTaskForm() {
  const assignee = prompt('Przypisz do', 'Andrzej Czerwiec');
  const locationId = prompt('Lokalizacja', 'C107');
  const description = prompt('Opis zadania', 'Nowe zadanie SGM');
  if (!assignee || !locationId || !description) return;
  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignee, locationId, description })
  });
}

async function openOutletForm(outletId) {
  const targetId = outletId || prompt('ID gniazda', state.outlets[0]?.id || 'C107-O2-1');
  if (!targetId) return;
  const note = prompt('Dodaj wpis do historii', 'Wymiana szybkozłącza / kontrola szczelności');
  if (!note) return;
  const producer = prompt('Producent', 'AGA');
  const mountType = prompt('Rodzaj montażu', 'Panel nadłóżkowy');
  const status = prompt('Status', 'OK');
  await fetch(`/api/outlets/${targetId}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: state.user.name, note, producer, mountType, status })
  });
}

async function openAuditForm() {
  const type = prompt('Typ audytu', 'Roczny Przegląd Okresowy');
  const gas = prompt('Gaz', 'O2');
  const building = prompt('Obiekt', 'Tlenownia');
  const date = prompt('Data (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
  if (!type || !gas || !building || !date) return;
  await fetch('/api/audits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, gas, building, date })
  });
}

socket.on('presence:update', users => {
  state.users = users;
  renderPresence();
});
socket.on('tasks:update', tasks => {
  state.tasks = tasks;
  renderTasks();
});
socket.on('chat:new', message => {
  state.chatMessages.push(message);
  renderChat();
});
socket.on('telemetry:update', telemetry => {
  state.telemetry = telemetry;
  renderTelemetry();
});
socket.on('dailyLogs:update', dailyLogs => {
  state.dailyLogs = dailyLogs;
  renderLogs();
});
socket.on('outlets:update', outlets => {
  state.outlets = outlets;
  renderOutlets();
});
socket.on('audits:update', audits => {
  state.audits = audits;
  renderAudits();
});
socket.on('documents:update', documents => {
  state.documents = documents;
  renderDocuments();
});
