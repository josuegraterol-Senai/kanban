import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { User, Palette, Bell, Shield, Check, Save, RefreshCw, AlertCircle } from 'lucide-react';

export default function Settings() {
  const { user, updateSettings } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    avatarUrl: user?.avatarUrl || '',
    theme: user?.settings?.theme || 'dark',
    notifications: {
      email: user?.settings?.notifications?.email ?? true,
      push: user?.settings?.notifications?.push ?? true,
      weeklyReport: user?.settings?.notifications?.weeklyReport ?? false
    }
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const suggestedAvatars = [
    { name: 'Profissional 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { name: 'Profissional 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { name: 'Profissional 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { name: 'Profissional 4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { name: 'Avatar 3D 1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=taskmaster1' },
    { name: 'Avatar 3D 2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=taskmaster2' }
  ];

  const handleNotificationChange = (key) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await updateSettings({
        name: formData.name,
        avatarUrl: formData.avatarUrl,
        settings: {
          theme: formData.theme,
          notifications: formData.notifications
        }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar as configurações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto relative pb-24">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Configurações</h1>
        <p className="text-muted-foreground text-lg">
          Gerencie seu perfil, preferências visuais e notificações.
        </p>
      </header>

      {/* Alerta de Sucesso */}
      {success && (
        <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center gap-3 animate-fade-in shadow-lg shadow-emerald-500/5">
          <div className="p-2 bg-emerald-500 rounded-xl text-white">
            <Check size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Configurações salvas com sucesso!</h4>
            <p className="text-xs opacity-90">Suas alterações foram aplicadas e sincronizadas com sua conta.</p>
          </div>
        </div>
      )}

      {/* Alerta de Erro */}
      {error && (
        <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center gap-3 animate-fade-in shadow-lg shadow-destructive/5">
          <div className="p-2 bg-destructive rounded-xl text-white">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Ocorreu um erro</h4>
            <p className="text-xs opacity-90">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Menu Lateral de Abas */}
        <aside className="lg:col-span-1 bg-card/30 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-xl space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <User size={18} />
            Perfil
          </button>
          
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'appearance'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Palette size={18} />
            Aparência
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'notifications'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Bell size={18} />
            Notificações
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'security'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Shield size={18} />
            Segurança
          </button>
        </aside>

        {/* Conteúdo da Aba */}
        <div className="lg:col-span-3 bg-card/40 backdrop-blur-xl border border-border/50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            {/* ABA PERFIL */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-4">
                  <User className="text-primary" size={24} />
                  Informações do Perfil
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-background/50 border border-border rounded-2xl">
                  <div className="relative group/avatar shrink-0">
                    <img 
                      src={formData.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 shadow-xl group-hover/avatar:border-primary transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-1 text-center sm:text-left flex-1">
                    <h4 className="font-bold text-base">Foto de Perfil</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      Escolha uma das sugestões abaixo ou insira o link de uma imagem personalizada.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 ml-1">Nome de Exibição</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 ml-1">URL do Avatar Customizado</label>
                  <input 
                    type="url" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 font-medium text-sm"
                    value={formData.avatarUrl}
                    onChange={e => setFormData({...formData, avatarUrl: e.target.value})}
                    placeholder="https://exemplo.com/sua-foto.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3 ml-1">Sugestões de Avatares</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {suggestedAvatars.map((avatar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({...formData, avatarUrl: avatar.url})}
                        className={`group/item p-2 rounded-2xl border flex flex-col items-center gap-2 transition-all hover:scale-105 ${
                          formData.avatarUrl === avatar.url 
                            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                            : 'border-border bg-background/50 hover:border-primary/50'
                        }`}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-12 h-12 rounded-full object-cover shadow-md" />
                        <span className="text-[10px] font-bold text-muted-foreground group-hover/item:text-foreground line-clamp-1">
                          {avatar.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA APARÊNCIA */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-4">
                  <Palette className="text-primary" size={24} />
                  Aparência e Tema
                </h3>

                <div>
                  <label className="block text-sm font-bold mb-4 ml-1">Tema da Interface</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, theme: 'dark'})}
                      className={`p-6 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all hover:scale-[1.02] ${
                        formData.theme === 'dark'
                          ? 'border-primary bg-primary/10 shadow-xl shadow-primary/20' 
                          : 'border-border bg-background/50 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-full h-24 bg-[#0B0F19] rounded-xl border border-border p-3 flex flex-col gap-2 shadow-inner">
                        <div className="w-1/3 h-3 bg-primary/20 rounded-full"></div>
                        <div className="w-full h-6 bg-card rounded-lg border border-border/50"></div>
                        <div className="w-2/3 h-6 bg-card rounded-lg border border-border/50"></div>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-0.5">Modo Escuro</h4>
                        <p className="text-[11px] text-muted-foreground">Foco total, ideal para ambientes com pouca luz.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({...formData, theme: 'light'})}
                      className={`p-6 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all hover:scale-[1.02] ${
                        formData.theme === 'light'
                          ? 'border-primary bg-primary/10 shadow-xl shadow-primary/20' 
                          : 'border-border bg-background/50 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-full h-24 bg-[#F8FAFC] rounded-xl border border-slate-200 p-3 flex flex-col gap-2 shadow-inner">
                        <div className="w-1/3 h-3 bg-primary/30 rounded-full"></div>
                        <div className="w-full h-6 bg-white rounded-lg border border-slate-200 shadow-sm"></div>
                        <div className="w-2/3 h-6 bg-white rounded-lg border border-slate-200 shadow-sm"></div>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-0.5">Modo Claro</h4>
                        <p className="text-[11px] text-muted-foreground">Visual limpo e brilhante para o dia a dia.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({...formData, theme: 'system'})}
                      className={`p-6 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all hover:scale-[1.02] ${
                        formData.theme === 'system'
                          ? 'border-primary bg-primary/10 shadow-xl shadow-primary/20' 
                          : 'border-border bg-background/50 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-full h-24 bg-gradient-to-r from-[#0B0F19] to-[#F8FAFC] rounded-xl border border-border p-3 flex flex-col gap-2 shadow-inner">
                        <div className="w-1/3 h-3 bg-primary/30 rounded-full"></div>
                        <div className="flex gap-2 h-12">
                          <div className="flex-1 bg-card rounded-lg border border-border/50"></div>
                          <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm"></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-0.5">Sistema</h4>
                        <p className="text-[11px] text-muted-foreground">Acompanha as configurações do seu sistema operacional.</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABA NOTIFICAÇÕES */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-4">
                  <Bell className="text-primary" size={24} />
                  Preferências de Notificações
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-background/50 border border-border rounded-2xl hover:border-primary/30 transition-colors">
                    <div>
                      <h4 className="font-bold text-sm mb-1">Notificações por E-mail</h4>
                      <p className="text-xs text-muted-foreground">Receba alertas sobre prazos e tarefas atribuídas no seu e-mail.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationChange('email')}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${
                        formData.notifications.email ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div className={`bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ${
                        formData.notifications.email ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-background/50 border border-border rounded-2xl hover:border-primary/30 transition-colors">
                    <div>
                      <h4 className="font-bold text-sm mb-1">Notificações Push (Navegador)</h4>
                      <p className="text-xs text-muted-foreground">Exibe notificações instantâneas na área de trabalho enquanto usa o app.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationChange('push')}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${
                        formData.notifications.push ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div className={`bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ${
                        formData.notifications.push ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-background/50 border border-border rounded-2xl hover:border-primary/30 transition-colors">
                    <div>
                      <h4 className="font-bold text-sm mb-1">Resumo Semanal de Produtividade</h4>
                      <p className="text-xs text-muted-foreground">Um relatório completo com suas estatísticas e conquistas da semana.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationChange('weeklyReport')}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${
                        formData.notifications.weeklyReport ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div className={`bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ${
                        formData.notifications.weeklyReport ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABA SEGURANÇA */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-4">
                  <Shield className="text-primary" size={24} />
                  Segurança da Conta
                </h3>

                <div className="p-6 bg-background/50 border border-border rounded-2xl space-y-4">
                  <div>
                    <h4 className="font-bold text-sm mb-1">Autenticação e Sessão</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Sua sessão é protegida por tokens JWT de alta segurança assinados digitalmente.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                    <div>
                      <h5 className="font-bold text-xs">Desconectar de outros dispositivos</h5>
                      <p className="text-[11px] text-muted-foreground">Encerre sessões ativas em outros navegadores.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => alert('Todas as outras sessões foram encerradas com sucesso.')}
                      className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-xl text-xs font-bold transition-all border border-destructive/20"
                    >
                      Encerrar Sessões
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BOTÃO SALVAR GERAL */}
            <div className="pt-6 border-t border-border/50 flex justify-end gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
