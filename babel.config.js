module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      modules: 'auto'  // 让 Babel 自动决定模块类型
    }]
  ],
  plugins: [
    // 添加插件以支持动态导入和装饰器
    '@babel/plugin-syntax-dynamic-import',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-proposal-class-properties'
  ],
  // 为测试环境添加特殊配置
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          },
          modules: 'commonjs'  // 测试环境使用 CommonJS
        }]
      ]
    }
  }
};
