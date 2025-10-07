const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function httpRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testDirectHTTP() {
    console.log('=== 直接 HTTP 测试 ChromeDriver ===\n');
    
    const chromeDriverPath = path.resolve('.obsidian-cache/electron-chromedriver/win32-x64/37.6.0/chromedriver.exe');
    const obsidianPath = path.resolve('.obsidian-cache/obsidian-installer/win32-x64/Obsidian-1.9.14/Obsidian.exe');
    
    // 先杀掉所有现有的 chromedriver 进程
    console.log('1. 清理现有 ChromeDriver 进程...');
    try {
        require('child_process').execSync('taskkill /F /IM chromedriver.exe 2>nul', { stdio: 'ignore' });
    } catch (e) {
        // 忽略错误（没有进程时会报错）
    }
    
    // 启动 chromedriver
    console.log('2. 启动新的 ChromeDriver...');
    const chromedriver = spawn(chromeDriverPath, ['--port=9515', '--log-level=INFO'], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let driverReady = false;
    
    chromedriver.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('ChromeDriver was started successfully')) {
            driverReady = true;
            console.log('   ✓ ChromeDriver 启动成功');
        }
    });
    
    chromedriver.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('ChromeDriver was started successfully')) {
            driverReady = true;
            console.log('   ✓ ChromeDriver 启动成功');
        }
    });
    
    // 等待启动
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (!driverReady) {
        console.log('   ⚠ ChromeDriver 可能未完全启动，继续尝试...');
    }
    
    try {
        // 测试连接
        console.log('\n3. 测试 ChromeDriver 状态...');
        const statusOptions = {
            hostname: '127.0.0.1',
            port: 9515,
            path: '/status',
            method: 'GET'
        };
        
        const statusResponse = await httpRequest(statusOptions);
        console.log('   HTTP 状态码:', statusResponse.status);
        
        if (statusResponse.status === 200) {
            console.log('   ChromeDriver 状态:', statusResponse.data.value.ready ? '✓ Ready' : '✗ Not Ready');
            console.log('   版本:', statusResponse.data.value.build.version);
            
            // 尝试创建会话
            console.log('\n4. 尝试创建会话...');
            const sessionData = {
                capabilities: {
                    alwaysMatch: {
                        browserName: 'chrome',
                        'goog:chromeOptions': {
                            binary: obsidianPath,
                            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-security']
                        }
                    }
                }
            };
            
            const sessionOptions = {
                hostname: '127.0.0.1',
                port: 9515,
                path: '/session',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify(sessionData))
                }
            };
            
            const sessionResponse = await httpRequest(sessionOptions, sessionData);
            
            if (sessionResponse.status === 200) {
                const sessionId = sessionResponse.data.value?.sessionId || sessionResponse.data.sessionId;
                console.log('   ✓ 会话创建成功!');
                console.log('   Session ID:', sessionId);
                
                // 清理会话
                if (sessionId) {
                    const deleteOptions = {
                        hostname: '127.0.0.1',
                        port: 9515,
                        path: `/session/${sessionId}`,
                        method: 'DELETE'
                    };
                    
                    await httpRequest(deleteOptions);
                    console.log('   会话已清理');
                }
            } else {
                console.log('   ✗ 会话创建失败');
                console.log('   响应:', JSON.stringify(sessionResponse.data, null, 2));
            }
        } else {
            console.log('   ✗ 无法获取 ChromeDriver 状态');
            console.log('   响应:', statusResponse.data);
        }
        
    } catch (error) {
        console.error('\n错误:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('无法连接到 ChromeDriver。端口 9515 可能被占用或防火墙阻止。');
        }
    } finally {
        // 清理
        chromedriver.kill();
        console.log('\n5. ChromeDriver 已停止');
    }
    
    console.log('\n=== 测试完成 ===');
}

testDirectHTTP().catch(console.error);
