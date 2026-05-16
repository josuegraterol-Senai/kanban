const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines in private key (required for Vercel env vars)
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Auth Middleware ───────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ─── Seed Categories ──────────────────────────────────────────
const seedCategories = async () => {
  const snapshot = await db.collection('categories').get();
  if (snapshot.empty) {
    const batch = db.batch();
    const defaults = [
      { id: 'trabalho',  name: 'Trabalho',  color: '#EF4444' },
      { id: 'estudos',   name: 'Estudos',   color: '#3B82F6' },
      { id: 'pessoal',   name: 'Pessoal',   color: '#10B981' },
      { id: 'casa',      name: 'Casa',      color: '#F59E0B' },
    ];
    for (const cat of defaults) {
      batch.set(db.collection('categories').doc(cat.id), { name: cat.name, color: cat.color });
    }
    await batch.commit();
  }
};
seedCategories();

// ─── Auth Routes ──────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, avatarUrl } = req.body;
  try {
    const existing = await db.collection('users').where('email', '==', email).get();
    if (!existing.empty) return res.status(400).json({ error: 'Email já cadastrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userRef = db.collection('users').doc();
    await userRef.set({ name, email, password: passwordHash, avatarUrl: avatarUrl || null, createdAt: admin.firestore.FieldValue.serverTimestamp() });

    const token = jwt.sign({ userId: userRef.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userRef.id, name, email, avatarUrl: avatarUrl || null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) return res.status(400).json({ error: 'Credenciais inválidas' });

    const doc = snapshot.docs[0];
    const user = doc.data();
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ userId: doc.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: doc.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.userId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = doc.data();
    res.json({ id: doc.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// ─── Dashboard ────────────────────────────────────────────────
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const tasksRef = db.collection('tasks').where('userId', '==', req.userId);
    const allSnap = await tasksRef.get();
    const totalTasks = allSnap.size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = admin.firestore.Timestamp.fromDate(today);
    const nowTs = admin.firestore.Timestamp.now();

    const completedTodaySnap = await tasksRef
      .where('status', '==', 'DONE')
      .where('updatedAt', '>=', todayTs)
      .get();
    const completedToday = completedTodaySnap.size;

    const overdueSnap = await tasksRef.where('dueDate', '<', nowTs).get();
    const overdue = overdueSnap.docs.filter(d => ['TODO', 'DOING'].includes(d.data().status)).length;

    const upcomingSnap = await tasksRef
      .where('dueDate', '>=', nowTs)
      .orderBy('dueDate', 'asc')
      .limit(5)
      .get();

    const catIds = [...new Set(upcomingSnap.docs.map(d => d.data().categoryId).filter(Boolean))];
    const catMap = {};
    for (const cid of catIds) {
      const cDoc = await db.collection('categories').doc(cid).get();
      if (cDoc.exists) catMap[cid] = { id: cid, ...cDoc.data() };
    }
    const upcomingTasks = upcomingSnap.docs.map(d => ({
      id: d.id, ...d.data(), category: catMap[d.data().categoryId] || null
    }));

    // Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const snap = await tasksRef
        .where('status', '==', 'DONE')
        .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(date))
        .where('updatedAt', '<', admin.firestore.Timestamp.fromDate(nextDate))
        .get();
      last7Days.push({ date: date.toISOString(), count: snap.size });
    }

    res.json({ total: totalTasks, completedToday, overdue, upcomingTasks, last7Days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// ─── Tasks ────────────────────────────────────────────────────
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('tasks').where('userId', '==', req.userId).orderBy('createdAt', 'desc').get();
    const catIds = [...new Set(snap.docs.map(d => d.data().categoryId).filter(Boolean))];
    const catMap = {};
    for (const cid of catIds) {
      const cDoc = await db.collection('categories').doc(cid).get();
      if (cDoc.exists) catMap[cid] = { id: cid, ...cDoc.data() };
    }
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data(), category: catMap[d.data().categoryId] || null }));
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { title, description, dueDate, priority, status, categoryId, tags } = req.body;
  try {
    const taskRef = db.collection('tasks').doc();
    const taskData = {
      title,
      description: description || null,
      dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
      priority: priority || 'MEDIUM',
      status: status || 'TODO',
      categoryId: categoryId || null,
      tags: tags || [],
      userId: req.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await taskRef.set(taskData);
    const catDoc = categoryId ? await db.collection('categories').doc(categoryId).get() : null;
    const category = catDoc && catDoc.exists ? { id: catDoc.id, ...catDoc.data() } : null;
    res.json({ id: taskRef.id, ...taskData, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, priority, status, categoryId } = req.body;
  try {
    const taskRef = db.collection('tasks').doc(id);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists || taskDoc.data().userId !== req.userId)
      return res.status(404).json({ error: 'Tarefa não encontrada' });

    const updates = {
      title, description,
      dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
      priority, status,
      categoryId: categoryId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await taskRef.update(updates);
    const catDoc = categoryId ? await db.collection('categories').doc(categoryId).get() : null;
    const category = catDoc && catDoc.exists ? { id: catDoc.id, ...catDoc.data() } : null;
    res.json({ id, ...taskDoc.data(), ...updates, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const taskRef = db.collection('tasks').doc(id);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists || taskDoc.data().userId !== req.userId)
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    await taskRef.delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar tarefa' });
  }
});

// ─── Categories ───────────────────────────────────────────────
app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('categories').get();
    const categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// ─── Tags ─────────────────────────────────────────────────────
app.get('/api/tags', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('tasks').where('userId', '==', req.userId).get();
    const tagsSet = new Set();
    snap.docs.forEach(d => (d.data().tags || []).forEach(t => tagsSet.add(t)));
    res.json([...tagsSet].map(name => ({ name })));
  } catch {
    res.status(500).json({ error: 'Erro ao buscar tags' });
  }
});

// Export for Vercel serverless
module.exports = app;
