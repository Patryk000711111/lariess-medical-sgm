const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const multer = require('multer');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

const DB_PATH = path.join(__dirname, 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const seed = {
  users: [
    { id: 'U1', name: 'Patryk Dejek', role: 'Administrator', permissions: ['ALL'], online: false },
    { id: 'U2', name: 'Andrzej Czerwiec', role: 'Technik', permissions: ['TASKS', 'LOGS', 'OUTLETS'], online: false },
    { id: 'U3', name: 'Piotr Rama', role: 'Technik', permissions: ['TASKS', 'LOGS', 'OUTLETS'], online: false },
    { id: 'U4', name: 'Janusz Kamiński', role: 'Inżynier', permissions: ['AUDITS', 'DOCS', 'REPORTS'], online: false }
  ],
  telemetry: {
    O2: { left: 4.82, right: 4.85, updatedAt: new Date().toISOString() },
    N2O: { left: 4.50, right: 4.48, emergency: 4.52, updatedAt: new Date().toISOString() },
    AIR: { value: 5.10, updatedAt: new Date().toISOString() },
    VAC: { value: -0.80, updatedAt: new Date().toISOString() }
  },
  tasks: [
    { id: 'Z-101', assignee: 'Andrzej Czerwiec', locationId: 'C107', description: 'Naprawa gniazda O2. Nieszczelność tlenu.', status: 'W TRAKCIE', createdAt: new Date().toISOString() },
    { id: 'Z-102', assignee: 'Piotr Rama', locationId: 'L.C117/4', description: 'Wymiana uszczelnień w skrzynce O2/VAC.', status: 'DO ZROBIENIA', createdAt: new Date().toISOString() }
  ],
  chatMessages: [
    { id: uuidv4(), user: 'Andrzej Czerwiec', text: 'Panowie, na C107 lekko syczy tlen z punktu. Ktoś to ostatnio serwisował?', createdAt: new Date().toISOString() },
    { id: uuidv4(), user: 'Piotr Rama', text: 'Nie, ja wymieniałem filtry na maszynowni. Możesz wejść w paszport gniazda i sprawdzić oś czasu.', createdAt: new Date().toISOString() }
  ],
  gasBoxes: [
    { id: 'L.A136/1', building: 'A', ward: 'SALE CHORYCH', gases: ['O2', 'VAC'], status: 'POZYTYWNY', notes: 'BRAK', producer: 'INSMED' },
    { id: 'L.C117/4', building: 'C', ward: 'WEWNĘTRZNY A', gases: ['O2', 'VAC'], status: 'AWARIA', notes: 'NIESZCZELNOŚĆ O2/VAC', producer: 'AGA' },
    { id: 'P.D120', building: 'D', ward: 'OIOM', gases: ['O2', 'AIR'], status: 'AWARIA', notes: 'NS DO MANOMETRÓW O2/AIR', producer: 'DIN' }
  ],
  outlets: [
    { id: 'A015-O2-1', roomId: 'A015', roomName: 'SALE CHORYCH', ward: 'CHORÓB WEWNĘTRZNYCH', gasType: 'O2', label: 'O2 #1', status: 'OK', producer: 'AGA', mountType: 'Panel nadłóżkowy', history: [] },
    { id: 'C107-O2-1', roomId: 'C107', roomName: 'SALA ZABIEGOWA', ward: 'CHIRURGIA', gasType: 'O2', label: 'O2 #1', status: 'AWARIA', producer: 'AGA', mountType: 'Panel nadłóżkowy', history: [
      { id: uuidv4(), author: 'Serwis Zewnętrzny', note: 'Roczny przegląd okresowy SGM. Sprawdzenie szczelności. Wynik: Pozytywny.', createdAt: new Date().toISOString() }
    ] },
    { id: 'C107-VAC-1', roomId: 'C107', roomName: 'SALA ZABIEGOWA', ward: 'CHIRURGIA', gasType: 'VAC', label: 'VAC #1', status: 'OK', producer: 'DIN', mountType: 'Gniazdo naścienne', history: [] }
  ],
  dailyLogs: [],
  audits: [
    { id: 'PRZ-001', type: 'Roczny Przegląd Okresowy', gas: 'AIR', building: 'Sprężarkownia Główna', date: '2025-01-27', status: 'Wykonany' },
    { id: 'PRZ-003', type: 'Badanie Czystości Gazu', gas: 'O2', building: 'Tlenownia', date: '2026-05-10', status: 'Zaplanowany' }
  ],
  documents: [],
  sessions: []
};

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return structuredClone(seed);
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function withDb(handler) {
  return (req, res) => {
    try {
      const db = loadDb();
      handler(req, res, db);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  }
});
const upload = multer({ storage });

app.post('/api/auth/login', withDb((req, res, db) => {
  const { name } = req.body;
  const user = db.users.find(u => u.name.toLowerCase() === String(name || '').trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Nie znaleziono użytkownika' });
  const token = uuidv4();
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  user.online = true;
  saveDb(db);
  io.emit('presence:update', db.users);
  res.json({ token, user });
}));

app.get('/api/bootstrap', withDb((_req, res, db) => {
  res.json({
    users: db.users,
    telemetry: db.telemetry,
    tasks: db.tasks,
    chatMessages: db.chatMessages,
    gasBoxes: db.gasBoxes,
    outlets: db.outlets,
    dailyLogs: db.dailyLogs,
    audits: db.audits,
    documents: db.documents
  });
}));

app.post('/api/tasks', withDb((req, res, db) => {
  const task = {
    id: `Z-${String(db.tasks.length + 101).padStart(3, '0')}`,
    assignee: req.body.assignee,
    locationId: req.body.locationId,
    description: req.body.description,
    status: req.body.status || 'DO ZROBIENIA',
    createdAt: new Date().toISOString()
  };
  db.tasks.unshift(task);
  saveDb(db);
  io.emit('tasks:update', db.tasks);
  res.status(201).json(task);
}));

app.patch('/api/tasks/:id', withDb((req, res, db) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.status = req.body.status || task.status;
  saveDb(db);
  io.emit('tasks:update', db.tasks);
  res.json(task);
}));

app.post('/api/chat', withDb((req, res, db) => {
  const message = {
    id: uuidv4(),
    user: req.body.user,
    text: req.body.text,
    createdAt: new Date().toISOString()
  };
  db.chatMessages.push(message);
  saveDb(db);
  io.emit('chat:new', message);
  res.status(201).json(message);
}));

app.post('/api/telemetry/:type', withDb((req, res, db) => {
  const type = req.params.type.toUpperCase();
  const payload = req.body;
  if (!db.telemetry[type]) return res.status(404).json({ error: 'Telemetry type not found' });
  db.telemetry[type] = { ...db.telemetry[type], ...payload, updatedAt: new Date().toISOString() };
  const log = {
    id: uuidv4(),
    type,
    values: payload,
    author: req.body.author || 'Nieznany',
    createdAt: new Date().toISOString()
  };
  db.dailyLogs.unshift(log);
  saveDb(db);
  io.emit('telemetry:update', db.telemetry);
  io.emit('dailyLogs:update', db.dailyLogs);
  res.json(db.telemetry[type]);
}));

app.post('/api/outlets/:id/history', withDb((req, res, db) => {
  const outlet = db.outlets.find(o => o.id === req.params.id);
  if (!outlet) return res.status(404).json({ error: 'Outlet not found' });
  const entry = {
    id: uuidv4(),
    author: req.body.author,
    note: req.body.note,
    createdAt: new Date().toISOString()
  };
  outlet.history.unshift(entry);
  if (req.body.producer) outlet.producer = req.body.producer;
  if (req.body.mountType) outlet.mountType = req.body.mountType;
  if (req.body.status) outlet.status = req.body.status;
  saveDb(db);
  io.emit('outlets:update', db.outlets);
  res.status(201).json(entry);
}));

app.post('/api/audits', withDb((req, res, db) => {
  const audit = {
    id: `PRZ-${String(db.audits.length + 1).padStart(3, '0')}`,
    type: req.body.type,
    gas: req.body.gas,
    building: req.body.building,
    date: req.body.date,
    status: req.body.status || 'Zaplanowany'
  };
  db.audits.unshift(audit);
  saveDb(db);
  io.emit('audits:update', db.audits);
  res.status(201).json(audit);
}));

app.post('/api/documents', upload.single('file'), withDb((req, res, db) => {
  const doc = {
    id: uuidv4(),
    name: req.body.name || req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    linkedTo: req.body.linkedTo || '',
    createdAt: new Date().toISOString()
  };
  db.documents.unshift(doc);
  saveDb(db);
  io.emit('documents:update', db.documents);
  res.status(201).json(doc);
}));

io.on('connection', socket => {
  socket.emit('connected', { ok: true, id: socket.id });
});

server.listen(PORT, () => {
  console.log(`L'ariess Medical online server running on http://localhost:${PORT}`);
});
