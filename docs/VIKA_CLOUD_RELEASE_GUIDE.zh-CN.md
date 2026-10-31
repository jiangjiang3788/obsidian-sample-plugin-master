# Think OS：直接上传和下载三个插件文件

不使用 GitHub Release，不打发布 ZIP，不用 Quicker，也不再创建 `.env.local`。

## 最终流程

1. 你按自己的习惯完成构建，确认项目根目录里有 `main.js`、`styles.css`、`manifest.json`。
2. 执行 `npm run 发布:维格`。这个命令**不会重新构建**，只上传当前的三个文件到维格表，并自动填写**上传时间**。
3. Obsidian 中点击“检查维格表更新”→“下载并安装云端构建”。下载三个原始文件，全部通过校验后再替换本地文件。
4. 退出并重新打开 Obsidian。`manifest.json` 版本号不变，只改 JS 或 CSS 也能检测到更新。

## 令牌存放位置

**`Think/data.json` 是你的插件本来就在使用的统一配置文件**，不是 `.obsidian/plugins/think-os/data.json`。

新版本在这个 JSON 的顶层新增 `vikaApiToken`。在 Think OS 设置界面的“维格表云端更新”中填写令牌并点击“保存到 Think/data.json”；仍走原来的 `SettingsRepository` 持久化，不直接覆盖其他设置。

示意（仅表示新字段；切勿用以下内容覆盖实际 data.json）：

```json
{
  "goalSettings": {"goals": [], "goalTemplates": []},
  "vikaApiToken": "在自己的 Obsidian 设置页面中输入"
}
```

发布脚本默认寻找以下文件（按照先后顺序）：

- 源码根目录的 `Think/data.json`
- 源码上一层目录的 `Think/data.json`
- 当前运行目录的 `Think/data.json`

如果源码与 Obsidian Vault 位于完全不同的目录，可以显式指定**实际 Vault 中的原文件**：

```bash
npm run 发布:维格 -- --data "D:/ObsidianVault/Think/data.json"
```

也可以在运行环境中设置 `THINK_DATA_JSON` 为该文件路径，之后命令仍是 `npm run 发布:维格`。它**只提供路径**，令牌依然来自 Think/data.json。发布脚本只读这个文件，不会修改里面的目标、布局或其他数据。

**安全提醒**：你选择保存在 `Think/data.json` 的令牌是明文，并会随 Vault 的同步与备份传播，请不要将这个文件上传至公开 GitHub 或发给他人。之前在聊天中公开的令牌建议作废并重新生成。

## 维格表列

脚本首次执行时检查或创建这六列（已有同名列会核对类型，不擅自覆盖）：

| 列名 | 字段类型 | 内容 |
|---|---|---|
| 版本号 | 单行文本 | 从 manifest.json 读取 |
| 构建ID | 单行文本 | 三个文件的整体内容指纹 |
| 上传时间 | 日期时间 | 上传成功时生成，精确到毫秒 |
| main.js | 附件 | 单独上传 main.js |
| styles.css | 附件 | 单独上传 styles.css |
| manifest.json | 附件 | 单独上传 manifest.json |

每次完整上传只创建一条记录。三个附件未全部上传成功，不生成新的有效记录。无须“安装包”或“包SHA256”列。以前的 ZIP 发布行可以保留，但新更新器只认有三个独立附件的行。

## 命令

```bash
# 构建由你自行决定什么时候执行；发布命令绝不覆盖手动修改过的三文件
npm run 发布:维格

# 只检查当前三个文件，不联网、不上传
npm run 检查:维格三文件

# 如果你临时想让同一个脚本先 build 再上传，才加这个可选参数
npm run 发布:维格 -- --build
```

脚本不会推送 GitHub，不会创建 GitHub Releases，也不会额外打包 ZIP。

## 首次通过 GitHub 过渡

老 Obsidian 插件还没有“维格表更新”按钮，需要**只更新一次 GitHub `main` 分支**：

1. 将这份更新的源码合并到现有 GitHub 工程（保持原 `.git`）；确保源码依赖已安装。
2. 在本地构建，确认根目录 `main.js`、`styles.css` 和 `manifest.json` 是新的文件。
3. 将源码和三个编译文件推送到 GitHub `main`，**不要提交 `Think/data.json` 或 API 令牌**。
4. 旧插件使用已有的“从 GitHub 下载并安装最新开发版”，完全退出并重启 Obsidian。
5. 新版设置界面保存一次 Token；构建端使用上述发布命令上传三文件，此后走维格表按钮。

旧 GitHub 通道按原来方式从仓库 `main` 分支 SHA 固定下载这三个原始文件；**完全不依赖 GitHub Releases**。

## 安全校验和故障处理

- **新版本识别**：对三个文件内容计算统一 SHA-256 指纹，与本地磁盘上的三个文件比较。manifest 版本号不变也可以更新。
- **完整性**：先下载完三个附件，确认字节长度、UTF-8、插件 ID、正式版本及整体指纹，再进行任何本地覆盖。
- **失败回滚**：GitHub 和维格表共用同一个安全安装器，写入校验失败时恢复备份，不允许两条通道同时写入。
- **附件 URL 过期**：不长期保存 CDN 链接；每次从最新记录读取链接。遇到下载失败会为同一记录重新获取一次。
- **不保证绝对免网络问题**：仍然依赖访问维格表 API 和附件存储 CDN。

## 测试说明

```bash
npm run test:vika:smoke
npm run test:vika:publisher
```

以上是模拟网络测试，**不会操作真实维格表**。源码需要在拥有完整 npm 依赖的电脑上构建并经 Obsidian 实机确认。当前环境未完成正式主项目打包或真实账号 API 上传。
