

## Fix: Handle Excel Date Serial Numbers as Strings

**Root Cause:** The `xlsx` library sometimes returns Excel date serial numbers as strings (e.g., `"46097"`) depending on cell formatting. The current `parseExcelDate` function only converts numeric serial numbers, so string ones pass through unchanged and cause a database error.

**Change:** In `src/components/AudienciasList.tsx`, update `parseExcelDate` (line ~113) to detect string values that are pure numbers and parse them as Excel serial dates before falling through to other string formats.

```typescript
// After the typeof === "number" check, add:
const s = String(value).trim();
// String that looks like a serial number (all digits, typical Excel range)
if (/^\d+$/.test(s) && Number(s) > 1000) {
  const date = XLSX.SSF.parse_date_code(Number(s));
  if (date) {
    const m = String(date.m).padStart(2, "0");
    const d = String(date.d).padStart(2, "0");
    return `${date.y}-${m}-${d}`;
  }
}
```

Same fix should be applied to `parseExcelTime` for consistency — check if string value is a decimal number (e.g., `"0.75"` for 18:00).

**Files changed:** `src/components/AudienciasList.tsx` only.

