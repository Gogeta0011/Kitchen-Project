import { createContext, useContext, useEffect, useState } from "react";
import { getAuthToken, setAuthToken, getMe, type User } from "./kitchenApi";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore from localStorage on mount
    const savedToken = getAuthToken();
    if (savedToken) {
      setTokenState(savedToken);
      // Verify token is still valid
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          setAuthToken(null);
          setTokenState(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSetToken = (newToken: string | null) => {
    setAuthToken(newToken);
    setTokenState(newToken);
    if (!newToken) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        setToken: handleSetToken,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
