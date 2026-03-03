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
    await browser.pause(1000);
    await browser.keys('Enter');
    await browser.pause(2000);

    // 切换到阅读模式以触发代码块渲染
    await browser.keys(['Control', 'e']);
    await browser.pause(2000);

    // 验证 think 代码块被插件渲染（使用 waitForExist 而非 waitForDisplayed，因为元素可能因滚动等原因不在可视区域）
    const renderedBlock = await $('.block-language-think');
    await renderedBlock.waitForExist({ timeout: 15000 });

    console.log('✅ Think 代码块已正确渲染');
    expect(await renderedBlock.isExisting()).toBe(true);
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