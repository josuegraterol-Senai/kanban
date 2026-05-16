import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckCircle2, ListTodo, Settings, Grid, User as UserIcon } from 'lucide-react';
import { AuthProvider, useAuth, api } from './AuthContext';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Categories from './pages/Categories';
import SettingsPage from './pages/Settings';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const NavLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const AppLayout = () => {
  const { user } = useAuth();
  
  if (!user) return <Login />;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar Moderno */}
      <aside className="w-72 border-r border-border bg-card/30 backdrop-blur-xl flex flex-col">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tighter text-primary flex items-center gap-2 italic">
            <CheckCircle2 className="text-emerald-500 not-italic" size={28} strokeWidth={3} />
            TASKMASTER
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavLink to="/" icon={LayoutDashboard} label="Início" />
          <NavLink to="/tasks" icon={ListTodo} label="Minhas Tarefas" />
          <NavLink to="/categories" icon={Grid} label="Categorias" />
          <NavLink to="/settings" icon={Settings} label="Configurações" />
        </nav>
        
        <div className="p-4 mt-auto">
          <Link to="/profile" className="block group">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/50 hover:bg-accent transition-all duration-200 border border-transparent hover:border-border">
              <div className="relative">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-background" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border-2 border-background">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full"></div>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <Routes>
          <Route path="/" element={<Dashboard api={api} />} />
          <Route path="/tasks" element={<Tasks api={api} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/categories" element={<Categories api={api} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
