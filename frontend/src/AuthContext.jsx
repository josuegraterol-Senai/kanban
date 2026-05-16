import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Determina a base da API dinamicamente em tempo de execução
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

export const api = axios.create({ baseURL: API_BASE });

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Inicializa o cache do dashboard a partir do localStorage
  const [dashboardCache, setDashboardCacheState] = useState(() => {
    try {
      const cached = localStorage.getItem('dashboardCache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Função wrapper para atualizar o estado e o localStorage
  const setDashboardCache = (data) => {
    setDashboardCacheState(data);
    if (data) {
      try {
        localStorage.setItem('dashboardCache', JSON.stringify(data));
      } catch (err) {
        console.error('Erro ao salvar cache do dashboard no localStorage', err);
      }
    } else {
      localStorage.removeItem('dashboardCache');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (name, email, password, avatarUrl) => {
    const res = await api.post('/auth/register', { name, email, password, avatarUrl });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const updateSettings = async (settingsData) => {
    const res = await api.put('/auth/settings', settingsData);
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('dashboardCache');
    localStorage.removeItem('tasksCache');
    localStorage.removeItem('categoriesCache');
    setUser(null);
    setDashboardCacheState(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateSettings, loading, dashboardCache, setDashboardCache }}>
      {children}
    </AuthContext.Provider>
  );
};
