const TOKEN_KEY = "loconet_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function customFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(input, { ...init, headers }).then((res) => {
    if (res.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return res;
  });
}
