// src/shared/ui/public.ts
/**
 * Shared UI module public facade.
 *
 * Future UI imports can use this narrower facade instead of the root
 * `@shared/public` compatibility surface.
 */
export * from './contracts';
export * from './GroupedContainer';
export * from './muiCompat';
export * from './primitives';
export * from './utils/recordOrigin';
export * from './components';
export * from './icons';
export * from './composites/SimpleSelect';
export * from './composites/FormField';
export * from './composites/FieldManager';
export * from './composites/TagsRenderer';
export * from './composites/TaskCheckbox';
export * from './composites/TaskSendToTimerButton';
export * from './composites/form/ListEditor';
export * from './modals/EditTaskModal';
export * from './markdown/MarkdownContent';
export * from './events/obsidianEventBoundary';
