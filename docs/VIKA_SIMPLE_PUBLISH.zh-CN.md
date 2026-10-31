# Think OS 维格表更新

本地构建三个文件，维格表分别保存附件；不使用 ZIP 或 GitHub Release。

## 发布

在插件源码目录执行：

```powershell
npm run build
npm run 发布:维格
```

如果三个文件已经构建好，只需执行第二条命令。命令无报错退出就是发布成功，不打印正常运行日志。

脚本会优先从当前插件所在 Obsidian 仓库的 `Think/data.json` 读取 `vikaApiToken`。源码不在仓库目录时，运行：

```powershell
npm run 发布:维格 -- --data "G:\vikahz\Think\data.json"
```

仅在排查字段或接口问题时使用只读诊断：

```powershell
npm run 发布:维格 -- --diagnose
```

## 下载

Obsidian → 设置 → 第三方插件 → Think OS，或进入 Think OS 控制台 → 通用 → 云端更新。

在「维格表（Vika）更新」界面设置令牌并点击「从维格表下载最新构建」。不需要命令面板，不包含 GitHub 更新入口。

同一个 `manifest.json` 版本号下，`main.js` 或 `styles.css` 只要发生变化也会识别为新构建。下载安装完成时按提示完全重启 Obsidian。下载、校验或写入失败时不会保留不完整文件。

令牌存于 `Think/data.json`，不得提交到公开仓库。iOS、Android、桌面端使用同一下载界面，令牌输入框边框颜色继承 Obsidian 主题。

首次安装或替换旧插件时，本地运行 `npm run build`，把生成的 `main.js`、`styles.css` 和 `manifest.json` 放进 Obsidian 的 Think OS 插件目录；重启生效后以后使用 Vika 更新即可。
