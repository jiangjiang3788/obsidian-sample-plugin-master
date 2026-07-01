export const CORE_ROOT_PUBLIC_FACADE = '@core/public';
export const SHARED_ROOT_PUBLIC_FACADE = '@shared/public';

export const CORE_PUBLIC_FACADES = [
  { specifier: '@core/public', file: 'src/core/public.ts', scope: 'root' },
  { specifier: '@core/goal/public', file: 'src/core/goal/public.ts', scope: 'module' },
  { specifier: '@core/fields/public', file: 'src/core/fields/public.ts', scope: 'module' },
  { specifier: '@core/recordInput/public', file: 'src/core/recordInput/public.ts', scope: 'module' },
  { specifier: '@core/layout/public', file: 'src/core/layout/public.ts', scope: 'module' },
  { specifier: '@core/theme/public', file: 'src/core/theme/public.ts', scope: 'module' },
  { specifier: '@core/semantics/public', file: 'src/core/semantics/public.ts', scope: 'module' },
  { specifier: '@core/utils/public', file: 'src/core/utils/public.ts', scope: 'module' },
  { specifier: '@core/types/public', file: 'src/core/types/public.ts', scope: 'module' },
  { specifier: '@core/blocks/public', file: 'src/core/blocks/public.ts', scope: 'module' },
  { specifier: '@core/services/public', file: 'src/core/services/public.ts', scope: 'module' },
  { specifier: '@core/ports/public', file: 'src/core/ports/public.ts', scope: 'module' },
  { specifier: '@core/ai/public', file: 'src/core/ai/public.ts', scope: 'module' },
  { specifier: '@core/view/public', file: 'src/core/view/public.ts', scope: 'module' },
  { specifier: '@core/records/public', file: 'src/core/records/public.ts', scope: 'module' },
  { specifier: '@core/progression/public', file: 'src/core/progression/public.ts', scope: 'module' },
  { specifier: '@core/bootstrap/public', file: 'src/core/bootstrap/public.ts', scope: 'module' },
];

export const SHARED_PUBLIC_FACADES = [
  { specifier: '@shared/public', file: 'src/shared/public.ts', scope: 'root' },
  { specifier: '@shared/ui/public', file: 'src/shared/ui/public.ts', scope: 'module' },
  { specifier: '@shared/utils/public', file: 'src/shared/utils/public.ts', scope: 'module' },
  { specifier: '@shared/hooks/public', file: 'src/shared/hooks/public.ts', scope: 'module' },
  { specifier: '@shared/components/public', file: 'src/shared/components/public.ts', scope: 'module' },
  { specifier: '@shared/debug/public', file: 'src/shared/debug/public.ts', scope: 'module' },
  { specifier: '@shared/patterns/public', file: 'src/shared/patterns/public.ts', scope: 'module' },
  { specifier: '@shared/types/public', file: 'src/shared/types/public.ts', scope: 'module' },
  { specifier: '@shared/styles/public', file: 'src/shared/styles/public.ts', scope: 'module' },
];

export const CORE_ALLOWED_PUBLIC_SPECIFIERS = new Set(CORE_PUBLIC_FACADES.map((facade) => facade.specifier));
export const SHARED_ALLOWED_PUBLIC_SPECIFIERS = new Set(SHARED_PUBLIC_FACADES.map((facade) => facade.specifier));

export const CORE_MODULE_PUBLIC_FACADES = CORE_PUBLIC_FACADES.filter((facade) => facade.scope === 'module');
export const SHARED_MODULE_PUBLIC_FACADES = SHARED_PUBLIC_FACADES.filter((facade) => facade.scope === 'module');

export function isCorePublicFacadeSpecifier(specifier) {
  return CORE_ALLOWED_PUBLIC_SPECIFIERS.has(specifier);
}

export function isSharedPublicFacadeSpecifier(specifier) {
  return SHARED_ALLOWED_PUBLIC_SPECIFIERS.has(specifier);
}
