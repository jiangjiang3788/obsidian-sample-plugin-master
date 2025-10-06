// 任务数据工厂
export class TaskFactory {
  static createTask(overrides = {}) {
    const defaultTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: 'Test task',
      filePath: 'test/tasks.md',
      lineNo: 1,
      parentFolder: 'test',
      completed: false,
      priority: 'normal',
      tags: [],
      time: null,
      duration: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { ...defaultTask, ...overrides };
  }

  static createMultipleTasks(count, overrides = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.createTask({
        ...overrides,
        id: `task-${Date.now()}-${index}`,
        content: `Test task ${index + 1}`,
        lineNo: index + 1
      })
    );
  }

  static createCompletedTask(overrides = {}) {
    return this.createTask({
      completed: true,
      completedAt: new Date().toISOString(),
      ...overrides
    });
  }

  static createTaskWithTime(overrides = {}) {
    const now = new Date();
    return this.createTask({
      time: now.toISOString(),
      duration: 30,
      ...overrides
    });
  }

  static createTaskWithTags(tags, overrides = {}) {
    return this.createTask({
      tags: Array.isArray(tags) ? tags : [tags],
      ...overrides
    });
  }

  static createTaskWithPriority(priority, overrides = {}) {
    return this.createTask({
      priority,
      ...overrides
    });
  }
}

// 块数据工厂
export class BlockFactory {
  static createBlock(overrides = {}) {
    const defaultBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: 'Test block content',
      filePath: 'test/blocks.md',
      startLine: 1,
      endLine: 5,
      parentFolder: 'test',
      tasks: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { ...defaultBlock, ...overrides };
  }

  static createBlockWithTasks(taskCount = 3, overrides = {}) {
    const tasks = TaskFactory.createMultipleTasks(taskCount);
    return this.createBlock({
      tasks,
      ...overrides
    });
  }

  static createMultipleBlocks(count, overrides = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.createBlock({
        ...overrides,
        id: `block-${Date.now()}-${index}`,
        content: `Test block ${index + 1}`,
        startLine: index * 10 + 1,
        endLine: index * 10 + 5
      })
    );
  }
}

// 文件数据工厂
export class FileFactory {
  static createMarkdownFile(path, content, overrides = {}) {
    const defaultFile = {
      path,
      content,
      basename: path.split('/').pop().replace(/\.[^/.]+$/, ''),
      extension: 'md',
      stat: {
        mtime: new Date(),
        ctime: new Date(),
        size: content.length
      }
    };

    return { ...defaultFile, ...overrides };
  }

  static createTaskFile(path = 'test/tasks.md', taskCount = 5) {
    const tasks = TaskFactory.createMultipleTasks(taskCount);
    const content = tasks.map(task => `- [${task.completed ? 'x' : ' '}] ${task.content}`).join('\n');
    
    return this.createMarkdownFile(path, content);
  }

  static createThinkBlockFile(path = 'test/think.md', blockContent = '{"layout": "默认布局"}') {
    const content = `\`\`\`think\n${blockContent}\n\`\`\``;
    return this.createMarkdownFile(path, content);
  }

  static createComplexFile(path = 'test/complex.md') {
    const content = `# 复杂测试文件

## 任务列表
- [ ] 待办任务 1
- [x] 已完成任务 2
- [ ] 带标签的任务 #urgent #work

## Think 块
\`\`\`think
{"layout": "双栏布局", "groupBy": "folder"}
\`\`\`

## 普通内容
这是一些普通的 Markdown 内容。

- [ ] 另一个任务
\`\`\`think
{"layout": "单栏布局"}
\`\`\`
`;

    return this.createMarkdownFile(path, content);
  }
}

// 设置数据工厂
export class SettingsFactory {
  static createDefaultSettings() {
    return {
      defaultLayout: '默认布局',
      enableTimeTracking: true,
      autoSave: true,
      refreshInterval: 30000,
      viewSettings: {
        taskView: {
          groupBy: 'folder',
          sortBy: 'updatedAt',
          showCompleted: true
        },
        blockView: {
          groupBy: 'folder',
          sortBy: 'updatedAt',
          showEmpty: false
        }
      },
      quickCapture: {
        defaultFolder: 'Inbox',
        template: '- [ ] {{content}}',
        autoOpenFile: true
      }
    };
  }

  static createCustomSettings(overrides = {}) {
    return { ...this.createDefaultSettings(), ...overrides };
  }
}

// 计时器数据工厂
export class TimerFactory {
  static createTimer(overrides = {}) {
    const defaultTimer = {
      id: `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: null,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      isActive: false,
      isPaused: false,
      description: 'Test timer'
    };

    return { ...defaultTimer, ...overrides };
  }

  static createActiveTimer(taskId, overrides = {}) {
    return this.createTimer({
      taskId,
      isActive: true,
      startTime: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前开始
      ...overrides
    });
  }

  static createPausedTimer(taskId, overrides = {}) {
    return this.createTimer({
      taskId,
      isPaused: true,
      startTime: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前开始
      ...overrides
    });
  }

  static createCompletedTimer(taskId, duration = 25, overrides = {}) {
    const startTime = new Date(Date.now() - duration * 60 * 1000);
    return this.createTimer({
      taskId,
      isActive: false,
      isPaused: false,
      startTime,
      endTime: new Date(),
      duration,
      ...overrides
    });
  }
}
