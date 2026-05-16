import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Tag as TagIcon, X, ChevronRight, ChevronLeft, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Tasks({ api }) {
  const [tasks, setTasks] = useState(() => {
    try {
      const cached = localStorage.getItem('tasksCache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('categoriesCache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('tasksCache');
    } catch {
      return true;
    }
  });
  
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [error, setError] = useState('');
  
  const initialForm = { title: '', description: '', priority: 'MEDIUM', categoryId: '', dueDate: '', tags: [], status: 'TODO' };
  const [formData, setFormData] = useState(initialForm);
  const [tagInput, setTagInput] = useState('');

  const [draggingTask, setDraggingTask] = useState(null);

  // Sincroniza tasks com localStorage sempre que mudar
  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem('tasksCache')) {
      try {
        localStorage.setItem('tasksCache', JSON.stringify(tasks));
      } catch (err) {
        console.error('Erro ao salvar tasksCache', err);
      }
    }
  }, [tasks]);

  // Sincroniza categories com localStorage sempre que mudar
  useEffect(() => {
    if (categories.length > 0 || localStorage.getItem('categoriesCache')) {
      try {
        localStorage.setItem('categoriesCache', JSON.stringify(categories));
      } catch (err) {
        console.error('Erro ao salvar categoriesCache', err);
      }
    }
  }, [categories]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (tasks.length === 0 && !localStorage.getItem('tasksCache')) {
      setLoading(true);
    }
    try {
      const [tasksRes, catsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/categories')
      ]);
      setTasks(tasksRes.data);
      setCategories(catsRes.data);
      if (catsRes.data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: catsRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (task, newStatus) => {
    const previousStatus = task.status;
    // Atualização otimista imediata na UI
    setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      const res = await api.put(`/tasks/${task.id}`, { ...task, status: newStatus });
      setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? res.data : t));
    } catch (err) {
      console.error(err);
      // Rollback em caso de falha
      setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, status: previousStatus } : t));
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete;
    const taskBackup = tasks.find(t => t.id === taskId);
    
    // Atualização otimista
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    setTaskToDelete(null);

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      console.error(err);
      setError('Erro ao excluir tarefa.');
      if (taskBackup) {
        setTasks(prevTasks => [taskBackup, ...prevTasks]);
      }
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task.id);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      categoryId: task.categoryId || (categories.length > 0 ? categories[0].id : ''),
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      tags: task.tags ? task.tags.map(t => t.name) : [],
      status: task.status
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({ ...initialForm, categoryId: categories.length > 0 ? categories[0].id : '' });
    setTagInput('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('O título da tarefa é obrigatório.');
      return;
    }

    try {
      if (editingTask) {
        const taskBackup = tasks.find(t => t.id === editingTask);
        const optimisticUpdatedTask = { 
          ...taskBackup, 
          ...formData, 
          category: categories.find(c => c.id === formData.categoryId) || taskBackup?.category 
        };
        
        setTasks(prevTasks => prevTasks.map(t => t.id === editingTask ? optimisticUpdatedTask : t));
        closeModal();

        const res = await api.put(`/tasks/${editingTask}`, formData);
        setTasks(prevTasks => prevTasks.map(t => t.id === editingTask ? res.data : t));
      } else {
        const tempId = 'temp-' + Date.now();
        const optimisticNewTask = {
          id: tempId,
          ...formData,
          category: categories.find(c => c.id === formData.categoryId),
          dueDate: formData.dueDate || null,
          createdAt: new Date().toISOString()
        };

        setTasks(prevTasks => [optimisticNewTask, ...prevTasks]);
        closeModal();

        const res = await api.post('/tasks', formData);
        setTasks(prevTasks => prevTasks.map(t => t.id === tempId ? res.data : t));
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar tarefa.');
      loadData();
    }
  };

  const addTag = (e) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().toLowerCase();
    if (cleanTag && !formData.tags.includes(cleanTag)) {
      setFormData({ ...formData, tags: [...formData.tags, cleanTag] });
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'HIGH': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'MEDIUM': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'LOW': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-muted-foreground';
    }
  };

  const columns = [
    { id: 'TODO', title: 'Fazer', color: 'bg-[#00C2CB]', textColor: 'text-white' },
    { id: 'DOING', title: 'Fazendo', color: 'bg-[#8A2BE2]', textColor: 'text-white' },
    { id: 'DONE', title: 'Feito', color: 'bg-[#FFA500]', textColor: 'text-white' }
  ];

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingTask(taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessário para permitir o drop
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setDraggingTask(null);
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateTaskStatus(task, newStatus);
    }
  };

  return (
    <div className="p-8 h-screen flex flex-col overflow-hidden">
      <header className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Quadro Kanban</h1>
          <p className="text-muted-foreground">Arraste e solte ou use os botões para mover suas tarefas.</p>
        </div>
        <button 
          onClick={() => { closeModal(); setShowModal(true); }}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Nova Tarefa
        </button>
      </header>

      {loading ? (
        <div className="flex gap-6 h-full overflow-hidden">
          {[1,2,3].map(i => <div key={i} className="flex-1 bg-card/20 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="flex gap-6 h-full overflow-x-auto pb-4 items-start">
          {columns.map(col => (
            <div 
              key={col.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-1 min-w-[320px] max-w-[400px] h-full flex flex-col bg-card/30 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-2xl transition-colors ${draggingTask ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
            >
              <div className={`${col.color} p-4 flex items-center justify-between shadow-lg relative`}>
                <h2 className={`font-black text-lg uppercase tracking-wider ${col.textColor}`}>{col.title}</h2>
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45" style={{ backgroundColor: 'inherit' }}></div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {tasks.filter(t => t.status === col.id).map(task => (
                  <div 
                    key={task.id} 
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={`group bg-card border border-border/50 p-4 rounded-xl shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 relative overflow-hidden cursor-grab active:cursor-grabbing ${draggingTask === task.id ? 'opacity-40 border-dashed border-primary scale-95' : ''}`}
                  >
                    {/* Priority Indicator */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      task.priority === 'HIGH' ? 'bg-red-500' : task.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></div>

                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{task.title}</h4>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(task)} className="p-1 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {task.category && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                          {task.category.name}
                        </span>
                      )}
                      {task.tags?.map(tag => (
                        <span key={tag.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          #{tag.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                        <Calendar size={12} />
                        {task.dueDate ? format(new Date(task.dueDate), "dd MMM", { locale: ptBR }) : 'Sem data'}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {col.id !== 'TODO' && (
                          <button 
                            onClick={() => updateTaskStatus(task, col.id === 'DOING' ? 'TODO' : 'DOING')}
                            className="p-1.5 bg-muted rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                          >
                            <ChevronLeft size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => setTaskToDelete(task.id)}
                          className="p-1.5 bg-muted rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        {col.id !== 'DONE' && (
                          <button 
                            onClick={() => updateTaskStatus(task, col.id === 'TODO' ? 'DOING' : 'DONE')}
                            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                          >
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.status === col.id).length === 0 && (
                  <div className="h-24 border-2 border-dashed border-border/30 rounded-xl flex items-center justify-center text-muted-foreground/50 text-xs italic">
                    Solte aqui ou use o "+"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova/Editar Tarefa */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-6">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            
            {error && (
              <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 ml-1">Título</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="O que precisa ser feito?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1 ml-1">Descrição</label>
                <textarea 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows="3"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Adicione mais detalhes..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 ml-1">Categoria</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.categoryId}
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 ml-1">Status</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="TODO">Fazer</option>
                    <option value="DOING">Fazendo</option>
                    <option value="DONE">Feito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 ml-1">Prioridade</label>
                <div className="flex gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p})}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                        formData.priority === p 
                        ? p === 'HIGH' ? 'bg-red-500 border-red-500 text-white' : p === 'MEDIUM' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {p === 'HIGH' ? 'ALTA' : p === 'MEDIUM' ? 'MÉDIA' : 'BAIXA'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 ml-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    placeholder="aperte Enter"
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(e); } }}
                  />
                  <button type="button" onClick={addTag} className="bg-accent px-4 rounded-xl hover:bg-accent/80">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-full">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-bold mb-1 ml-1">Prazo</label>
                <input 
                  type="date" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30"
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl hover:bg-accent transition-colors font-bold text-sm">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all font-bold text-sm shadow-lg shadow-primary/20">
                  {editingTask ? 'Atualizar' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h2 className="text-2xl font-black mb-2">Excluir?</h2>
            <p className="text-muted-foreground mb-8 text-sm">Deseja remover permanentemente esta tarefa do seu quadro?</p>
            
            <div className="flex justify-center gap-4">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors font-bold text-sm">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold text-sm shadow-lg shadow-red-500/20">
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
