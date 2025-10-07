const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

async function testWithAxios() {
    console.log('=== 使用 Axios 测试 ChromeDriver 连接 ===\n');
    
    const chromeDriverPath = path.resolve('.obsidian-cache/electron-chromedriver/win32-x64/37.6.0/chromedriver.exe');
    const obsidianPath = path.resolve('.obsidian-cache/obsidian-installer/win32-x64/Obsidian-1.9.14/Obsidian.exe');
    
    // 启动 chromedriver
    console.log('1. 启动 ChromeDriver...');
    const chromedriver = spawn(chromeDriverPath, ['--port=9515']);
    
    // 等待启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        // 测试连接
        console.log('2. 测试 ChromeDriver 状态...');
        const statusResponse = await axios.get('http://127.0.0.1:9515/status');
        console.log('   状态:', statusResponse.data.value.ready ? '✓ Ready' : '✗ Not Ready');
        console.log('   版本:', statusResponse.data.value.build.version);
        
        // 尝试创建会话
        console.log('\n3. 尝试创建会话...');
        const sessionPayload = {
            capabilities: {
                alwaysMatch: {
                    browserName: 'chrome',
                    'goog:chromeOptions': {
                        binary: obsidianPath,
                        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                    }
                }
            }
        };
        
        try {
            const sessionResponse = await axios.post('http://127.0.0.1:9515/session', sessionPayload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('   ✓ 会话创建成功!');
            console.log('   Session ID:', sessionResponse.data.value.sessionId || sessionResponse.data.sessionId);
            
            // 清理会话
            const sessionId = sessionResponse.data.value.sessionId || sessionResponse.data.sessionId;
            if (sessionId) {
                await axios.delete(`http://127.0.0.1:9515/session/${sessionId}`);
                console.log('   会话已清理');
            }
        } catch (sessionError) {
            console.error('   ✗ 会话创建失败:', sessionError.message);
            if (sessionError.response) {
                console.error('   响应数据:', JSON.stringify(sessionError.response.data, null, 2));
            }
        }
        
    } catch (error) {
        console.error('错误:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('无法连接到 ChromeDriver。请确保端口 9515 没有被占用。');
        }
    } finally {
        // 清理
        chromedriver.kill();
        console.log('\n4. ChromeDriver 已停止');
    }
    
    console.log('\n=== 测试完成 ===');
}

// 首先安装 axios
const { exec } = require('child_process');
console.log('检查 axios 是否已安装...');
exec('npm list axios', (error) => {
    if (error) {
        console.log('安装 axios...');
        exec('npm install axios', (installError) => {
            if (installError) {
                console.error('无法安装 axios:', installError);
                return;
            }
            console.log('axios 安装成功\n');
            testWithAxios().catch(console.error);
        });
    } else {
        testWithAxios().catch(console.error);
    }
});
