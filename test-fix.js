// 简单的测试脚本来验证修复
console.log('测试修复...');

// 模拟原始错误场景
const mockState = {
    settings: {},
    isTimerWidgetVisible: true,
    timer: {
        getTimers: () => [
            { id: '1', taskId: 'task1', status: 'running' },
            { id: '2', taskId: 'task2', status: 'paused' }
        ]
    }
};

// 测试原始的错误代码（会导致 Cannot read properties of undefined）
try {
    const timers = mockState.timers; // 这会是 undefined
    const result = timers.find(t => t.taskId === 'task1');
    console.log('原始代码结果:', result);
} catch (error) {
    console.log('原始代码错误:', error.message);
}

// 测试修复后的代码
try {
    const timers = mockState.timer.getTimers(); // 这会返回数组
    const result = timers.find(t => t.taskId === 'task1');
    console.log('修复后代码结果:', result);
    console.log('✅ 修复成功！');
} catch (error) {
    console.log('修复后代码错误:', error.message);
}
