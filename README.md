# 简历工坊（Resume Craft）

> 全行业多风格智能简历编辑器 · 左侧工作台编辑，右侧实时 A4 所见即所得预览，支持**零配置离线使用**与**接入自有 AI 接口（BYOK / 本地 Ollama）**协作。

> **重要说明（非内置大模型）**：本项目本身**不内置任何大模型权重、不提供免费模型服务，也不包含任何内置 API Key**。离线排版、12 大行业模板、本地简历体检、竞争力雷达、离线 JD 关键词扫描、版本对比与多格式导出均可**零配置直接使用**；如需使用站内一键 AI 协作功能，请通过根目录 `.env` 或页面右上角 **「设置（`SettingsModal`）」** 填入你自己的模型接口与 API Key（或连接本地 Ollama）。

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

---

## 核心特性

### 1. 专业 A4 排版与精细化视觉控制
- **8 大 A4 统一版式**：单栏现代、居中经典、工程时间轴、卡片网格、双栏（左/右栏切换）、杂志分栏、顶部深色横幅分栏，切换样式不丢失正文内容。
- **10 套主题色 + 自定义主色**：支持自由拾色并自动推导柔和底色与边框体系；提供 4 种模块标题装饰、3 种眉首样式、3 种字体气质（现代黑体 / 人文衬线题 / 书卷全衬线，支持离线本地中文字体优雅降级）与 4 种量化亮点条样式。
- **实时排版微调**：在「外观排版」中通过滑块实时调节正文字号（`--r-fs`）、整体字重（`--r-fw-base`，`300–700`）、行高与纵向间距（`--r-lh`，`1.20–2.00`）以及页面边距（`--r-pad`）。
- **智能压一页、多页防断行 & 黑白打印省墨保护**：支持自动缩放压入 1 页 A4；关闭压一页时展示 A4 分页参考线，打印自动避开标题孤行与卡片跨页断行；支持一键黑白预览、隐私信息脱敏（手机号/邮箱打码）与黑白激光打印省墨保护。

### 2. 12 大行业模板库与高效编辑工作流
- **行业模板广场**：内置自动化/PLC、游戏策划、互联网研发与数据、销售外贸、财税金融、文科教培、行政法务、设计新媒体、医疗护理、建筑供应链、应届通用等 12 大行业模板，支持按关键词检索与「仅套用版式 / 新建简历」。
- **双向联动编辑**：点击右侧 A4 简历画布任意区域直接定位至左侧对应编辑模块；支持自由拖拽/调整模块顺序、显隐控制、自定义扩展模块（标签 / 要点 / 标题段落 / STAR 案例 / 纯文本）以及撤销/重做历史栈（`Ctrl+Z` / `Ctrl+Shift+Z`，`Ctrl+P` 触发 PDF 预检；保留最近 50 次操作，并在自动保存周期内定时清理历史堆栈以防长时运行内存膨胀）。
- **多版本管理体系**：
  - **版本克隆并衍生**：基于当前简历一键生成「针对性优化版」，自动记录原版本关联职位与派生谱系，便于多岗位投递对比。
  - **版本对比（Diff 视图）**：选择任意两份简历版本，按模块高亮展示文字增删、字数变化、量化指标数量对比与样式差异。
  - **中英双语切换**：自动识别简历关键内容，调用你配置的 AI 接口进行地道英文专业术语润色翻译，并完整保留原中文版，支持随时一键互切、同步重译与双语对比。

### 3. 简历体检、竞争力评估与 AI 深度协作
- **右侧「简历竞争力雷达图」**：实时解析当前简历，从**行业契合度、资历深度、项目丰富度、描述专业度**四个维度进行量化打分，并给出优先提升项与一键跳转优化。
- **本地离线简历体检 & 量化增强**：无需联网即可检测必填项缺失、内容过短、弱动词开头、缺乏百分比/数字/金额的经历描述，并提供上下文增强建议与一键应用。
- **双引擎 JD 关键词扫描与语义相关性打分**：
  - **本地离线引擎**：内置正则预处理清洗（乱码/HTML/全角符号）、同义词库映射、加权模糊匹配、原文高亮，以及交互式 `[×]` 删除误提词与 `+` 手动补充词条。
  - **LLM 增强引擎（需配置自有 API 或使用外部复制模式）**：支持调用你接入的大模型，或零配置「复制 Prompt / 粘贴 JSON」到任意外部网页端 AI，对 JD 硬性要求进行结构化分类提取（忽略软性套话），并基于简历真实工作/项目经历执行 **0–100 语义相关性打分**（附带经历佐证与补强建议）。
- **工作经历 STAR 扩充**：根据填写的公司与岗位职责，一键生成 3 条符合 STAR 原则的补充经历建议并支持逐条插入。
- **PDF 导出前置体检与双端直出**：Web 端导出 PDF 前自动检查必填项、内容饱满度、示例占位符残留与重复条目并引导浏览器打印导出；Electron 独立桌面版支持直接弹出系统保存框并静默生成零边距 A4 矢量 PDF。
- **多格式导出与多源导入**：支持 PDF、Word（`.doc` HTML）、Markdown、纯文本、JSON 备份导入，以及**原始纯文本简历粘贴解析**与 **LinkedIn 档案一键导入**（支持中英文 LinkedIn 网页/导出 PDF 文本离线去噪解析，亦可选用已配置的 AI 接口精准抽取）。

---

## AI 接口配置说明（非内置大模型 / BYOK）

为了避免产生「项目内置免费模型」的误解，请先了解以下功能边界：

| 使用模式 | 是否需要 API Key | 可用功能范围 |
| --- | --- | --- |
| **零配置离线模式** | **不需要** | 全部 A4 排版样式、12 大行业模板、竞争力雷达、本地简历体检、离线 JD 关键词扫描、版本 Diff 对比、PDF/Word/Markdown/JSON 导入导出，以及 **「复制 Prompt → 粘贴 JSON」** 外部 AI 协作模式 |
| **自有 AI 接口直连模式（BYOK）** | **需要用户自备 Key**（本地 Ollama 除外） | 站内一键 AI 深度体检、跨岗定制改写、LLM 结构化 JD 提取与语义相关性打分、工作经历 STAR 扩充、中英双语翻译、原始文本 AI 解析 |

如需启用站内一键 AI 协作，支持以下 **两种配置方式（二选一即可）**：

### 方式一：在应用内 `SettingsModal` 弹窗配置（推荐，无需重启）
1. 点击页面右上角的 **「设置」** 按钮（打开 `SettingsModal` 弹窗），进入 **「AI 接口配置」** 页签。
2. 选择协议类型（**OpenAI 兼容协议** 或 **Anthropic Claude**）：
   - 页面提供 DeepSeek、Kimi、硅基流动、通义千问（兼容模式）、OpenAI、OneAPI / NewAPI 中转站、**本地 Ollama（免 Key）** 等**快捷地址模板按钮**——这些按钮**仅自动填入对应平台的 Base URL 与默认 Model ID，绝不包含 API Key，也不代表项目内置该模型**。
3. 填入你自己的 `API Key`（本地 Ollama 如 `http://localhost:11434/v1` 可留空），点击 **「测试连接 / 拉取模型列表」** 验证连通性，然后保存。
4. **隐私与存储机制**：通过 `SettingsModal` 填写的 API Key 仅保存在本机浏览器 `localStorage` 中；发起 AI 请求时仅经由本地/自托管后端代理（`/api/ai/*`）无状态转发以解决浏览器跨域（CORS），服务端不会落盘、记录或上报你的密钥与简历数据。

### 方式二：通过根目录 `.env` 文件配置（适合自托管或 `.exe` 同级目录预设）
如果你希望为自托管服务器或本地便携版 `.exe` 提供默认后端 AI 配置，可复制模板文件并填入你自己的密钥：

```bash
cp .env.example .env
```

`.env` 支持以下配置项（便携版 `.exe` 可直接将 `.env` 放在 `.exe` 同级目录下）：

```env
PORT="3000"

# 方案一：OpenAI 兼容接口（DeepSeek / Kimi / 通义千问 / 硅基流动 / Ollama / 中转站）
AI_BASE_URL="https://api.deepseek.com/v1"
AI_API_KEY="sk-your-own-key"
AI_MODEL="deepseek-chat"

# 或本地 Ollama（无需 API Key）
# AI_BASE_URL="http://localhost:11434/v1"
# AI_MODEL="qwen2.5:14b"

# 方案二：Anthropic Claude（官方或兼容中转）
# ANTHROPIC_BASE_URL="https://api.anthropic.com"
# ANTHROPIC_API_KEY="sk-ant-your-own-key"
# ANTHROPIC_MODEL="claude-sonnet-4-20250514"
```

> **生效优先级**：当用户在前端 `SettingsModal` 中保存并启用了自定义接口配置时，请求会优先使用前端配置（支持随时动态切换模型而无需重启服务）；清除前端自定义配置后，自动回退到 `.env` 中的服务端配置。

> **网络与安全声明**：**请确保你的本地网络环境能够访问该模型接口。如果选择中转站，请自行甄别安全性。**

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite 8（`base: './'` 兼容桌面端 `file://` 加载，按需懒加载与智能分包）+ Tailwind CSS v4 + Lucide React
- **服务端**：Express + `tsx`（负责 Web/自托管静态资源、AI 代理转发 `/api/ai/*`，以及 Bun 便携版可选本地存储 `/api/local-store`）
- **桌面端打包（双形态）**：
  - **Electron 独立桌面便携版（无黑框）**：`electron/*.cjs` + `electron-builder.yml`（通过 IPC 直接落盘 `resumes-data.json` 与 `printToPDF` 零边距直出 PDF；`electron` 与 `electron-builder` 仅在 CI 打包阶段临时安装，不写入根目录 `package.json` 依赖）
  - **Bun 单文件便携版**：`bun build --compile`（内嵌 Express 服务端与前端资源，适合需要本地 `/api/ai/*` 代理的便携使用）
- **测试**：Node.js 原生测试运行器（`node:test` + `tsx`）
- **数据持久化**：Web 模式存储在浏览器 `localStorage`；Electron 桌面版与 Bun 便携版均自动落盘至 `.exe` 同级目录 `resumes-data.json`

---

## 快速开始

### 环境要求
- Node.js `>= 20`（推荐 22 LTS）；如需本地打包单文件 `.exe`，需安装 [Bun](https://bun.sh/)。

### 1. 安装依赖

```bash
npm install
# 或使用 bun：bun install
```

### 2. 配置 AI 接口（可选）
- 仅离线编辑或打算在页面右上角 **「设置（`SettingsModal`）」** 中填写 API Key 的用户，可直接跳过此步。
- 如需服务端预设接口，请参考上方 [方式二：通过根目录 `.env` 文件配置](#方式二通过根目录-env-文件配置适合自托管或-exe-同级目录预设)。

### 3. 启动开发环境

```bash
npm run dev
```

启动后访问：`http://localhost:3000`

### 4. 生产构建与运行

```bash
npm run build
npm start
```

### 5. 打包 Windows 便携版 `.exe`（提供两种形态）

#### 5.1 Electron 无黑框独立桌面版（推荐 · 离线编辑与高清 PDF 直出）
基于 Electron 独立窗口直接加载 `dist/index.html`，**无命令行黑框、不启动 3000 端口本地服务**：
- **便携数据落盘**：优先读取 `PORTABLE_EXECUTABLE_DIR`（未设置时回退到打包后 `.exe` 所在目录或当前工作目录），保证单文件便携 `.exe` 始终在真实同级目录读写 `resumes-data.json`（兼容 `version / updatedAt / activeId / resumes`），绝不写入系统临时文件夹。
- **高清零边距 PDF 直出**：点击「导出 PDF」直接弹出系统保存对话框，调用 Electron `printToPDF` 静默输出 A4 零边距矢量 PDF（无需配置浏览器打印选项）。
- **外链安全打开 & 单实例锁**：点击外部链接自动调用系统默认浏览器打开；重复双击自动唤起已有窗口。
- **GitHub Actions 云端自动构建（推荐）**：仓库已内置 `.github/workflows/build-desktop.yml`：
  - 手动触发：在 GitHub 仓库 **Actions → Build Electron Desktop App (Windows Portable .exe) → Run workflow** 点击运行（可填可选版本号），构建完成后直接从 Artifacts 下载 `ResumeCraft-win-x64.exe`；
  - 标签自动发版：推送 `v*` 标签（如 `git tag v1.1.0 && git push origin v1.1.0`），自动打包并创建 GitHub Release 挂载 `ResumeCraft-win-x64.exe`。
- **说明**：为保护在线预览沙盒与纯 Web 开发环境不被大型二进制包卡死，`electron` 与 `electron-builder` **未写入**根目录 `package.json` 依赖，仅在云端 CI 打包步骤中临时安装。若需在本机 Windows 手动打包，可依次执行：
  ```bash
  npm run build
  npm install --no-save electron electron-builder
  npx electron-builder --win portable --config electron-builder.yml
  # 生成产物：release/ResumeCraft-win-x64.exe
  ```

#### 5.2 Bun 轻量单文件便携版（自带本地服务与 AI 代理）
如果你希望在单文件 `.exe` 中保留本地 Express 服务端（以便通过 `.exe` 同级 `.env` 预设 AI Key 并经由 `/api/ai/*` 代理规避跨域），可使用 Bun 单文件方案（双击自动启动本地服务并打开默认浏览器，端口冲突自动避让）：

```bash
# 本地打包 Windows x64 单文件 .exe（需安装 Bun）
bun run build:exe
# 生成产物：release/ResumeCraft-win-x64.exe
```

- **本地文件自动持久化（不怕清缓存/换端口）**：便携版启动后会自动在 `.exe` 同级目录创建并同步 `resumes-data.json`（若所在目录只读，则自动回退到用户目录 `~/.resume-craft/resumes-data.json`）；可在右上角「设置 → 本地数据与隐私」查看当前同步路径。将 `.exe` 与 `resumes-data.json` 一并拷贝到 U 盘或新电脑即可无损迁移。
- **防重复启动（单实例守卫）**：如果服务已在后台运行，再次双击 `.exe` 会自动检测到已有实例并直接打开对应网页，不会重复启动多个后台进程。
- **配置 AI 接口**：可在 `.exe` 同级目录放一份 `.env` 文件，或直接在右上角「设置（`SettingsModal`）」中填写自有接口与 Key。
- **GitHub 自动发版与 SHA256 校验**：仓库同时保留 `.github/workflows/build-exe.yml`：
  - 在 GitHub 仓库的 **Actions → Build Standalone Executable (.exe) → Run workflow** 点击运行，即可下载 `ResumeCraft-win-x64.exe` 与 `SHA256SUMS.txt`；
  - **Windows SmartScreen 说明**：开源项目未购买商业代码签名证书，首次双击若出现系统安全提示，点击 **「更多信息 → 仍要运行」** 即可（也可先对照 `SHA256SUMS.txt` 校验文件哈希）。

### 6. 类型检查与单元测试

```bash
# TypeScript 类型检查
npm run lint

# 运行全部核心逻辑单元测试（含双语、竞争力雷达、桌面端桥接、核心逻辑与版本对比）
npx tsx --test src/utils/bilingual.test.ts src/utils/competitiveness.test.ts src/utils/desktopBridge.test.ts src/utils/resumeLogic.test.ts src/utils/versionDiff.test.ts
```

---

## 构建疑难解答

本章节记录 GitHub Actions 自动打包与本地构建过程中的常见报错及排查方案：

### 1. GitHub Actions Windows 打包报 `error: Command failed (1): bun build --compile ...`
- **常见现象**：在 `windows-latest` 上运行 `Build Windows x64 Portable .exe` 步骤时失败，日志中出现类似 `--windows-title=简历工坊 · Resume Craft` 伴随 `Command failed (1)`。
- **根因**：Windows 下若 `spawnSync` 开启 `shell: true` 且向 `bun build --compile` 传递包含**空格或非 ASCII 中文字符**的 `--windows-title` / `--windows-description` 参数，`cmd.exe` 会将参数拆分成非法文件名，或导致 PE 资源段写入失败。
- **排查与解决**：
  1. 确保仓库同步了最新版的 `scripts/build-exe.ts`：脚本已改用 `process.execPath` 直接调用 Bun（`shell: false`）、仅使用 ASCII 安全的 `--windows-title=ResumeCraft` 与 `--windows-description=Resume Craft Portable Edition`，并在 PE 元数据/图标写入失败时自动回退至无元数据参数重试编译。
  2. 如果你在自定义分支修改了 `--windows-icon` 路径，确认 `scripts/assets/app-icon.ico` 为合法的 `.ico` 文件且路径不含异常转义。

### 2. GitHub Actions 日志出现 `Node.js 20 is deprecated` 警告
- **常见现象**：Annotations 面板提示 `The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4`。
- **根因**：GitHub Actions Runner 已逐步淘汰 Node.js 20 运行时，旧版 Action（`@v4`）会触发弃用告警。
- **排查与解决**：确保 `.github/workflows/build-exe.yml` 使用最新版官方 Action（`actions/checkout@v5`、`actions/setup-node@v6`、`oven-sh/setup-bun@v2`）。本仓库主分支已完成升级。

### 3. 推送 `v*` 标签自动发布 Release 时报 `403 Resource not accessible by integration`
- **常见现象**：`.exe` 打包和 Artifact 上传均成功，但最后一步 `Publish to GitHub Release (on v* tag)` 报错 `403`。
- **根因**：仓库的 `GITHUB_TOKEN` 默认权限为只读，无法创建 Release 或上传附件。
- **排查与解决**：
  1. 确认 `.github/workflows/build-exe.yml` 顶部包含 `permissions: contents: write`。
  2. 打开 GitHub 仓库的 **Settings → Actions → General → Workflow permissions**，选择 **Read and write permissions** 并保存，随后重新运行该工作流。

### 4. `Install dependencies` 步骤因 lockfile 冲突失败
- **常见现象**：修改 `package.json` 增删依赖后推送，CI 执行 `bun install --frozen-lockfile` 提示锁文件不一致。
- **排查与解决**：
  - 工作流已配置 `bun install --frozen-lockfile || bun install` 自动兜底。
  - 建议本地修改 `package.json` 后执行一次 `npm install` 或 `bun install` 同步锁文件再提交，避免 CI 依赖版本漂移。

### 5. 本地打包中断后 `npm run lint` 变慢或报 `scripts/embeddedAssets.ts` 相关错误
- **常见现象**：执行 `bun run build:exe` 中途强制 `Ctrl+C` 终止，导致临时生成的内嵌前端资源留在 `scripts/embeddedAssets.ts` 中。
- **排查与解决**：`build-exe.ts` 的 `finally` 块正常会自动还原占位文件；若异常强杀导致残留，直接执行：
  ```bash
  git checkout -- scripts/embeddedAssets.ts
  ```
  还原空白类型占位文件即可恢复正常，且**切勿**将包含 base64 资源内容的 `embeddedAssets.ts` 提交至 Git。

### 6. 双击 `ResumeCraft-win-x64.exe` 被 Windows SmartScreen 拦截或无法修改端口
- **SmartScreen 拦截**：个人开源构建的 `.exe` 未附带昂贵的商业 EV 代码签名证书，首次运行可能弹出「Windows 已保护你的电脑」。请先对照同页下载的 `SHA256SUMS.txt` 在 PowerShell 中校验哈希：
  ```powershell
  Get-FileHash .\ResumeCraft-win-x64.exe -Algorithm SHA256
  ```
  确认哈希一致后，点击弹窗中的 **「更多信息」→「仍要运行」** 即可。
- **端口冲突 / 多实例控制**：程序默认从 `3000` 端口起自动检测已有实例并顺延避让冲突；如需指定端口、禁止自动打开浏览器或允许同时运行多个实例，可在终端启动时设置环境变量：
  ```powershell
  $env:PORT="3800"; .\ResumeCraft-win-x64.exe
  # 如需允许同时启动多个独立进程：
  $env:RESUME_CRAFT_ALLOW_MULTI="1"; .\ResumeCraft-win-x64.exe
  ```

### 7. Electron 桌面版打包常见说明（防白屏、依赖隔离与无签名构建）
- **为什么 `package.json` 中没有 `electron` 和 `electron-builder`？**：这是刻意设计，避免在在线预览沙盒或常规 Web 开发执行 `npm install` 时下载数百 MB 的 Electron 二进制导致超时卡死。`.github/workflows/build-desktop.yml` 会在 `windows-latest` 构建机上按需临时安装它们并完成打包。
- **Electron 加载 `dist/index.html` 白屏排查**：确认 `vite.config.ts` 已配置 `base: './'`，且 `dist/index.html` 中引用的脚本与样式表路径均为 `./assets/...`（而非 `/assets/...`）。
- **Windows Runner 报 `winCodeSign` 符号链接解压错误**：`electron-builder.yml` 已显式配置 `win.signAndEditExecutable: false`，跳过需要 Windows 开发者模式权限的签名工具解压步骤；同时工作流会自动检测 `package-lock.json` 是否存在，无锁文件时平滑回退至 `npm install`。

---

## 目录结构

```text
.
├── server.ts                              # 开发与生产 Web 入口（挂载 Express 与 Vite）
├── serverApp.ts                           # Express API 路由（/api/health、/api/ai/*、便携版 /api/local-store）
├── index.html                             # 应用入口与离线安全异步字体加载配置
├── vite.config.ts                         # Vite 构建配置（含 base: './' 桌面端兼容与智能分包）
├── electron-builder.yml                   # Electron Windows 便携单文件（portable .exe）打包配置
├── .env.example                           # 自托管环境变量配置模板
├── .github/workflows/
│   ├── build-desktop.yml                  # GitHub Actions Electron 无黑框便携版自动打包与发版流水线
│   └── build-exe.yml                      # GitHub Actions Bun 单文件便携版与 SHA256 发版流水线
├── electron/
│   ├── main.cjs                           # Electron 主进程（独立窗口、外链拦截、IPC 落盘与 printToPDF）
│   ├── preload.cjs                        # contextBridge 安全桥接脚本（暴露 window.electronAPI）
│   └── portableStore.cjs                  # 便携数据目录解析、原子读写 resumes-data.json 与 PDF 文件名清理
├── scripts/
│   ├── build-exe.ts                       # Bun 单文件便携包构建脚本（内嵌 dist/ 与图标）
│   ├── exe-entry.ts                       # Bun 便携版入口（单实例守卫、本地 JSON 持久化、自动开浏览器）
│   ├── embeddedAssets.ts                  # 打包期临时内嵌前端资源的干净类型占位文件
│   └── assets/app-icon.ico                # Windows 便携版多分辨率品牌图标
└── src/
    ├── App.tsx                            # 主应用状态管理、双端持久化、定时历史栈清理（50 步）、快捷键与懒加载
    ├── index.css                          # 全局样式、A4 简历排版、多页防断行与黑白打印省墨样式
    ├── types/resume.ts                    # 简历文档、排版、体检与 AI 类型定义
    ├── data/
    │   ├── defaultResumes.ts              # 初始示例简历
    │   ├── templateLibrary.ts             # 12 大行业模板库（独立分包按需加载）
    │   ├── themes.ts                      # 8 大版式与 10 套主题色定义
    │   └── writingLibrary.ts              # 6 大行业写作参考词库
    ├── utils/
    │   ├── resumeLogic.ts                 # 简历/LinkedIn 解析、本地审计、PDF 预检、历史裁剪、导出与配置校验
    │   ├── desktopBridge.ts               # Electron / Web 双端存储与 PDF 导出无感适配层
    │   ├── competitiveness.ts             # 四维竞争力雷达评分引擎
    │   ├── versionDiff.ts                 # 多版本内容与样式差异比对引擎
    │   ├── bilingual.ts                   # 中英双语识别、翻译结构映射与回退
    │   └── *.test.ts                      # 核心纯函数单元测试套件（54 项）
    └── components/
        ├── TopBar.tsx                     # 顶部导航、版本管理、模式切换与多格式导出
        ├── LeftWorkbench.tsx              # 左侧 5 模式工作台容器（次级页签懒加载）
        ├── LeftWorkbenchVersionBar.tsx    # 版本切换、克隆衍生与中英双语切换条
        ├── ContentEditor.tsx              # 简历内容表单与 STAR 扩充入口
        ├── DesignPanel.tsx                # 版式、主题、字号/字重/行高/边距调节
        ├── AuditPanel.tsx                 # 本地体检、JD 扫描与 AI 体检面板
        ├── HelperPanel.tsx                # 跨岗重构与投递助手面板
        ├── VersionComparePanel.tsx        # 版本差异对比面板
        ├── ResumeCanvas.tsx               # 右侧实时 A4 简历画布、分页参考线与底部工具栏
        ├── CompetitivenessRadarPanel.tsx  # 右侧四维竞争力雷达图面板
        ├── SettingsModal.tsx              # 应用设置弹窗（BYOK AI 接口配置与本地隐私/落盘状态）
        ├── LinkedInImportModal.tsx        # LinkedIn 档案一键导入弹窗（离线去噪 + 可选 AI 精准解析）
        └── *Modal.tsx                     # 模板广场、PDF 导出预检、纯文本导入与新手引导弹窗
```

---

## 开源许可与防倒卖声明

本项目采用 **[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)** 开源协议，并支持**开源 + 商业双许可模式**：

- **个人学习、自用与开源贡献**：完全免费，欢迎 Star、Fork、提 Issue 与 PR。
- **强传染与网络服务开源义务（AGPL-3.0 核心条款）**：任何基于本项目代码的修改、二次分发或**部署为在线网络服务**（包含收费网站、SaaS、小程序、付费代部署等），**必须保留原作者版权声明与完整协议，并向所有通过网络交互的用户免费提供对应版本的完整修改后源代码**。
- **严禁未经授权的闭源倒卖**：禁止删除版权信息或在不履行 AGPL-3.0 开源义务的前提下，将本项目重新打包并在闲鱼、淘宝、知识星球、微信群等渠道进行源码倒卖或换皮闭源收费。
- **商业授权**：如需闭源商用、去除开源传染义务或进行企业私有化定制，请联系作者获取书面商业授权。

完整协议正文请参阅根目录下的 [LICENSE](./LICENSE) 文件。
