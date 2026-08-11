// Compatibility facade: ItemService implementation lives in ./item after V29.
export { ItemService } from './item/ItemService';
export type {
    GoalTemplateMigrationResult,
    ItemMutationOptions,
    ItemTimeUpdates,
    MigrationBackupResult,
} from './item/types';
