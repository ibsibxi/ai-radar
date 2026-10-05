# AI 变现嗅探雷达

> 三大面板：AI 科技资讯 · AI 行业真实数据 · AI 风口探针
> 零后端 / 零依赖 / 零构建 / 零成本。数据每 3 小时由 GitHub Actions 自动更新。

## 结构
~~~
index.html                      页面结构
assets/style.css                样式
assets/app.js                   渲染逻辑（原生 JS）
scripts/fetch.mjs               零依赖抓取脚本，输出 data/data.json
data/data.json                  数据（自动生成，会被 Action 提交）
.github/workflows/update.yml    定时抓取与提交
~~~

## 数据源
- 资讯（12 源）：量子位 / IT之家 / 少数派 / 爱范儿 / 雷锋网 / 极客公园 / 36氪 / Hacker News / TechCrunch AI / OpenAI / HuggingFace / Google AI
- 说明：机器之心、36氪官方 RSS 已失效（返回 0 条），36氪改用镜像源；arXiv 论文已移除（对变现无价值）
- 真实数据：GitHub 近 14 天 AI 新星（Search API）、HuggingFace 热门模型
- 风口探针：近 48 小时关键词热度 + 与上次快照对比（涨跌）

## 🔄 如何更新数据（重点，先看这段）
**必须理解这件事**：网页上的「↻ 刷新」按钮**不会去抓新数据**，它只是重新读取本地的 data/data.json。
要拿到新数据，必须让抓取脚本跑一次。

### 方式一：本地一键更新（现在就能用）
1. 双击本目录下的 **更新数据.bat**
2. 等它跑完（约 1–2 分钟）
3. 回到网页按 **F5** 刷新

> ⚠️ 若手动执行 node scripts/fetch.mjs 时报 TLS 证书错误（GitHub / HuggingFace 拉不到），
> 请改用 node **--use-system-ca** scripts/fetch.mjs（更新数据.bat 已内置该参数）。

### 方式二：部署到 GitHub，全自动（推荐）
部署后 GitHub Actions 每 3 小时自动抓取并提交，你只要刷新网页就永远是最新。
**不部署，就永远是手动更新。** 步骤见下方「部署到 GitHub Pages」。

### 本地预览
- **直接双击** index.html（数据内嵌在 data/data.js，开箱即用）
- 或起本地服务器：npx serve .

## 部署到 GitHub Pages（免费）
1. 新建 GitHub 仓库，把本目录内容作为仓库根目录推送。
2. 仓库 Settings → Pages → Source 选「Deploy from a branch」，分支选 main，目录选 / (root)。
3. 仓库 Settings → Actions → General → Workflow permissions 选「Read and write permissions」。
4. 等 Action 跑一次后，访问 https://你的用户名.github.io/仓库名/

## 成本
¥0 / 月。全部使用免费公开接口与 GitHub 免费额度。

## 维护提示（给 agent）
- 改样式只动 assets/style.css；改渲染只动 assets/app.js；加数据源只改 scripts/fetch.mjs 的 FEEDS / KEYWORDS。
- 不要引入前端框架与构建链。
- 页面读取的字段契约见 data/data.json：stats / sources / news / data.github / data.huggingface / probe.keywords / probe.signals / opportunities / ideas / digest。
- opportunities 由 scripts/fetch.mjs 的 OPP_RULES 规则引擎生成：只收 AI 相关、非摘要类、非论文的新闻，按类型给行动建议。
- ideas 由 TOOL_TPL / TREND_TPL 模板生成；改标题风格改这里。
- data/projects.js：学生小项目库（人工策展，15 个项目；增减项目改这里）。
- data/toolbox.js：7 天启动计划 + 提示词工具箱（改提示词改这里）。
- 英文标题自动翻译成中文（MyMemory 免费接口，带缓存；改 translate() 可换源）。
- **本地抓取需加 --use-system-ca**：本机网络存在证书拦截，Node 默认不信任；GitHub Actions 上无需该参数。
- 资讯带 ai 标记，页面默认「只看 AI」，可一键切换。
