// e2e/mvp-test.spec.ts
import { test, expect, chromium } from '@playwright/test';

test('MVP Test: Final and Corrected Version', async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];

  // Wait for the workspace to be ready
  await page.locator('.workspace-leaf.mod-active').waitFor({ state: 'visible', timeout: 30000 });
  console.log('Workspace loaded, continuing test!');

  // --- Use Ctrl+O to open the quick switcher ---

  // 1. Press the hotkey
  await page.keyboard.press('Control+o');

  // 2. Locate the input and fill in the filename
  // CORE FIX: Use the exact placeholder text discovered from the trace file
  const fileInput = page.getByPlaceholder('输入以切换或创建文件…'); 
  await fileInput.fill('E2E-TEST-PAGE.md');
  await page.keyboard.press('Enter');
  
  // --- The file is now open, begin testing plugin functionality ---

  await page.waitForTimeout(500);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.locator('.cm-content').click();
  await page.keyboard.type('```think\n{"layout": "默认布局"}\n```');
  await page.waitForTimeout(1000);

  // Assertions
  const renderedBlock = page.locator('.block-language-think');
  await expect(renderedBlock).toBeVisible();
  const layoutContainer = renderedBlock.locator('.think-module');
  await expect(layoutContainer).toBeVisible();
  console.log('✅ Assertion successful! Plugin UI rendered correctly!');

  await browser.close();
});