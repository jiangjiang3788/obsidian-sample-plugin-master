// src/features/dashboard/index.ts

import type { ThinkContext } from '../../main';

// [FIX] 使用 @features 别名进行导入，代码更清晰
import { VaultWatcher } from '@features/logic/VaultWatcher';
import { CodeblockEmbedder } from '@features/logic/CodeblockEmbedder';

/**
 * 负责 Dashboard 功能的启动和设置。
 * 它初始化了文件监听器和代码块渲染器。
 */
export function setup(ctx: ThinkContext) { 
    const { plugin, dataStore, appStore, rendererService } = ctx;

    new VaultWatcher(plugin, dataStore);
    new CodeblockEmbedder(plugin, appStore, dataStore, rendererService);
}