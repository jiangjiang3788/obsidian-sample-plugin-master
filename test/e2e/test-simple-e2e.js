const { remote } = require('webdriverio');
const path = require('path');

async function testSimpleE2E() {
    console.log('=== 简单 E2E 测试 ===\n');

    const chromeDriverPath = path.resolve('.obsidian-cache/electron-chromedriver/win32-x64/37.6.0/chromedriver.exe');
    const obsidianPath = path.resolve('.obsidian-cache/obsidian-installer/win32-x64/Obsidian-1.9.14/Obsidian.exe');

    console.log('启动 WebdriverIO 会话...');
    
    try {
        const browser = await remote({
            capabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    binary: obsidianPath,
                    args: ['--no-sandbox', '--disable-dev-shm-usage']
                }
            },
            logLevel: 'error',
            port: 9515,
            path: '/'
        });

        console.log('\n✅ 会话创建成功!');
        
        // 获取窗口标题
        const title = await browser.getTitle();
        console.log('窗口标题:', title);
        
        // 获取当前 URL
        const url = await browser.getUrl();
        console.log('当前 URL:', url);
        
        // 等待一下让 Obsidian 完全加载
        await browser.pause(2000);
        
        // 清理
        await browser.deleteSession();
        console.log('\n会话已关闭');
        
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        console.error('详细信息:', error);
    }
    
    console.log('\n=== 测试完成 ===');
}

testSimpleE2E().catch(console.error);
