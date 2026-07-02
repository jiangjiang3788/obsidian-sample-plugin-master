// src/app/ui/modals/QuickInputModal.ts
//
// Thin re-export:
// QuickInputModal is owned by the quickinput feature, while the Obsidian Modal adapter remains in src/platform/**.
// app/public.ts re-exports it from here to keep existing callers platform-agnostic.

export { QuickInputModal } from '@/platform/obsidian/modals/QuickInputModal';
