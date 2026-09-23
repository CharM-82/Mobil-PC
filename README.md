# Codex Pocket

手机远程控制电脑上 Codex 的最小可用版本。云端只转发消息；代码、Codex 和项目始终留在电脑上。

## 启动

需要 Node.js 22+、npm 和已登录的 Codex CLI。

```powershell
npm install
Copy-Item projects.example.json projects.json
```

编辑 `projects.json`，写入真实项目绝对路径。然后开两个终端：

```powershell
$env:POCKET_TOKEN="换成一个随机长字符串"
npm start
```

```powershell
$env:POCKET_SERVER="ws://localhost:3000"
$env:POCKET_TOKEN="同一个随机长字符串"
npm run agent
```

手机打开 `http://电脑地址:3000/?token=同一个随机长字符串` 即可本地验证。

## 部署到 Render

1. 把仓库推送到 GitHub。
2. 在 Render 用仓库里的 `render.yaml` 创建 Web Service。
3. 在 Render 查看自动生成的 `POCKET_TOKEN`，把它设置到电脑端环境变量。
4. PC Agent 的 `POCKET_SERVER` 设为 `wss://你的服务.onrender.com`。
5. 手机打开 `https://你的服务.onrender.com/?token=你的令牌`。

## MVP 边界

- 一台电脑、一个正在执行的任务。
- 任务由真实的 `codex exec` 在所选目录中执行。
- WebSocket 审批消息和 UI 已实现，但 Codex CLI 的非交互模式暂不提供可恢复的原生审批暂停点，因此当前任务使用 `workspace-write` 且审批策略为 `never`；超出沙箱的操作会失败，不会弹出伪审批。
- 中转服务不持久化聊天记录，刷新页面后时间线清空。
