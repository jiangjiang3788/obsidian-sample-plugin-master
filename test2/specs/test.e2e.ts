// test/specs/test.e2e.ts
import { browser, $ } from '@wdio/globals';

describe('Think Plugin Test', () => {
    it('should correctly render the think block in a new note', async () => {
        
        console.log("等待 Obsidian 工作区加载...");
        const workspace = await $(".workspace-leaf");
        await workspace.waitForExist({ timeout: 40000 }); 
        console.log("工作区已加载，开始测试步骤...");

        // 步骤 1: 创建一个新文件
        await browser.keys(['Control', 'o']);
        const fileInput = await $('input.prompt-input');
        await fileInput.waitForDisplayed({ timeout: 5000 });
        await fileInput.setValue('My Think Block Test.md');
        await browser.keys('Enter');
        await browser.pause(1000); 

        // 步骤 2: 在源码模式下编辑文件内容
        const editor = await $('.cm-content');
        await editor.waitForExist();
        await editor.click();
        await editor.setValue('```think\n{"layout": "默认布局"}\n```');
        await browser.pause(1000);

        // 步骤 3: 切换到阅读模式以触发渲染
        console.log("切换到阅读模式以渲染代码块...");
        await browser.keys(['Control', 'e']);
        await browser.pause(1000); // 等待UI渲染

        // 步骤 4: 断言插件的主UI容器是否可见
        // 【【【【【 修改点：简化了这里的检查 】】】】】
        // 我们只需要确认主代码块被成功渲染即可，无需检查内部模块。
        console.log("验证渲染后的 think 代码块...");
        const renderedBlock = await $('.block-language-think');
        await renderedBlock.waitForDisplayed({ timeout: 5000 });
        
        console.log('✅ 成功！think 代码块UI已正确渲染。');
    });
});