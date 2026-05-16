import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { Plus, CheckCircle2, Clock, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function Dashboard({ api }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (loading) return <div className="p-8 animate-pulse space-y-8">
    <div className="h-10 w-64 bg-card rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-64 bg-card rounded-2xl"></div>
      <div className="h-64 bg-card rounded-2xl"></div>
    </div>
  </div>;

  if (!data) return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center mt-20 bg-red-500/10 border border-red-500/20 rounded-2xl p-10 text-center">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Erro ao carregar o Dashboard</h2>
      <p className="text-muted-foreground mb-4">
        O backend não retornou os dados. Isso geralmente acontece porque o <strong>Firestore exige a criação de Índices (Indexes)</strong> para consultas complexas.
      </p>
      <p className="text-sm bg-background p-4 rounded-lg border border-border inline-block text-left">
        <strong>Solução:</strong><br/>
        1. Rode o projeto localmente (<code className="text-primary">npm run dev</code>)<br/>
        2. Faça login.<br/>
        3. Olhe o terminal onde o servidor está rodando.<br/>
        4. O Firebase vai gerar um erro com um <strong>Link direto</strong>. Clique no link para criar o índice no Firebase Console!
      </p>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto relative pb-24">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          {getGreeting()}, <span className="text-primary">{user.name.split(' ')[0]}!</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Aqui está o resumo da sua produtividade.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card de 7 Dias - Estilo Glassmorphism */}
        <div className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-border/50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/20 transition-colors duration-500"></div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" />
              Tarefas Concluídas (Últimos 7 dias)
            </h3>
            
            <div className="flex items-end justify-between gap-2 h-48 mt-4 border-b border-border/50 pb-2">
              {data.last7Days.map((day, idx) => {
                const counts = data.last7Days.map(d => d.count);
                const maxCount = Math.max(...counts, 1);
                const height = (day.count / maxCount) * 100;
                const isToday = idx === 6;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full group/bar">
                    <div className="relative w-full flex-1 flex items-end justify-center px-1">
                      <div 
                        style={{ height: `${Math.max(height, day.count > 0 ? 5 : 0)}%` }}
                        className={`w-full max-w-[32px] rounded-t-lg transition-all duration-700 relative shadow-[0_0_20px_rgba(var(--primary),0.3)] ${
                          isToday ? 'bg-primary shadow-primary/40' : 'bg-primary/20 group-hover/bar:bg-primary/40'
                        }`}
                      >
                        {day.count > 0 && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-xl z-20">
                            {day.count}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider mt-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {format(new Date(day.date), 'EEE', { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="space-y-6">
          <div className="bg-primary text-primary-foreground p-8 rounded-[2rem] shadow-xl shadow-primary/20 relative overflow-hidden">
            <Clock className="absolute -right-4 -bottom-4 size-32 opacity-20" />
            <h3 className="text-lg font-medium opacity-80 mb-1">Tarefas Atrasadas</h3>
            <p className="text-6xl font-black">{data.overdue}</p>
          </div>
          
          <div className="bg-emerald-500 text-white p-8 rounded-[2rem] shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <CheckCircle2 className="absolute -right-4 -bottom-4 size-32 opacity-20" />
            <h3 className="text-lg font-medium opacity-80 mb-1">Feitas Hoje</h3>
            <p className="text-6xl font-black">{data.completedToday}</p>
          </div>
        </div>
      </div>

      {/* Próximas Tarefas */}
      <section className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" />
            Próximos Vencimentos
          </h2>
          <Link to="/tasks" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.upcomingTasks.map(task => (
            <div key={task.id} className="bg-card/50 border border-border p-5 rounded-2xl hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-muted text-muted-foreground">
                  {task.category?.name || 'Sem categoria'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                  task.priority === 'HIGH' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {task.priority}
                </span>
              </div>
              <h4 className="font-bold mb-1 group-hover:text-primary transition-colors line-clamp-1">{task.title}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={12} />
                {format(new Date(task.dueDate), "dd 'de' MMM", { locale: ptBR })}
              </p>
            </div>
          ))}
          {data.upcomingTasks.length === 0 && (
            <div className="col-span-full py-12 text-center bg-card/30 border border-dashed border-border rounded-2xl">
              <p className="text-muted-foreground">Tudo em dia! Nenhuma tarefa próxima ao vencimento.</p>
            </div>
          )}
        </div>
      </section>

      {/* Botão Flutuante (FAB) */}
      <Link 
        to="/tasks" 
        className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 z-40 group"
      >
        <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
        <span className="absolute right-20 bg-card border border-border px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
          Criar Nova Tarefa
        </span>
      </Link>
    </div>
  );
}
