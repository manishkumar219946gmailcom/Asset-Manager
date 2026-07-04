import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken, clearToken } from "@/lib/api";
import App from "./App";
import "./index.css";

setAuthTokenGetter(() => {
  const token = getToken();
  if (!token) return null;
  return token;
});

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const res = await originalFetch(...args);
  if (res.status === 401) {
    const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
    if (url.includes("/api/") && !url.includes("/auth/login")) {
      clearToken();
      window.location.href = "/login";
    }
  }
  return res;
};

createRoot(document.getElementById("root")!).render(<App />);
