---
name: Orval hook names
description: Generated hook names differ from OpenAPI operationId — always verify before importing
---

Orval generates hook names from the OpenAPI `operationId`, but applies its own casing rules. Before using any hook, grep the generated file:

```
grep "^export const use\|^export function use" lib/api-client-react/src/generated/api.ts | grep -oP "use\w+" | sort
```

**Known actual names (this project):**
- Queries: useGetDashboardStats, useGetSchedulerStatus, useListFaults, useListAlerts, useListApiLogs, useListUsers, useGetSettings, useGetMe, useGetCategoryPieChart, useGetLocoChart, useGetModuleChart, useGetFaultTrend, useGetLocationChart, useGetFaultCodeChart, useGetRecoveryTrend, useGetFaultFilterOptions
- Mutations: useLogin, useLogout, useCreateUser, useUpdateSettings, useTriggerFetch

**Why:** Hooks for updateUser, deleteUser, updateSchedulerInterval, testWhatsappAlert were not generated (endpoints missing from OpenAPI spec or wrong method). Use direct authenticated fetch for those.

**How to apply:** Always grep before wiring a new hook. If missing, add the endpoint to openapi.yaml and re-run codegen, or use a direct fetch call with `getToken()`.
