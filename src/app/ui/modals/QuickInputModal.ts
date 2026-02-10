// src/app/ui/modals/QuickInputModal.ts
//
// Thin re-export:
// QuickInputModal depends on Obsidian Modal APIs, so the implementation lives in src/platform/**.
// app/public.ts re-exports it from here to keep the rest of the codebase platform-agnostic.

export { QuickInputModal } from '@/platform/modals/QuickInputModal';
