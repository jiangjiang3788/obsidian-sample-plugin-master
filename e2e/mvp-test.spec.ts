// e2e/mvp-test.spec.ts
import { browser, $ } from '@wdio/globals'; // 从 @wdio/globals 导入

describe('My Obsidian Plugin MVP Test', () => {
    it('should correctly render the think block', async () => {
        // --- 步骤 1: 打开快速切换器并创建/打开文件 ---
        // 1. 按下快捷键 Ctrl+O
        // 注意：wdio-obsidian-service 已自动完成Obsidian启动和工作区加载
        await browser.keys(['Control', 'o']);

        // 2. 定位输入框并输入文件名
        const fileInput = await $('input[placeholder="输入以切换或创建文件…"]');
        await fileInput.setValue('E2E-TEST-PAGE.md'); // 使用 setValue 代替 fill
        await browser.keys('Enter');

        // --- 步骤 2: 编辑文件内容 ---
        await browser.pause(500); // 使用 browser.pause 代替 waitForTimeout
        
        // 全选并删除已有内容
        await browser.keys(['Control', 'a']);
        await browser.keys('Delete');

        // 3. 点击编辑器并输入代码块
        const editor = await $('.cm-content');
        await editor.click();
        // 直接用 setValue 可以更快地粘贴内容
        await editor.setValue('```think\n{"layout": "默认布局"}\n```');
        await browser.pause(1000);

        // --- 步骤 3: 断言插件UI是否正确渲染 ---
        const renderedBlock = await $('.block-language-think');
        // WebdriverIO 的断言风格是等待元素出现，如果超时未出现则测试失败
        await renderedBlock.waitForDisplayed({ timeout: 5000 });

        const layoutContainer = await renderedBlock.$('.think-module');
        await layoutContainer.waitForDisplayed({ timeout: 5000 });
        
        console.log('✅ Assertion successful! Plugin UI rendered correctly!');
        
        // 不需要 browser.close()，测试运行器会自动处理
    });
});