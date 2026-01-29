// app/api/cpa/_store.ts
const g = globalThis as any;
if (!g.__CPA_UNLOCKS__) g.__CPA_UNLOCKS__ = new Set<string>();
export const CPA_UNLOCKS: Set<string> = g.__CPA_UNLOCKS__;
