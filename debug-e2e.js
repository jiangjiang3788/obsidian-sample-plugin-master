const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function debugE2E() {
    console.log('=== E2E 测试调试 ===\n');

    // 检查关键文件
    const chromeDriverPath = path.resolve('.obsidian-cache/electron-chromedriver/win32-x64/37.6.0/chromedriver.exe');
    const obsidianPath = path.resolve('.obsidian-cache/obsidian-installer/win32-x64/Obsidian-1.9.14/Obsidian.exe');
    
    console.log('1. 检查文件存在性:');
    console.log(`   ChromeDriver: ${fs.existsSync(chromeDriverPath) ? '✓' : '✗'} ${chromeDriverPath}`);
    console.log(`   Obsidian: ${fs.existsSync(obsidianPath) ? '✓' : '✗'} ${obsidianPath}\n`);

    // 尝试手动启动 chromedriver
    console.log('2. 尝试手动启动 ChromeDriver...');
    const chromedriver = spawn(chromeDriverPath, ['--port=9515', '--verbose'], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let driverStarted = false;
    
    chromedriver.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('ChromeDriver was started successfully')) {
            driverStarted = true;
            console.log('   ChromeDriver 启动成功!\n');
        }
    });

    chromedriver.stderr.on('data', (data) => {
        console.error('   ChromeDriver 错误:', data.toString());
    });

    // 等待 chromedriver 启动
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (driverStarted) {
        // 测试连接
        console.log('3. 测试 ChromeDriver 连接...');
        try {
            const response = await fetch('http://localhost:9515/status');
            const data = await response.json();
            console.log('   连接成功! ChromeDriver 版本:', data.value.build.version);
            console.log('   状态:', data.value.ready ? 'Ready' : 'Not Ready', '\n');
        } catch (error) {
            console.error('   连接失败:', error.message, '\n');
        }

        // 尝试创建一个会话
        console.log('4. 尝试创建 WebDriver 会话...');
        try {
            const sessionResponse = await fetch('http://localhost:9515/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    capabilities: {
                        alwaysMatch: {
                            browserName: 'chrome',
                            'goog:chromeOptions': {
                                binary: obsidianPath,
                                args: ['--no-sandbox', '--disable-dev-shm-usage']
                            }
                        }
                    }
                })
            });
            
            const sessionData = await sessionResponse.json();
            if (sessionData.sessionId) {
                console.log('   会话创建成功! Session ID:', sessionData.sessionId);
                
                // 清理会话
                await fetch(`http://localhost:9515/session/${sessionData.sessionId}`, {
                    method: 'DELETE'
                });
                console.log('   会话已清理\n');
            } else {
                console.log('   会话创建失败:', JSON.stringify(sessionData, null, 2), '\n');
            }
        } catch (error) {
            console.error('   会话创建错误:', error.message, '\n');
        }
    }

    // 清理
    chromedriver.kill();
    console.log('5. ChromeDriver 进程已终止');
    
    console.log('\n=== 调试完成 ===');
}

debugE2E().catch(console.error);
