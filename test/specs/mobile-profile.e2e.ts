/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F131/e2e
 */
import { $, browser } from '@wdio/globals';
import { clearE2EState, waitForThinkReady } from './support/thinkE2e';

const DESKTOP_SIZE = { width: 1280, height: 900 };

describe('Think OS 真机：窄屏移动式交互适配', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
  });

  afterEach(async () => {
    try { await browser.setWindowSize(DESKTOP_SIZE.width, DESKTOP_SIZE.height); } catch {}
  });

  it('真实 Obsidian 窗口缩到手机宽度后，Quick Input 自动进入移动式布局并带设备属性', async () => {
    await browser.setWindowSize(430, 820);
    await browser.executeObsidianCommand('think-os:think-quick-input-unified-core.energy');

    const modal = await $('.think-quick-input-modal');
    await modal.waitForExist({ timeout: 10_000 });
    expect(await modal.getAttribute('data-think-viewport')).toBe('narrow');
    expect(await modal.getAttribute('class')).toContain('think-quick-input-modal--mobile');
    expect(await modal.getAttribute('class')).toContain('think-os--mobile');

    const footer = await $('.think-modal__footer--quick-input');
    if (await footer.isExisting()) {
      expect(await footer.getAttribute('class')).toContain('is-mobile-like');
    }
  });

  it('恢复桌面宽度后新打开的 Quick Input 回到桌面交互，不残留移动端 class', async () => {
    await browser.setWindowSize(DESKTOP_SIZE.width, DESKTOP_SIZE.height);
    await browser.executeObsidianCommand('think-os:think-quick-input-unified-core.energy');
    const modal = await $('.think-quick-input-modal');
    await modal.waitForExist({ timeout: 10_000 });
    expect(await modal.getAttribute('data-think-viewport')).toBe('wide');
    expect(await modal.getAttribute('class')).toContain('think-quick-input-modal--desktop');
    expect(await modal.getAttribute('class')).not.toContain('think-quick-input-modal--mobile');
  });
});
