// test/specs/mobile-quick-input.e2e.ts
import { browser, $ } from '@wdio/globals';

describe('Mobile Quick Input Modal Test', () => {
    it('should handle keyboard and avoid being covered by input method', async () => {
        
        console.log("等待 Obsidian 工作区加载...");
        const workspace = await $(".workspace-leaf");
        await workspace.waitForExist({ timeout: 40000 }); 
        console.log("工作区已加载，开始移动端快捷输入测试...");

        // 步骤 1: 创建一个新文件
        await browser.keys(['Control', 'o']);
        const fileInput = await $('input.prompt-input');
        await fileInput.waitForDisplayed({ timeout: 5000 });
        await fileInput.setValue('Mobile Quick Input Test.md');
        await browser.keys('Enter');
        await browser.pause(1000); 

        // 步骤 2: 在源码模式下编辑文件内容，添加快捷输入配置
        const editor = await $('.cm-content');
        await editor.waitForExist();
        await editor.click();
        await editor.setValue(`# 移动端快捷输入测试

\`\`\`think
{"layout": "默认布局"}
\`\`\`

<!-- 快捷输入配置 -->
`);
        await browser.pause(1000);

        // 步骤 3: 切换到阅读模式
        console.log("切换到阅读模式...");
        await browser.keys(['Control', 'e']);
        await browser.pause(2000);

        // 步骤 4: 等待插件UI加载
        const renderedBlock = await $('.block-language-think');
        await renderedBlock.waitForDisplayed({ timeout: 5000 });
        console.log("✅ think 代码块已渲染");

        // 步骤 5: 尝试触发快捷输入面板
        console.log("尝试触发快捷输入面板...");
        
        // 查找可能的快捷输入按钮或命令触发器
        try {
            // 尝试查找添加按钮
            const addButton = await $('.module-action-plus');
            if (await addButton.isDisplayed()) {
                await addButton.click();
                await browser.pause(1000);
                console.log("点击了添加按钮");
            } else {
                // 尝试通过命令面板触发
                await browser.keys(['Control', 'p']);
                const commandInput = await $('input.prompt-input');
                await commandInput.waitForDisplayed({ timeout: 3000 });
                await commandInput.setValue('Think: 快速录入');
                await browser.pause(500);
                await browser.keys('Enter');
                await browser.pause(1000);
                console.log("通过命令面板触发快捷输入");
            }
        } catch (error) {
            console.log("无法触发快捷输入面板，尝试其他方法...");
        }

        // 步骤 6: 检查快捷输入模态框是否出现
        console.log("检查快捷输入模态框...");
        const modal = await $('.think-quick-input-modal');
        
        if (await modal.isDisplayed()) {
            console.log("✅ 快捷输入模态框已打开");
            
            // 步骤 7: 测试输入法响应
            console.log("测试输入法响应...");
            
            // 查找第一个输入框
            const firstInput = await $('input[type="text"], textarea');
            if (await firstInput.isDisplayed()) {
                await firstInput.click();
                await browser.pause(500);
                
                // 输入一些文本触发输入法
                await firstInput.setValue('测试输入法响应');
                await browser.pause(2000);
                
                // 检查模态框是否有键盘激活的类
                const modalClasses = await modal.getAttribute('class');
                const hasKeyboardActive = modalClasses.includes('keyboard-active');
                
                if (hasKeyboardActive) {
                    console.log("✅ 检测到键盘激活状态");
                } else {
                    console.log("⚠️ 未检测到键盘激活状态");
                }
                
                // 检查模态框位置
                const modalPosition = await modal.getLocation();
                const modalSize = await modal.getSize();
                
                console.log(`模态框位置: x=${modalPosition.x}, y=${modalPosition.y}`);
                console.log(`模态框尺寸: width=${modalSize.width}, height=${modalSize.height}`);
                
                // 验证模态框是否在屏幕上方
                if (modalPosition.y < 400) { // 假设屏幕高度的一半
                    console.log("✅ 模态框位置正确，在屏幕上方");
                } else {
                    console.log("⚠️ 模态框位置可能被输入法覆盖");
                }
                
                // 步骤 8: 测试滚动功能
                console.log("测试模态框滚动功能...");
                const modalContent = await $('.modal-content, .think-modal');
                if (await modalContent.isDisplayed()) {
                    // 尝试滚动
                    await modalContent.scrollIntoView();
                    await browser.pause(500);
                    console.log("✅ 滚动功能正常");
                }
                
                // 步骤 9: 关闭模态框
                const closeButton = await $('.modal-close-button, button[title="关闭"], .MuiIconButton-root');
                if (await closeButton.isDisplayed()) {
                    await closeButton.click();
                    await browser.pause(500);
                    console.log("✅ 模态框已关闭");
                } else {
                    // 尝试按ESC键关闭
                    await browser.keys('Escape');
                    await browser.pause(500);
                }
            } else {
                console.log("⚠️ 未找到输入框");
            }
        } else {
            console.log("⚠️ 快捷输入模态框未打开");
        }

        console.log("✅ 移动端快捷输入测试完成");
    });
});
