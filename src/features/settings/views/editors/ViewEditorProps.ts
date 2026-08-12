import type { ViewInstance } from '@core/types/public';
import type { DataStore } from '@core/services/public';

export interface ViewEditorProps {
  value: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  fieldOptions: string[];
  module?: ViewInstance;
  dataStore: DataStore;
}
