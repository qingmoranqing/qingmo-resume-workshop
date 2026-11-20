# 简历工坊（Resume Craft）

> 全行业多风格智能简历编辑器 · 左侧工作台编辑，右侧实时 A4 所见即所得预览，支持零配置离线使用与接入自有 AI 接口（BYOK / 本地 Ollama，本项目不内置大模型）协作。

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

---

## 核心特性

### 1. 专业 A4 排版与精细化视觉控制
- **8 大 A4 统一版式**：单栏现代、居中经典、工程时间轴、卡片网格、双栏（左/右栏切换）、杂志分栏、顶部深色横幅分栏，切换样式不丢失正文内容。
- **10 套主题色 + 自定义主色**：支持自由拾色并自动推导柔和底色与边框体系；提供 4 种模块标题装饰、3 种眉首样式、3 种字体气质（现代黑体 / 人文衬线题 / 书卷全衬线）与 4 种量化亮点条样式。
- **实时排版微调**：在「外观排版」中通过滑块实时调节正文字号（`--r-fs`）、整体字重（`--r-fw-base`，`300–700`）、行高与纵向间距（`--r-lh`，`1.20–2.00`）以及页面边距（`--r-pad`）。
- **智能压一页 & 黑白打印省墨保护**：支持自动缩放压入 1 页 A4、一键黑白预览、隐私信息脱敏（手机号/邮箱打码），打印时自动去除重色块背景，兼顾屏幕质感与黑白激光打印清晰度。

### 2. 12 大行业模板库与高效编辑工作流
- **行业模板广场**：内置自动化/PLC、游戏策划、互联网研发与数据、销售外贸、财税金融、文科教培、行政法务、设计新媒体、医疗护理、建筑供应链、应届通用等 12 大行业模板，支持按关键词检索与「仅套用版式 / 新建简历」。
- **双向联动编辑**：点击右侧 A4 简历画布任意区域直接定位至左侧对应编辑模块；支持自由拖拽/调整模块顺序、显隐控制、自定义扩展模块（标签 / 要点 / 标题段落 / STAR 案例 / 纯文本）以及撤销/重做历史栈。
- **多版本管理体系**：
  - **版本克隆并衍生**：基于当前简历一键生成「针对性优化版」，自动记录原版本关联职位与派生谱系，便于多岗位投递对比。
  - **版本对比（Diff 视图）**：选择任意两份简历版本，按模块高亮展示文字增删、字数变化、量化指标数量对比与样式差异。
  - **中英双语切换**：自动识别简历关键内容，调用 AI 进行地道英文专业术语润色翻译，并完整保留原中文版，支持随时一键互切、同步重译与双语对比。

### 3. 简历体检、竞争力评估与 AI 深度协作
- **右侧「简历竞争力雷达图」**：实时解析当前简历，从**行业契合度、资历深度、项目丰富度、描述专业度**四个维度进行量化打分，并给出优先提升项与一键跳转优化。
- **本地离线简历体检 & 量化增强**：无需联网即可检测必填项缺失、内容过短、弱动词开头、缺乏百分比/数字/金额的经历描述，并提供上下文增强建议与一键应用。
- **双引擎 JD 关键词扫描与语义相关性打分**：
  - **本地离线引擎**：内置正则预处理清洗（乱码/HTML/全角符号）、同义词库映射、加权模糊匹配、原文高亮，以及交互式 `[×]` 删除误提词与 `+` 手动补充词条。
  - **LLM 增强引擎**：支持调用自有大模型或零配置「复制 Prompt / 粘贴 JSON」对 JD 硬性要求进行结构化分类提取（忽略软性套话），并基于简历真实工作/项目经历执行 **0–100 语义相关性打分**（附带经历佐证与补强建议）。
- **工作经历 STAR 扩充**：根据填写的公司与岗位职责，一键生成 3 条符合 STAR 原则的补充经历建议并支持逐条插入。
- **PDF 导出前置体检**：导出 PDF 前自动检查必填项、内容饱满度、示例占位符残留与重复条目，给出直观 UI 引导后再导出。
- **多格式导出与导入**：支持 PDF（原生打印高保真导出）、Word（`.doc` HTML）、Markdown、纯文本、JSON 备份导入，以及原始纯文本简历粘贴解析。

### 4. 零配置离线优先 + 接入自有 AI 接口（BYOK，不含内置模型）
- **开箱即用（不内置大模型）**：本项目本身**不内置任何大模型权重或官方免费 API 额度**。无需配置任何 API Key 即可完整使用全部排版、模板、本地体检、竞争力雷达、版本对比、离线 JD 扫描、多格式导出与「复制 Prompt / 粘贴 JSON」零配置外部 AI 协作功能。
- **接入自有 AI 接口（BYOK）**：如需在站内一键直连 AI，可在浏览器「设置」中填入你自己的接口与 Key，或通过服务端 `.env` 配置：
  - **OpenAI 兼容协议**：支持快捷填入 DeepSeek、Kimi、硅基流动、通义千问（兼容模式）、OpenAI、OneAPI / NewAPI 中转站、**本地 Ollama（免 Key）** 等常用地址模板（仅自动填入 Base URL 与默认模型名，不含 API Key）。
  - **Anthropic Claude**：支持官方或兼容中转接口。
  - 内置 URL 格式、API Key 格式与 Model ID 校验，配置失败时提示具体原因（网络不可达、鉴权失败等）。

> **网络与安全声明**：请确保你的本地网络环境能够访问该模型接口。如果选择中转站，请自行甄别安全性。本项目前端配置的 API Key 仅保存在本机浏览器 `localStorage` 中，不上传至任何第三方统计服务器。

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Lucide React
- **服务端**：Express + `tsx`（负责静态资源与 AI 代理转发接口 `/api/ai/*`）
- **测试**：Node.js 原生测试运行器（`node:test` + `tsx`）
- **数据持久化**：浏览器 `localStorage` 本地存储，默认不上传用户隐私简历至第三方数据库

---

## 快速开始

### 环境要求
- Node.js `>= 20`（或 Bun）

### 1. 安装依赖

```bash
npm install
# 或使用 bun：bun install
```

### 2. 配置环境变量（可选）

如果仅本地离线使用或在前端「设置」弹窗中填写自己的 API Key，可跳过此步。  
若需自托管配置默认 AI 服务，请复制示例文件并按需取消注释：

```bash
cp .env.example .env
```

`.env` 支持以下配置项：

```env
PORT="3000"

# 方案一：OpenAI 兼容接口（DeepSeek / Kimi / 通义 / Ollama / 中转站）
AI_BASE_URL="https://api.deepseek.com/v1"
AI_API_KEY="sk-your-key"
AI_MODEL="deepseek-chat"

# 或本地 Ollama（无需 API Key）
# AI_BASE_URL="http://localhost:11434/v1"
# AI_MODEL="qwen2.5:14b"

# 方案二：Anthropic Claude
# ANTHROPIC_BASE_URL="https://api.anthropic.com"
# ANTHROPIC_API_KEY="sk-ant-your-key"
# ANTHROPIC_MODEL="claude-sonnet-4-20250514"
```

> **注意**：请确保你的本地网络环境能够访问所填写的模型接口地址；如果选择第三方中转站，请自行甄别安全性与隐私政策。

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

### 5. 打包免安装单文件一体包（Windows `.exe`）

支持将前后端全部资源内嵌编译为**单个独立可执行文件**（无需安装 Node.js、无需额外 `dist/` 目录，双击自动启动本地服务并弹出默认浏览器，端口冲突自动避让）：

```bash
# 本地打包 Windows x64 单文件 .exe（需安装 Bun）
bun run build:exe
# 生成产物：release/ResumeCraft-win-x64.exe
```

- **直接使用**：双击 `ResumeCraft-win-x64.exe` 即可打开编辑；如需预设服务端 AI 接口，可在 `.exe` 同级目录放一份 `.env` 文件，或直接在右上角「设置」中填写。
- **GitHub 自动发版（推荐）**：仓库已内置 `.github/workflows/build-exe.yml`：
  - 在 GitHub 仓库的 **Actions → Build Standalone Executable (.exe) → Run workflow** 点击运行，约 1 分钟即可直接下载构建好的 `.exe`；
  - 或本地推送版本号标签（如 `git tag v1.0.0 && git push origin v1.0.0`），GitHub 将自动打包并发布到 **Releases** 供用户一键下载。

### 6. 类型检查与单元测试

```bash
# TypeScript 类型检查
npm run lint

# 运行全部核心逻辑单元测试
npx tsx --test src/utils/bilingual.test.ts src/utils/competitiveness.test.ts src/utils/resumeLogic.test.ts src/utils/versionDiff.test.ts
```

---

## 目录结构

```text
.
├── server.ts                          # Express 服务端与 /api/ai/* 代理接口
├── index.html                         # 应用入口与字体加载配置
├── .env.example                       # 自托管环境变量配置模板
└── src/
    ├── App.tsx                        # 主应用状态管理与快捷键/历史栈
    ├── index.css                      # 全局样式、A4 简历排版与打印省墨样式
    ├── types/resume.ts                # 简历文档、排版、体检与 AI 类型定义
    ├── data/
    │   ├── defaultResumes.ts          # 初始示例简历
    │   ├── templateLibrary.ts         # 12 大行业模板库
    │   ├── themes.ts                  # 8 大版式与 10 套主题色定义
    │   └── writingLibrary.ts          # 6 大行业写作参考词库
    ├── utils/
    │   ├── resumeLogic.ts             # 简历解析、本地审计、PDF 预检、导出与配置校验
    │   ├── competitiveness.ts         # 四维竞争力雷达评分引擎
    │   ├── versionDiff.ts             # 多版本内容与样式差异比对引擎
    │   ├── bilingual.ts               # 中英双语识别、翻译结构映射与回退
    │   └── *.test.ts                  # 核心纯函数单元测试套件
    └── components/
        ├── TopBar.tsx                 # 顶部导航、模式切换与多格式导出
        ├── LeftWorkbench.tsx          # 左侧 5 模式工作台容器
        ├── LeftWorkbenchVersionBar.tsx# 版本切换、克隆衍生与中英双语切换条
        ├── ContentEditor.tsx          # 简历内容表单与 STAR 扩充入口
        ├── DesignPanel.tsx            # 版式、主题、字号/字重/行高/边距调节
        ├── AuditPanel.tsx             # 本地体检、JD 扫描与 AI 体检面板
        ├── HelperPanel.tsx            # 跨岗重构与投递助手面板
        ├── VersionComparePanel.tsx    # 版本差异对比面板
        ├── ResumeCanvas.tsx           # 右侧实时 A4 简历画布与底部工具栏
        ├── CompetitivenessRadarPanel.tsx # 右侧四维竞争力雷达图面板
        └── *Modal.tsx                 # 模板广场、PDF 导出预检、导入与 AI 设置弹窗
```

---

## 开源许可与防倒卖声明

本项目采用 **[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)** 开源协议，并支持**开源 + 商业双许可模式**：

- **个人学习、自用与开源贡献**：完全免费，欢迎 Star、Fork、提 Issue 与 PR。
- **强传染与网络服务开源义务（AGPL-3.0 核心条款）**：任何基于本项目代码的修改、二次分发或**部署为在线网络服务**（包含收费网站、SaaS、小程序、付费代部署等），**必须保留原作者版权声明与完整协议，并向所有通过网络交互的用户免费提供对应版本的完整修改后源代码**。
- **严禁未经授权的闭源倒卖**：禁止删除版权信息或在不履行 AGPL-3.0 开源义务的前提下，将本项目重新打包并在闲鱼、淘宝、知识星球、微信群等渠道进行源码倒卖或换皮闭源收费。
- **商业授权**：如需闭源商用、去除开源传染义务或进行企业私有化定制，请联系作者获取书面商业授权。

完整协议正文请参阅根目录下的 [LICENSE](./LICENSE) 文件。
