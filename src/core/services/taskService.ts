// src/core/services/TaskService.ts
import { singleton, inject } from 'tsyringe'; // 导入 inject
import { DataStore } from './dataStore';
import { App } from 'obsidian';
import { AppToken } from './types'; // 导入 Token
// ... 其他导入

@singleton()
export class TaskService {
    constructor(
        @inject(DataStore) private dataStore: DataStore,
        @inject(AppToken) private app: App
    ) {}
    // ... 其余方法不变
}