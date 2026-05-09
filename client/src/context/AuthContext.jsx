import { createContext, useContext, useState, useEffect } from "react";

// The shape of what AuthContext provides to the rest of the app
const AuthContext = createContext(null);

// Wrap your app in this so any component can call useAuth()
export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true); // true while we verify the token on load

  // On first load, if a token exists in localStorage, fetch the current user
  // This keeps the user logged in after a page refresh
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("http://localhost:3001/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => {
        // Token is invalid or expired - clear it
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Call this after a successful login or register API response
  function login(userData, jwtToken) {
    localStorage.setItem("token", jwtToken);
    setToken(jwtToken);
    setUser(userData);
  }

  // Call this when the user clicks "Sign out"
  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Shorthand hook - use this in any component: const { user, login, logout } = useAuth()
export function useAuth() {
  return useContext(AuthContext);
}