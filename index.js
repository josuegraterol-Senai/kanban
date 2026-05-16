require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const path = require('path');

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
  try {
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
  } catch (err) {
    console.warn("⚠️ Não foi possível semear categorias. O banco Firestore foi criado no console? Erro:", err.message);
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
    res.json({ id: doc.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, theme: user.theme || 'dark', notifications: user.notifications ?? true });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

app.put('/api/auth/settings', authMiddleware, async (req, res) => {
  const { name, avatarUrl, theme, notifications } = req.body;
  try {
    const userRef = db.collection('users').doc(req.userId);
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (theme !== undefined) updates.theme = theme;
    if (notifications !== undefined) updates.notifications = notifications;
    
    await userRef.update(updates);
    const doc = await userRef.get();
    const user = doc.data();
    res.json({ id: doc.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, theme: user.theme || 'dark', notifications: user.notifications ?? true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// ─── Dashboard ────────────────────────────────────────────────
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const tasksSnap = await db.collection('tasks').where('userId', '==', req.userId).get();
    const allTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalTasks = allTasks.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const completedToday = allTasks.filter(t => {
      if (t.status !== 'DONE') return false;
      const updatedDate = t.updatedAt?.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt || 0);
      return updatedDate >= today;
    }).length;

    const overdue = allTasks.filter(t => {
      if (!['TODO', 'DOING'].includes(t.status)) return false;
      if (!t.dueDate) return false;
      const dueDate = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      return dueDate < now;
    }).length;

    // Upcoming tasks (dueDate >= now, ordered by dueDate asc, limit 5)
    const upcomingCandidates = allTasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      return dueDate >= now;
    });
    upcomingCandidates.sort((a, b) => {
      const dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      const dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
      return dateA - dateB;
    });
    const upcomingSlice = upcomingCandidates.slice(0, 5);

    const catIds = [...new Set(upcomingSlice.map(t => t.categoryId).filter(Boolean))];
    const catMap = {};
    for (const cid of catIds) {
      const cDoc = await db.collection('categories').doc(cid).get();
      if (cDoc.exists) catMap[cid] = { id: cid, ...cDoc.data() };
    }
    const upcomingTasks = upcomingSlice.map(t => ({
      ...t,
      dueDate: t.dueDate?.toDate ? t.dueDate.toDate().toISOString() : t.dueDate,
      createdAt: t.createdAt?.toDate ? t.createdAt.toDate().toISOString() : t.createdAt,
      updatedAt: t.updatedAt?.toDate ? t.updatedAt.toDate().toISOString() : t.updatedAt,
      category: catMap[t.categoryId] || null
    }));

    // Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const count = allTasks.filter(t => {
        if (t.status !== 'DONE') return false;
        const updatedDate = t.updatedAt?.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt || 0);
        return updatedDate >= date && updatedDate < nextDate;
      }).length;

      last7Days.push({ date: date.toISOString(), count });
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
    const snap = await db.collection('tasks').where('userId', '==', req.userId).get();
    const tasksData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tasksData.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const catIds = [...new Set(tasksData.map(t => t.categoryId).filter(Boolean))];
    const catMap = {};
    for (const cid of catIds) {
      const cDoc = await db.collection('categories').doc(cid).get();
      if (cDoc.exists) catMap[cid] = { id: cid, ...cDoc.data() };
    }
    const tasks = tasksData.map(t => ({
      ...t,
      dueDate: t.dueDate?.toDate ? t.dueDate.toDate().toISOString() : t.dueDate,
      createdAt: t.createdAt?.toDate ? t.createdAt.toDate().toISOString() : t.createdAt,
      updatedAt: t.updatedAt?.toDate ? t.updatedAt.toDate().toISOString() : t.updatedAt,
      category: catMap[t.categoryId] || null
    }));
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
    res.json({ 
      id: taskRef.id, 
      ...taskData, 
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      category 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, priority, status, categoryId, tags } = req.body;
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
      tags: tags || [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await taskRef.update(updates);
    const catDoc = categoryId ? await db.collection('categories').doc(categoryId).get() : null;
    const category = catDoc && catDoc.exists ? { id: catDoc.id, ...catDoc.data() } : null;
    res.json({ 
      id, 
      ...taskDoc.data(), 
      ...updates, 
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      category 
    });
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

app.post('/api/categories', authMiddleware, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
  try {
    const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const catRef = db.collection('categories').doc(id);
    const doc = await catRef.get();
    if (doc.exists) return res.status(400).json({ error: 'Categoria já existe' });

    const newCat = { name, color: color || '#3B82F6' };
    await catRef.set(newCat);
    res.json({ id, ...newCat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    const catRef = db.collection('categories').doc(id);
    const doc = await catRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Categoria não encontrada' });

    const updates = { name, color };
    await catRef.update(updates);
    res.json({ id, ...updates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const catRef = db.collection('categories').doc(id);
    const doc = await catRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Categoria não encontrada' });

    // Migrar tarefas desta categoria para 'pessoal'
    const tasksSnap = await db.collection('tasks').where('categoryId', '==', id).get();
    if (!tasksSnap.empty) {
      const batch = db.batch();
      tasksSnap.docs.forEach(taskDoc => {
        batch.update(taskDoc.ref, { categoryId: 'pessoal', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
    }

    await catRef.delete();
    res.json({ success: true, message: 'Categoria excluída e tarefas migradas para Pessoal' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
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

// ─── Frontend App (Static) ────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Export for Vercel serverless (if needed)
module.exports = app;
