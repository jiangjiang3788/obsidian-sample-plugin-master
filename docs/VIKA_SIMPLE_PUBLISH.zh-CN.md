# Think OS · 维格表发布，最简操作

不使用 GitHub Release、ZIP、Quicker，也不会在上传时偷偷重新构建。

## 首次使用（只做一次）

1. 把此工程修改版合并到原始 Think OS 1.18.2 源码；在工程目录打开终端，运行 `npm ci`、`npm run build`。
2. 把构建所得根目录的 `main.js`、`styles.css`、`manifest.json` 和源码提交、推送到原 GitHub 仓库的 `main` 分支（只用于过渡一次）。
3. 旧版 Obsidian 使用原来的 GitHub 更新按钮下载安装，**完全重启 Obsidian**。
4. 在 Obsidian 使用命令面板（Ctrl/Cmd+P），运行 **维格表：设置 API 令牌**，粘贴新令牌并保存。它会写进原有 Vault 的 `Think/data.json`，不会清空原有数据。

## 每次发布到维格表

在源码工程目录中：

```bash
npm run build
npm run 检查:维格
npm run 发布:维格
```

如果你已自己构建或改过编译后的文件，**只运行最后一条命令即可**。它读取工程根目录三个现有文件，不再构建或生成 ZIP。`检查:维格` 只做本地检查，不上传。

脚本会从你的 `Think/data.json` 取令牌，逐个上传三个文件到固定维格表，自动创建缺失的列，登记一条带有 **上传时间** 和 **构建ID** 的记录。同样的构建不会重复上传。只要 JS/CSS 变化，即使 manifest 版本号相同也会生成新构建ID。

如果源码文件夹不在 Obsidian Vault 内，脚本可能找不到 Vault 里的 `Think/data.json`，这时使用：

```powershell
npm run 发布:维格 -- --data "D:\ObsidianVault\Think\data.json"
```

把示例路径替换为你真实的 Vault 位置。以后在同一个终端设置 `THINK_DATA_JSON` 环境变量，也可以直接运行 `npm run 发布:维格`。

## 下载更新

在另一台已完成过渡安装的 Obsidian 里，打开命令面板，选择 **维格表：下载并安装最新构建**，成功后完全退出并重启。新设备先运行 **维格表：设置 API 令牌**。

## 注意事项

- API 令牌明文保存在 `Think/data.json`，如果同步 Vault 也可能同步过去。不要把该文件提交到 GitHub，也不要在日志中复制令牌。原对话中暴露过的令牌建议先撤销并换新。
- 只修改 `manifest.json` 但未构建也可以发布，只要三个文件仍然是正确且匹配的插件文件。
- 附件下载链接会变化；插件更新时会重新向维格表请求链接，下载校验未通过就不会覆盖本地文件。
- V1 仅在本地模拟 API 及安装器测试过，未进行真实维格表上传、完整 npm 构建和 Obsidian 实机验证。
