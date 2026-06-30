import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('pl-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios
        .get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setUser(res.data))
        .catch(() => { localStorage.removeItem('pl-token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, jwt) => {
    localStorage.setItem('pl-token', jwt);
    setToken(jwt);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('pl-token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
