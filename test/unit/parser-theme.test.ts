// test/unit/parser-theme.test.ts
import { parseTaskLine, parseBlockContent } from '@core/utils/parser';

describe('主题解析', () => {
    describe('任务主题提取', () => {
        test('任务解析时theme应为undefined（将在dataStore中设置为header）', () => {
            const result = parseTaskLine(
                'test.md',
                '- [ ] 整理房间',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined(); // 解析时不设置，由dataStore设置
            expect(result?.title).toBe('整理房间');
        });

        test('应正确处理带emoji的任务', () => {
            const result = parseTaskLine(
                'test.md',
                '- [ ] 📚 读书笔记',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined(); // 主题将由header决定
            expect(result?.title).toBe('读书笔记');
            expect(result?.icon).toBe('📚');
        });

        test('应正确处理带标签的任务', () => {
            const result = parseTaskLine(
                'test.md',
                '- [ ] 完成项目报告 #工作 #重要',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined();
            expect(result?.title).toBe('完成项目报告');
            expect(result?.tags).toEqual(['工作', '重要']);
        });

        test('应正确处理带日期的任务', () => {
            const result = parseTaskLine(
                'test.md',
                '- [ ] 开会讨论 📅 2025-01-07',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined();
            expect(result?.title).toBe('开会讨论');
            expect(result?.dueDate).toBe('2025-01-07');
        });

        test('已完成任务的主题处理', () => {
            const result = parseTaskLine(
                'test.md',
                '- [x] 买菜 ✅ 2025-01-07',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined();
            expect(result?.title).toBe('买菜');
            expect(result?.categoryKey).toBe('任务/done');
        });

        test('取消的任务的主题处理', () => {
            const result = parseTaskLine(
                'test.md',
                '- [-] 看电影 ❌ 2025-01-07',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined();
            expect(result?.title).toBe('看电影');
            expect(result?.categoryKey).toBe('任务/cancelled');
        });
    });

    describe('块主题提取', () => {
        test('应正确解析主题字段', () => {
            const lines = [
                '<!-- start -->',
                '主题:: 生活/日常',
                '内容:: 测试内容',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                3,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('生活/日常');
            expect(result?.content).toBe('测试内容');
        });

        test('应正确解析带分类的块', () => {
            const lines = [
                '<!-- start -->',
                '分类:: 计划',
                '主题:: 工作/会议',
                '内容:: 讨论新项目方案',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                4,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('工作/会议');
            expect(result?.categoryKey).toBe('计划');
            expect(result?.content).toBe('讨论新项目方案');
        });

        test('主题字段应与标签字段独立', () => {
            const lines = [
                '<!-- start -->',
                '主题:: 学习/编程',
                '标签:: TypeScript, React',
                '内容:: 学习新技术',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                4,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('学习/编程');
            expect(result?.tags).toEqual(['TypeScript', 'React']);
            expect(result?.content).toBe('学习新技术');
        });

        test('没有主题字段时theme应为undefined', () => {
            const lines = [
                '<!-- start -->',
                '分类:: 笔记',
                '内容:: 没有主题的内容',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                3,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined();
            expect(result?.content).toBe('没有主题的内容');
        });

        test('应正确处理带日期的块', () => {
            const lines = [
                '<!-- start -->',
                '主题:: 健康/运动',
                '日期:: 2025-01-07',
                '内容:: 跑步5公里',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                4,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('健康/运动');
            expect(result?.date).toBe('2025-01-07');
            expect(result?.content).toBe('跑步5公里');
        });

        test('应正确处理带评分的块', () => {
            const lines = [
                '<!-- start -->',
                '主题:: 娱乐/电影',
                '评分:: 8',
                '内容:: 看了一部不错的电影',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                4,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('娱乐/电影');
            expect(result?.rating).toBe(8);
            expect(result?.content).toBe('看了一部不错的电影');
        });

        test('应正确处理多层级主题路径', () => {
            const lines = [
                '<!-- start -->',
                '主题:: 项目/前端/React/组件库',
                '内容:: 开发通用组件',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                3,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('项目/前端/React/组件库');
        });

        test('主题字段应支持中文冒号', () => {
            const lines = [
                '<!-- start -->',
                '主题： 生活/购物',
                '内容： 购物清单',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                3,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('生活/购物');
        });
    });

    describe('边界情况处理', () => {
        test('空任务标题时theme应为undefined', () => {
            const result = parseTaskLine(
                'test.md',
                '- [ ] ',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined();
            expect(result?.title).toBe('');
        });

        test('块内容为空时theme保持原值', () => {
            const lines = [
                '<!-- start -->',
                '主题:: 测试主题',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                2,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('测试主题');
            expect(result?.content).toBe('');
        });

        test('主题字段值为空时应为空字符串', () => {
            const lines = [
                '<!-- start -->',
                '主题:: ',
                '内容:: 测试',
                '<!-- end -->'
            ];
            
            const result = parseBlockContent(
                'test.md',
                lines,
                0,
                3,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBe('');
        });

        test('任务中的括号元数据不应影响主题', () => {
            const result = parseTaskLine(
                'test.md',
                '- [ ] 完成功能开发 (时间:: 2小时) (优先级:: 高)',
                1,
                'inbox'
            );
            
            expect(result).not.toBeNull();
            expect(result?.theme).toBeUndefined();
            expect(result?.title).toBe('完成功能开发');
            // 时间是特殊字段，会被解析到 startTime
            expect(result?.startTime).toBe('2小时');
            expect(result?.extra.优先级).toBe('高');
        });
    });
});
