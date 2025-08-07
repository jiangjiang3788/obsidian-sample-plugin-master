import type { ThinkContext } from '@platform/context';
import { registerQuickInputCommands } from './logic/registerCommands';

export function setup(ctx: ThinkContext) {
  registerQuickInputCommands(ctx);
}
