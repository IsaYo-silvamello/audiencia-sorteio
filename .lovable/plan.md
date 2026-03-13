

## Fix: Status Check Constraint Violation on Import

**Root Cause:** The `audiencias` table has a CHECK constraint limiting `status` to only `'pendente'`, `'atribuida'`, `'realizada'`. The spreadsheet likely contains different status values (or the mapped value doesn't match these options), causing the insert to fail.

**Fix in `src/components/AudienciasList.tsx`:**

In the import logic (around line 296), after mapping the status from the spreadsheet, normalize it to one of the allowed values. If the spreadsheet status doesn't match any allowed value, default to `'pendente'`.

```typescript
const ALLOWED_STATUSES = ['pendente', 'atribuida', 'realizada'];
const rawStatus = (obj.status || '').toString().toLowerCase().trim();
obj.status = ALLOWED_STATUSES.includes(rawStatus) ? rawStatus : 'pendente';
```

**Files changed:** `src/components/AudienciasList.tsx` only.

