import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

const STORAGE_KEY = "trustchain-auth";

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  // role: "manufacturer" | "admin"
  const login = (role, token, user) => setAuth({ role, token, user });
  const logout = () => setAuth(null);

  return (
    <AuthContext.Provider
      value={{
        token: auth?.token ?? null,
        role: auth?.role ?? null,
        user: auth?.user ?? null,
        isAuthenticated: Boolean(auth?.token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
