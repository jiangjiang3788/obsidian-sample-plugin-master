import { browser, $ } from '@wdio/globals';

describe('Think Plugin 冒烟测试', () => {

  it('Obsidian 工作区加载成功', async () => {
    console.log('等待 Obsidian 工作区加载...');
    const workspace = await $('.workspace-leaf');
    await workspace.waitForExist({ timeout: 40000 });
    console.log('✅ 工作区已加载');
    expect(await workspace.isExisting()).toBe(true);
  });

  it('插件已正确加载', async () => {
    // 验证插件的代码块处理器是否注册：打开含有 think 代码块的文件
    // 使用快捷键打开文件切换器
    await browser.keys(['Control', 'o']);
    const fileInput = await $('input.prompt-input');
    await fileInput.waitForDisplayed({ timeout: 5000 });
    await fileInput.setValue('Welcome');
    await browser.pause(500);
    await browser.keys('Enter');
    await browser.pause(1500);

    // 切换到阅读模式以触发代码块渲染
    await browser.keys(['Control', 'e']);
    await browser.pause(1500);

    // 验证 think 代码块被插件渲染
    const renderedBlock = await $('.block-language-think');
    await renderedBlock.waitForDisplayed({ timeout: 10000 });

    console.log('✅ Think 代码块已正确渲染');
    expect(await renderedBlock.isDisplayed()).toBe(true);
  });

  it('插件 UI 容器结构完整', async () => {
    // 验证插件渲染出的 UI 容器存在
    const thinkBlock = await $('.block-language-think');
    expect(await thinkBlock.isExisting()).toBe(true);

    // 容器应该有子元素（说明插件确实渲染了内容，而不是空壳）
    const children = await thinkBlock.$$('*');
    expect(children.length).toBeGreaterThan(0);
    console.log(`✅ Think 代码块包含 ${children.length} 个子元素`);
  });
});
