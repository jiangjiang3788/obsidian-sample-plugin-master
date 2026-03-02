/**
 * 集成测试：Parser → Item 数据流
 *
 * 验证 parseTaskLine 和 parseBlockContent 的输出可以被下游正确消费：
 * - 字段结构完整性
 * - 多种输入混合解析后的数据一致性
 * - 模拟 DataStore 消费 parser 输出的场景
 */
import { parseTaskLine, parseBlockContent } from '@/core/utils/parser';
import { Item, readField, getAllFields, CORE_FIELDS } from '@/core/types/schema';

describe('Parser → Item 数据流集成测试', () => {

  /** 模拟一个简化的文件扫描流程：多行文本 → 逐行解析 → 收集 Item[] */
  function scanFileContent(filePath: string, content: string, folder: string): Item[] {
    const lines = content.split('\n');
    const items: Item[] = [];

    for (let i = 0; i < lines.length; i++) {
      const taskItem = parseTaskLine(filePath, lines[i], i, folder);
      if (taskItem) {
        items.push(taskItem);
      }
    }

    return items;
  }

  describe('多任务行批量解析', () => {
    const mdContent = [
      '# 日常任务',
      '',
      '- [ ] 买菜 #生活 📅 2025-03-01',
      '- [x] 写代码 #工作 ✅ 2025-02-28',
      '- [-] 取消会议 ❌ 2025-02-27',
      '- [ ] 读书 (主题::学习) (标签::技术,AI)',
      '',
      '这是一段普通文本，不是任务',
    ].join('\n');

    let items: Item[];

    beforeAll(() => {
      items = scanFileContent('daily/tasks.md', mdContent, 'daily');
    });

    it('正确识别出 4 条任务，忽略非任务行', () => {
      expect(items).toHaveLength(4);
      items.forEach(item => {
        expect(item.type).toBe('task');
      });
    });

    it('每条 Item 的 id 唯一', () => {
      const ids = items.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('所有 Item 都包含核心字段', () => {
      items.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.categoryKey).toBeDefined();
        expect(item.tags).toBeInstanceOf(Array);
        expect(item.folder).toBe('daily');
      });
    });

    it('readField 能正确读取核心字段和 extra 字段', () => {
      const openItem = items[0]; // 买菜
      expect(readField(openItem, 'categoryKey')).toBe('未完成任务');
      expect(readField(openItem, 'tags')).toContain('生活');
      expect(readField(openItem, 'folder')).toBe('daily');
    });

    it('getAllFields 能收集所有出现的字段名', () => {
      const fields = getAllFields(items);
      CORE_FIELDS.forEach(cf => {
        expect(fields).toContain(cf);
      });
    });

    it('完成/取消任务的 categoryKey 一致', () => {
      const doneItem = items[1]; // 写代码 [x]
      const cancelledItem = items[2]; // 取消会议 [-]
      expect(doneItem.categoryKey).toBe('完成任务');
      expect(cancelledItem.categoryKey).toBe('完成任务');
    });

    it('主题字段不混入 tags', () => {
      const themeItem = items[3]; // 读书 (主题::学习)
      expect(themeItem.theme).toBe('学习');
      expect(themeItem.tags).not.toContain('学习');
      expect(themeItem.tags).toContain('技术');
      expect(themeItem.tags).toContain('AI');
    });
  });

  describe('Block + Task 混合解析', () => {
    it('block 和 task 的 Item 结构兼容，可放入同一数组', () => {
      const taskItem = parseTaskLine('file.md', '- [ ] 任务A #tag1 📅 2025-01-01', 0, 'root');
      
      const blockLines = [
        '[!thinktxt]',
        '分类:: 项目',
        '标签:: tag2',
        '日期:: 2025-01-02',
        '内容:: Block内容',
      ];
      const blockItem = parseBlockContent('file.md', blockLines, 0, blockLines.length, 'root');

      expect(taskItem).not.toBeNull();
      expect(blockItem).not.toBeNull();

      const combined: Item[] = [taskItem!, blockItem!];
      
      // 两者都可以用 readField 读取
      expect(readField(combined[0], 'type')).toBe('task');
      expect(readField(combined[1], 'type')).toBe('block');
      
      // 两者都有 id, title, categoryKey, tags
      combined.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.categoryKey).toBeDefined();
        expect(item.tags).toBeInstanceOf(Array);
      });
    });
  });

  describe('边界情况', () => {
    it('空文件不产生任何 Item', () => {
      const items = scanFileContent('empty.md', '', 'root');
      expect(items).toHaveLength(0);
    });

    it('只有标题和空行的文件不产生 Item', () => {
      const content = '# 标题\n\n## 子标题\n\n';
      const items = scanFileContent('headings.md', content, 'root');
      expect(items).toHaveLength(0);
    });

    it('相同内容的不同文件产生不同 id', () => {
      const line = '- [ ] 同一任务 📅 2025-03-01';
      const item1 = parseTaskLine('file1.md', line, 0, 'root');
      const item2 = parseTaskLine('file2.md', line, 0, 'root');
      
      expect(item1).not.toBeNull();
      expect(item2).not.toBeNull();
      expect(item1!.id).not.toBe(item2!.id);
    });
  });
});
