import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Grid, Check, X, AlertTriangle } from 'lucide-react';

export default function Categories({ api }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initialForm = { name: '', color: '#3B82F6' };
  const [formData, setFormData] = useState(initialForm);

  const colors = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Amarelo', value: '#F59E0B' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Índigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' },
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData(initialForm);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat.id);
    setFormData({ name: cat.name, color: cat.color });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(initialForm);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('O nome da categoria é obrigatório.');
      return;
    }

    try {
      if (editingCategory) {
        const res = await api.put(`/categories/${editingCategory}`, formData);
        setCategories(categories.map(c => c.id === editingCategory ? { ...c, ...res.data } : c));
        setSuccess('Categoria atualizada com sucesso!');
      } else {
        const res = await api.post('/categories', formData);
        setCategories([...categories, res.data]);
        setSuccess('Categoria criada com sucesso!');
      }
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Erro ao salvar categoria.');
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await api.delete(`/categories/${categoryToDelete.id}`);
      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      setSuccess('Categoria excluída. As tarefas foram migradas para Pessoal.');
      setCategoryToDelete(null);
    } catch (err) {
      console.error(err);
      setError('Erro ao excluir categoria.');
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
            <Grid className="text-primary" size={36} />
            Categorias
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerencie as categorias para organizar suas tarefas.
          </p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Nova Categoria
        </button>
      </header>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-2xl mb-8 flex items-center gap-3 font-medium shadow-lg animate-fade-in">
          <Check size={20} />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl mb-8 flex items-center gap-3 font-medium shadow-lg animate-fade-in">
          <X size={20} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-card/40 rounded-2xl animate-pulse border border-border/50"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => (
            <div 
              key={cat.id} 
              className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: cat.color }}></div>
              
              <div className="flex items-center justify-between mb-4 pl-2">
                <h3 className="text-xl font-bold tracking-tight">{cat.name}</h3>
                <span className="w-6 h-6 rounded-full border border-border shadow-inner" style={{ backgroundColor: cat.color }}></span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/50 mt-4 opacity-80 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditModal(cat)}
                  className="p-2 bg-muted rounded-xl hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <Edit2 size={14} /> Editar
                </button>
                <button 
                  onClick={() => setCategoryToDelete(cat)}
                  className="p-2 bg-muted rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full py-16 text-center bg-card/30 border border-dashed border-border rounded-2xl">
              <p className="text-muted-foreground text-lg mb-4">Nenhuma categoria cadastrada.</p>
              <button onClick={openAddModal} className="text-primary font-bold hover:underline flex items-center gap-1 mx-auto">
                <Plus size={18} /> Criar a primeira categoria
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova/Editar Categoria */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h2 className="text-xl font-bold mb-6">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 ml-1">Nome da Categoria</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Projetos, Finanças, Academia..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 ml-1">Cor de Destaque</label>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {colors.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: c.value})}
                      className={`h-12 rounded-xl flex items-center justify-center border-2 transition-transform ${
                        formData.color === c.value ? 'border-foreground scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {formData.color === c.value && <Check size={20} className="text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 bg-background border border-border p-3 rounded-xl">
                  <input 
                    type="color" 
                    className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                  />
                  <span className="text-sm font-medium text-muted-foreground uppercase">{formData.color}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl hover:bg-accent transition-colors font-bold text-sm">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all font-bold text-sm shadow-lg shadow-primary/20">
                  {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-2xl text-center animate-scale-in">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black mb-2">Excluir Categoria?</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Deseja realmente excluir a categoria <strong className="text-foreground">{categoryToDelete.name}</strong>?
              As tarefas associadas a esta categoria serão migradas automaticamente para <strong>Pessoal</strong>.
            </p>
            
            <div className="flex justify-center gap-4">
              <button onClick={() => setCategoryToDelete(null)} className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors font-bold text-sm">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold text-sm shadow-lg shadow-red-500/20">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
