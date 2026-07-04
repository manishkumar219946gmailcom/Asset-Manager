---
name: JWT localStorage pattern
description: Auth token lives in localStorage; setAuthTokenGetter wires it into all generated API calls
---

This project uses JWT tokens stored in localStorage under the key `loconet_token`.

**Setup in main.tsx:**
```ts
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "@/lib/api";
setAuthTokenGetter(() => getToken());
```

This makes every Orval-generated hook automatically send `Authorization: Bearer <token>`.

**Why:** Cookie-based sessions complicate the Replit proxy setup. localStorage + Bearer tokens work reliably in iframed preview environments. The downside is XSS exposure, acceptable for an internal ops dashboard.

**How to apply:** For any direct fetch calls not going through Orval hooks, manually add the header: `{ Authorization: \`Bearer ${getToken()}\` }`.
