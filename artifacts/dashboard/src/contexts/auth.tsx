import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getToken, setToken, clearToken } from "@/lib/api";
import { useLogin, useGetMe } from "@workspace/api-client-react";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginMutation = useLogin();
  const { data: meData, isError } = useGetMe({ query: { enabled: !!getToken(), retry: false } });

  useEffect(() => {
    if (meData) {
      setUser(meData as AuthUser);
      setIsLoading(false);
    } else if (isError || !getToken()) {
      setIsLoading(false);
    }
  }, [meData, isError]);

  const login = async (username: string, password: string) => {
    const result = await loginMutation.mutateAsync({ username, password });
    setToken(result.token);
    setUser(result.user as AuthUser);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
