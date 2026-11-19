import type {
  AuditPromptPreset,
  FontStyle,
  HeaderStyle,
  KpiStyle,
  SectionStyle,
  SidebarStyle,
  TemplateId,
  ThemeId,
  WritingIndustry,
} from '../types/resume';

export interface ThemePalette {
  name: string;
  primary: string;
  accent: string;
  soft: string;
  line: string;
  sideBg: string;
  sideInk: string;
  sideMuted: string;
  sideRule: string;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  'navy-blue': {
    name: '沉稳海军蓝',
    primary: '#0f2744',
    accent: '#2563eb',
    soft: '#eff6ff',
    line: '#dbeafe',
    sideBg: '#0f2744',
    sideInk: '#ffffff',
    sideMuted: '#cbd5e1',
    sideRule: 'rgba(255,255,255,0.16)',
  },
  'steel-blue': {
    name: '工业钢蓝',
    primary: '#1e3a5f',
    accent: '#0284c7',
    soft: '#f0f9ff',
    line: '#bae6fd',
    sideBg: '#162c46',
    sideInk: '#ffffff',
    sideMuted: '#cbd5e1',
    sideRule: 'rgba(255,255,255,0.16)',
  },
  'teal-orange': {
    name: '青墨暖琥珀',
    primary: '#115e59',
    accent: '#c2410c',
    soft: '#fff7ed',
    line: '#fed7aa',
    sideBg: '#134e4a',
    sideInk: '#ffffff',
    sideMuted: '#ccfbf1',
    sideRule: 'rgba(255,255,255,0.16)',
  },
  'forest-green': {
    name: '医学松林绿',
    primary: '#14532d',
    accent: '#0f766e',
    soft: '#f0fdf4',
    line: '#bbf7d0',
    sideBg: '#14532d',
    sideInk: '#ffffff',
    sideMuted: '#dcfce7',
    sideRule: 'rgba(255,255,255,0.16)',
  },
  'ocean-cyan': {
    name: '科技深海青',
    primary: '#164e63',
    accent: '#0891b2',
    soft: '#ecfeff',
    line: '#a5f3fc',
    sideBg: '#133e50',
    sideInk: '#ffffff',
    sideMuted: '#cffafe',
    sideRule: 'rgba(255,255,255,0.16)',
  },
  'warm-amber': {
    name: '典雅棕陶金',
    primary: '#451a03',
    accent: '#b45309',
    soft: '#fffbeb',
    line: '#fde68a',
    sideBg: '#451a03',
    sideInk: '#ffffff',
    sideMuted: '#fef3c7',
    sideRule: 'rgba(255,255,255,0.16)',
  },
  charcoal: {
    name: '极简石墨翠',
    primary: '#1f2937',
    accent: '#059669',
    soft: '#ecfdf5',
    line: '#a7f3d0',
    sideBg: '#1f2937',
    sideInk: '#ffffff',
    sideMuted: '#d1d5db',
    sideRule: 'rgba(255,255,255,0.16)',
  },
  mono: {
    name: '纯黑白商务',
    primary: '#111827',
    accent: '#374151',
    soft: '#f8fafc',
    line: '#e2e8f0',
    sideBg: '#111827',
    sideInk: '#ffffff',
    sideMuted: '#d1d5db',
    sideRule: 'rgba(255,255,255,0.18)',
  },
  rose: {
    name: '典雅人文红',
    primary: '#7f1d1d',
    accent: '#be123c',
    soft: '#fff1f2',
    line: '#fecdd3',
    sideBg: '#6b1925',
    sideInk: '#ffffff',
    sideMuted: '#fecdd3',
    sideRule: 'rgba(255,255,255,0.18)',
  },
  purple: {
    name: '深邃紫藤',
    primary: '#3b0764',
    accent: '#7c3aed',
    soft: '#f5f3ff',
    line: '#ddd6fe',
    sideBg: '#2e1065',
    sideInk: '#ffffff',
    sideMuted: '#ddd6fe',
    sideRule: 'rgba(255,255,255,0.18)',
  },
};

export interface TemplateOption {
  id: TemplateId;
  name: string;
  desc: string;
  bestFor: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'single-column',
    name: '经典单栏',
    desc: '左对齐眉首 · 通栏流式阅读 · ATS 机筛最稳',
    bestFor: '研发 / 数据 / 运营 / 通用全行业',
  },
  {
    id: 'centered-classic',
    name: '学术政务居中',
    desc: '居中对称眉首 · 经典双细线 · 庄重严谨气质',
    bestFor: '财务审计 / 法务 / 体制内 / 硕博学术',
  },
  {
    id: 'timeline',
    name: '工程时间轴',
    desc: '左侧时间节点竖轴 · 项目阶段清晰可溯',
    bestFor: '自动化 / 机械硬件 / 建筑机电 / 项目管理',
  },
  {
    id: 'card-grid',
    name: '现代卡片流',
    desc: '轻色卡片分区 + 双列技能网格 · 层次分明',
    bestFor: '供应链 / 采购 / 产品经理 / 电商运营',
  },
  {
    id: 'two-column',
    name: '左栏右主双栏',
    desc: '左侧档案技能栏 + 右侧高密度经历主区',
    bestFor: '品牌设计 / 医疗护理 / 技能与证书丰富者',
  },
  {
    id: 'two-column-reverse',
    name: '左主右栏反转',
    desc: '左侧首屏先亮业绩与经历 · 右侧辅助档案',
    bestFor: 'B2B 销售 / 外贸商务 / 市场拓展',
  },
  {
    id: 'magazine',
    name: '杂志编辑双列',
    desc: '通栏杂志眉首 + 下方 64/36 黄金不对称双列',
    bestFor: '文科教培 / 编辑出版 / 公关传媒',
  },
  {
    id: 'top-banner-split',
    name: '视觉横幅双栏',
    desc: '顶部全宽主题横幅 + 下方左右双栏高质感布局',
    bestFor: '游戏策划 / 美术设计 / 新媒体 / 创意作品集',
  },
];

export const BASIC_EXTRA_PRESETS = [
  { label: '学历', placeholder: '如：本科 · 自动化' },
  { label: '政治面貌', placeholder: '如：中共党员' },
  { label: '籍贯', placeholder: '如：江苏苏州' },
  { label: '工作年限', placeholder: '如：3 年相关经验' },
  { label: '到岗状态', placeholder: '如：随时可到岗' },
  { label: '作品集 / 主页', placeholder: '如：github.com/name 或作品链接' },
  { label: '执业/技能证书', placeholder: '如：注册电气 / CPA / 教资' },
];

export interface VisualStylePreset {
  id: string;
  name: string;
  desc: string;
  bestFor: string;
  apply: {
    fontStyle: FontStyle;
    headerStyle: HeaderStyle;
    sidebarStyle: SidebarStyle;
    kpiStyle: KpiStyle;
    sectionStyle: SectionStyle;
    printSafe: boolean;
  };
}

export const VISUAL_STYLE_PRESETS: VisualStylePreset[] = [
  {
    id: 'minimal',
    name: '极简政务',
    desc: '纯白克制 · 细线分隔 · 黑白直打零损耗',
    bestFor: '体制内 / 财务法务 / 金融 / 学术',
    apply: {
      fontStyle: 'sans',
      headerStyle: 'clean',
      sidebarStyle: 'light',
      kpiStyle: 'divider',
      sectionStyle: 'underline',
      printSafe: true,
    },
  },
  {
    id: 'refined',
    name: '现代精致',
    desc: '柔和色块眉首 · 质感微卡 · 现代商业层次',
    bestFor: '互联网 / 工程制造 / 供应链 / 通用',
    apply: {
      fontStyle: 'sans',
      headerStyle: 'tinted',
      sidebarStyle: 'light',
      kpiStyle: 'accent',
      sectionStyle: 'bar',
      printSafe: true,
    },
  },
  {
    id: 'editorial',
    name: '人文书卷',
    desc: '衬线中文标题 · 舒展留白 · 杂志编辑气质',
    bestFor: '文科教培 / 编辑出版 / 公关传媒',
    apply: {
      fontStyle: 'serif',
      headerStyle: 'tinted',
      sidebarStyle: 'light',
      kpiStyle: 'divider',
      sectionStyle: 'minimal',
      printSafe: true,
    },
  },
  {
    id: 'expressive',
    name: '视觉先锋',
    desc: '深色横幅/侧栏 · 色块标题 · 电子投递强辨识',
    bestFor: '游戏行业 / 品牌设计 / 新媒体 / 创意',
    apply: {
      fontStyle: 'sans',
      headerStyle: 'banner',
      sidebarStyle: 'dark',
      kpiStyle: 'accent',
      sectionStyle: 'pill',
      printSafe: true,
    },
  },
];

export const MODULE_PRESETS: Array<{
  id: string;
  title: string;
  kind: 'cases' | 'bullets' | 'titled' | 'tags' | 'text';
  hint: string;
}> = [
  { id: 'proj', title: '代表项目经历', kind: 'cases', hint: '背景-行动-成果结构' },
  { id: 'works', title: '代表作品与论文', kind: 'titled', hint: '游戏/设计/文科/科研适用' },
  { id: 'equipment', title: '核心设备与工程技术栈', kind: 'titled', hint: '自动化/机械/制造/医疗适用' },
  { id: 'campus', title: '校园与社团实践', kind: 'bullets', hint: '应届生/校招常用' },
  { id: 'awards', title: '荣誉奖项与专利', kind: 'bullets', hint: '专利/竞赛/奖学金' },
  { id: 'langs', title: '语言与综合素养', kind: 'tags', hint: '外语/普通话/软实力' },
];

export const INDUSTRY_WRITING_KITS: Record<
  WritingIndustry,
  {
    label: string;
    verbs: string[];
    skeletonLabel: string;
    skeletonEmpty: string;
    skeletonAppend: string;
    placeholder: string;
    kpiHint: string;
  }
> = {
  general: {
    label: '通用职场',
    verbs: ['主导', '负责', '协同', '优化', '落地'],
    skeletonLabel: '成果句式',
    skeletonEmpty: '**核心任务**：针对[业务背景]，通过 **关键方法/工具** 完成推进，实现[可验证结果]。',
    skeletonAppend: '，通过 **规范化流程** 有效提升了团队协作质量与交付稳定性。',
    placeholder: '简述核心职责、专业方法与实际成果（无需生造数字）',
    kpiHint: '选填：若岗位重结果，可补充 1-3 个代表性成果数字',
  },
  engineering: {
    label: '工科·自动化·制造',
    verbs: ['设计', '调试', '选型', '排查', '投产'],
    skeletonLabel: '工程句式',
    skeletonEmpty: '**工程任务**：负责[产线/设备系统]的 **PLC 编程与电气调试（型号/协议）**，保障产线稳定达产并解决[关键故障/良率问题]。',
    skeletonAppend: '，实现设备连续稳定运行，显著降低产线停机排查时间。',
    placeholder: '写清设备型号/协议标准、你的设计或调试动作、良率/节拍/交付结果',
    kpiHint: '选填：可填产线节拍、良率、调试项目数、降本金额等工程指标',
  },
  humanities: {
    label: '文科·教培·行政',
    verbs: ['撰写', '策划', '执教', '统筹', '审校'],
    skeletonLabel: '叙事骨架',
    skeletonEmpty: '**核心事项**：围绕[教学/公文/研究主题]，运用 **专业方法与文本功底** 完成交付，获得[具体反馈/奖项/采用情况]。',
    skeletonAppend: '，形成可复用教案/制度文本并获上级及师生高度认可。',
    placeholder: '突出专业功底、文本/教学质量、受众反馈或荣誉认可',
    kpiHint: '文科/教培/行政岗通常无需堆砌 KPI，可留空保持版面雅致',
  },
  creative: {
    label: '游戏·设计·传媒',
    verbs: ['操盘', '设计', '搭建', '打磨', '企划'],
    skeletonLabel: '作品句式',
    skeletonEmpty: '**核心设计**：针对[玩法模块/品牌主题]，独立完成 **核心机制/视觉方案与落地迭代**，玩家/用户反馈[具体口碑或留存表现]。',
    skeletonAppend: '，沉淀为团队可复用规范并在版本上线后获得良好反响。',
    placeholder: '描述核心玩法/视觉概念、落地产出物、上线版本表现或作品集链接',
    kpiHint: '选填：可填留存/下载/曝光量/完成项目数（也可留空突出作品本身）',
  },
  business: {
    label: '销售·外贸·数据',
    verbs: ['开拓', '签约', '增长', '重构', '突破'],
    skeletonLabel: 'STAR 量化',
    skeletonEmpty: '**核心业绩**：针对[区域/客户/漏斗痛点]，通过 **拜访策略/数据分析方法** 推动转化，实现 **回款/增长量化结果**。',
    skeletonAppend: '，推动核心营收/效率指标同比提升 **XX%**。',
    placeholder: '用 STAR 结构描述：动作 + 策略/工具 + 真实业绩/量化结果',
    kpiHint: '推荐填写 2-3 项可核实的业绩/转化/效率量化指标',
  },
  medical: {
    label: '医疗·护理·生物',
    verbs: ['负责', '执行', '配合', '随访', '撰写'],
    skeletonLabel: '临床句式',
    skeletonEmpty: '**临床/科研工作**：在[科室/项目]承担 **核心护理操作/实验方案执行与质控**，严守 GCP/院感规范，实现[零差错/患者满意度/论文产出]。',
    skeletonAppend: '，严格执行医疗安全规范并获科室与患者一致好评。',
    placeholder: '突出科室/实验方向、操作规范、质控零差错、病例/受试者规模或科研产出',
    kpiHint: '医疗/科研岗位可留空，或填临床例数、随访完成率等真实指标',
  },
};

export const BUILTIN_AUDIT_PROMPTS: AuditPromptPreset[] = [
  {
    id: 'hr-6sec',
    name: '资深 HR 6 秒初筛',
    tag: '全行业通用',
    summary: '模拟一线 HR 快速扫视，抓出第一屏定位模糊、重点失焦和致命硬伤。',
    prompt:
      '请你扮演拥有 10 年一线招聘经验的企业资深 HR，按照「前 6 秒扫视 + 30 秒复核」的标准严格审查这份简历：\n1. 第一屏（姓名、定位标语、求职意向、基础信息）能否在 3 秒内让人看懂候选人想做什么、核心优势是什么？\n2. 经历叙述是否出现流水账、职责罗列多于真实产出、或者时间线/岗位表述容易引起疑虑的地方？\n3. 结合候选人所处行业（注意区分工科制造/游戏/文科/医疗/销售/互联网等不同评价标准，不强行要求所有行业生造百分比），找出 4-6 个最影响面试邀约的具体问题，并给出改写示范。',
  },
  {
    id: 'engineering-tech',
    name: '工科 / 自动化 / 工程制造专审',
    tag: '工科硬核',
    summary: '专为自动化、电气、机械、嵌入式、建筑机电与研发岗位定制，聚焦技术栈深度与工程交付。',
    prompt:
      '请你扮演制造业/工程技术部门总工程师兼面试官，审查这份工科简历：\n1. 核心设备型号、PLC/协议/软件工具、标准规范是否写得足够具体（而非笼统写“熟悉自动化设备”）？\n2. 项目经历是否交代清楚了“系统架构/本人独立负责的调试或设计环节/解决的现场棘手问题/投产交付结果”？\n3. 给出 3-5 条更有工程含金量的具体修改示范。',
  },
  {
    id: 'humanities-editorial',
    name: '文科 / 教培 / 行政公文精修',
    tag: '人文专审',
    summary: '专为文科、教师、编辑、行政、法务与国企岗位定制，注重叙事质感、专业素养与得体措辞。',
    prompt:
      '请你扮演深耕教育、文化传媒、国企行政与法务领域的资深招聘评审官，审查这份简历：\n1. 语言表达是否得体、凝练、有专业质感（避免空洞形容词或生硬套用互联网黑话）？\n2. 能否清晰呈现候选人的专业底蕴、代表作品/教研/制度沉淀、沟通统筹能力与可信口碑？\n3. 给出 3-5 条更有说服力、符合该行业审美与用人习惯的句式润色建议。',
  },
  {
    id: 'star-impact',
    name: 'STAR 成果与含金量精修',
    tag: '经历提纯',
    summary: '逐条检视核心经历，消除“负责/协助”等弱动词，强化个人贡献与落地价值。',
    prompt:
      '请你扮演简历精修顾问，用 STAR 法则（情境-任务-行动-结果）逐段审查这份简历的工作与项目经历：\n1. 标出所有“只写工作动作、看不出个人贡献与落地结果”的弱表达句子；\n2. 指出哪些成果可以用更具体的事实、作品、规模或前后对比来增强说服力；\n3. 针对最关键的 3-5 条要点给出精炼、有力、控制在 58 字以内且带 **加粗重点** 的重写范例。',
  },
  {
    id: 'jd-match',
    name: '目标岗位 JD 深度对标',
    tag: '精准匹配',
    summary: '对照粘贴的 JD 找出关键词缺口、能力错位与经历排序问题（建议配合 JD 文本使用）。',
    prompt:
      '请你扮演用人部门业务负责人，将候选人简历与提供的目标岗位 JD（如未提供 JD，则结合简历中的求职意向岗位通用用人标准）做逐项对标：\n1. 列出 JD 高度看重但简历中表达偏弱、位置靠后或遗漏的核心关键词；\n2. 指出哪些已有真实经历其实是“高相关迁移能力”，但目前写法不够贴近目标岗位语言；\n3. 给出具体的模块排序调整建议与关键句改写方案，提升简历与岗位的精准匹配度。',
  },
];

export const DENSITY_PRESETS = [
  { id: 'compact', name: '紧凑塞一页', fs: 11.2, lh: 1.44, pad: 24 },
  { id: 'balanced', name: '精炼均衡', fs: 12.2, lh: 1.54, pad: 30 },
  { id: 'airy', name: '舒展宽松', fs: 13.0, lh: 1.64, pad: 36 },
] as const;

export const FIXED_MODULE_LABELS: Record<string, string> = {
  basic: '基本信息',
  intent: '求职意向',
  education: '教育背景',
  experience: '工作 / 实践经历',
  skills: '专业技能',
  certs: '资质证书',
  tags: '核心标签',
  evals: '自我评价',
};
