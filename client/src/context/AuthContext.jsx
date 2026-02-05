import React, { createContext, useEffect, useState } from "react";
import { api, setAuthToken } from "../lib/api";



export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    // Try to load the user (if token exists)
    (async () => {
      try {
        if (token) {
          const { data } = await api.get("/auth/me");
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem("token");
        setAuthToken(null);
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setAuthToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("token");
    setAuthToken(null);
    setUser(null);
  }

  async function register(firstName, lastName, email, password) {
  const { data } = await api.post("/auth/register", {
    firstName,
    lastName,
    email,
    password,
  });

  localStorage.setItem("token", data.token);
  setAuthToken(data.token);
  setUser(data.user);
}


  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
