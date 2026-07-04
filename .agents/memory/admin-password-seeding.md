---
name: Admin password seeding
description: bcryptjs must be invoked from the api-server directory, not workspace root
---

To generate a valid bcrypt hash for seeding the admin user:

```bash
cd artifacts/api-server && node -e "import('bcryptjs').then(m => m.default.hash('admin123', 10).then(h => console.log(h)))"
```

Then update the DB:

```sql
UPDATE users SET password_hash = '$2b$10$...' WHERE username = 'admin';
```

**Why:** `bcryptjs` is only installed in the api-server package. Running from the workspace root fails with ERR_MODULE_NOT_FOUND because the package isn't in the root node_modules.

**How to apply:** Any time you need to seed or reset a password, always run the hash generation from `artifacts/api-server`.
