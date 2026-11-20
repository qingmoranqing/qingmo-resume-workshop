import { FIXED_MODULE_LABELS, THEMES, type ThemePalette } from '../data/themes';
import type { TemplateCatalogEntry } from '../data/templateLibrary';
import type {
  AiConfigValidationErrors,
  AiConfigValidationResult,
  AiProviderId,
  CaseItem,
  CustomAiConfig,
  CustomAiProtocol,
  CustomAiRequestPayload,
  CustomModule,
  CustomModuleKind,
  DeliveryHelper,
  ExperienceItem,
  ExperienceStarSuggestion,
  ExpKpi,
  HelperMemoGroup,
  IndustryCategory,
  JdKeywordTier,
  JdSemanticMatchReport,
  JdSemanticSkillScore,
  JdSemanticStatus,
  JdStructuredExtractResult,
  JdStructuredSkillItem,
  LocalAuditEnhancement,
  LocalCheckItem,
  LocalJdKeywordDetail,
  LocalJdMatchResult,
  PdfPreflightIssue,
  PdfPreflightReport,
  ResumeData,
  ResumeDoc,
  ResumeMeta,
  ResumeVersionLineage,
  SectionStyle,
  TailorProposal,
  TemplateId,
  ThemeId,
  TitledItem,
} from '../types/resume';

let idCounter = 1;

export function nid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function cloneResumeDoc(doc: ResumeDoc): ResumeDoc {
  return JSON.parse(JSON.stringify(doc)) as ResumeDoc;
}

const VALID_TEMPLATES: readonly TemplateId[] = [
  'single-column',
  'centered-classic',
  'timeline',
  'card-grid',
  'two-column',
  'two-column-reverse',
  'magazine',
  'top-banner-split',
];

const VALID_SECTION_STYLES: readonly SectionStyle[] = ['bar', 'underline', 'pill', 'minimal'];

export function isValidHexColor(hex?: string): hex is string {
  return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex.trim());
}

function mixHexWithWhite(hex: string, whiteRatio: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const nr = Math.round(r + (255 - r) * whiteRatio);
  const ng = Math.round(g + (255 - g) * whiteRatio);
  const nb = Math.round(b + (255 - b) * whiteRatio);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function darkenHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function resolvePalette(themeId: ThemeId, customColor?: string): ThemePalette {
  const base = THEMES[themeId] || THEMES['navy-blue'];
  if (!isValidHexColor(customColor)) {
    return base;
  }
  const hex = customColor.trim();
  const primary = darkenHex(hex, 0.72);
  return {
    name: '自定义主题色',
    primary,
    accent: hex,
    soft: mixHexWithWhite(hex, 0.92),
    line: mixHexWithWhite(hex, 0.72),
    sideBg: primary,
    sideInk: '#ffffff',
    sideMuted: mixHexWithWhite(hex, 0.78),
    sideRule: 'rgba(255,255,255,0.18)',
  };
}

export function emptyData(): ResumeData {
  return {
    basic: {
      name: '',
      headline: '',
      phone: '',
      email: '',
      location: '',
      age: '',
      photo: '',
      extras: [],
    },
    intent: {
      position: '',
      city: '',
      salary: '',
      availability: '',
    },
    education: [],
    experience: [],
    skills: [],
    certs: [],
    tags: [],
    evals: [],
    custom: [],
    helper: {
      keywords: [],
      greeting: '',
      redFlags: [],
      memos: [],
    },
  };
}

export function blankCase(): CaseItem {
  return { title: '', bg: '', action: '', result: '', evidence: '' };
}

export function blankItems(kind: CustomModuleKind): unknown[] {
  switch (kind) {
    case 'tags':
      return ['新能力标签'];
    case 'bullets':
      return ['**亮点标题**：补充具体行动与量化产出'];
    case 'titled':
      return [{ title: '项目 / 主题名称', body: '简述核心职责与可验证结果。' }];
    case 'cases':
      return [{ title: '代表案例标题', bg: '', action: '', result: '', evidence: '' }];
    case 'text':
      return ['输入一段补充说明内容。'];
  }
}

export const DEFAULT_BASE_FONT_WEIGHT = 400;
export const MIN_BASE_FONT_WEIGHT = 300;
export const MAX_BASE_FONT_WEIGHT = 700;

export function resolveBaseFontWeight(fw?: number): number {
  if (typeof fw !== 'number' || !Number.isFinite(fw)) {
    return DEFAULT_BASE_FONT_WEIGHT;
  }
  const rounded = Math.round(fw);
  if (rounded < MIN_BASE_FONT_WEIGHT) return MIN_BASE_FONT_WEIGHT;
  if (rounded > MAX_BASE_FONT_WEIGHT) return MAX_BASE_FONT_WEIGHT;
  return rounded;
}

export function formatFontWeightLabel(fw?: number): string {
  const weight = resolveBaseFontWeight(fw);
  if (weight <= 325) return '纤细';
  if (weight <= 375) return '轻盈';
  if (weight <= 425) return '标准';
  if (weight <= 475) return '适中';
  if (weight <= 525) return '稳重';
  if (weight <= 575) return '偏粗';
  if (weight <= 625) return '半粗';
  return '粗体';
}

export const DEFAULT_LINE_HEIGHT = 1.52;
export const MIN_LINE_HEIGHT = 1.2;
export const MAX_LINE_HEIGHT = 2.0;

export function resolveLineHeight(lh?: number): number {
  if (typeof lh !== 'number' || !Number.isFinite(lh)) {
    return DEFAULT_LINE_HEIGHT;
  }
  const clamped = Math.max(MIN_LINE_HEIGHT, Math.min(MAX_LINE_HEIGHT, lh));
  return Math.round(clamped * 100) / 100;
}

export function formatLineHeightLabel(lh?: number): string {
  const value = resolveLineHeight(lh);
  if (value <= 1.32) return '超紧凑';
  if (value <= 1.44) return '紧凑';
  if (value <= 1.58) return '标准';
  if (value <= 1.74) return '舒展';
  return '宽松';
}

export function normalizeMeta(meta?: Partial<ResumeMeta>): ResumeMeta {
  const defaultOrder = ['intent', 'experience', 'skills', 'education', 'certs', 'tags', 'evals'];
  const tpl = meta?.template;
  const validTpl: TemplateId =
    tpl && (VALID_TEMPLATES as readonly string[]).includes(tpl) ? tpl : 'single-column';
  const th = meta?.theme;
  const validTheme: ThemeId = th && th in THEMES ? th : 'navy-blue';

  const incomingOrder = Array.isArray(meta?.order) ? meta.order.filter(Boolean) : [];
  const mergedOrder = [...incomingOrder];
  for (const key of defaultOrder) {
    if (!mergedOrder.includes(key)) {
      mergedOrder.push(key);
    }
  }

  const sidebarStyle = meta?.sidebarStyle === 'dark' ? 'dark' : 'light';
  const kpiStyle =
    meta?.kpiStyle === 'card' || meta?.kpiStyle === 'inline' || meta?.kpiStyle === 'accent'
      ? meta.kpiStyle
      : 'divider';
  const fontStyle =
    meta?.fontStyle === 'serif' || meta?.fontStyle === 'classic' ? meta.fontStyle : 'sans';
  const headerStyle =
    meta?.headerStyle === 'tinted' || meta?.headerStyle === 'banner' ? meta.headerStyle : 'clean';
  const sectionStyle: SectionStyle =
    meta?.sectionStyle && (VALID_SECTION_STYLES as readonly string[]).includes(meta.sectionStyle)
      ? meta.sectionStyle
      : 'bar';

  return {
    template: validTpl,
    theme: validTheme,
    customColor: isValidHexColor(meta?.customColor) ? meta.customColor.trim() : undefined,
    fs: typeof meta?.fs === 'number' && meta.fs >= 9.5 && meta.fs <= 15 ? meta.fs : 12,
    fw:
      typeof meta?.fw === 'number' &&
      Number.isFinite(meta.fw) &&
      meta.fw >= MIN_BASE_FONT_WEIGHT &&
      meta.fw <= MAX_BASE_FONT_WEIGHT
        ? Math.round(meta.fw)
        : DEFAULT_BASE_FONT_WEIGHT,
    lh:
      typeof meta?.lh === 'number' &&
      Number.isFinite(meta.lh) &&
      meta.lh >= MIN_LINE_HEIGHT &&
      meta.lh <= MAX_LINE_HEIGHT
        ? Math.round(meta.lh * 100) / 100
        : DEFAULT_LINE_HEIGHT,
    pad: typeof meta?.pad === 'number' && meta.pad >= 16 && meta.pad <= 48 ? meta.pad : 30,
    autofit: meta?.autofit !== false,
    showPhotoSlot: Boolean(meta?.showPhotoSlot),
    sidebarStyle,
    kpiStyle,
    fontStyle,
    headerStyle,
    sectionStyle,
    printSafe: meta?.printSafe !== false,
    order: mergedOrder,
    hidden: meta?.hidden && typeof meta.hidden === 'object' ? { ...meta.hidden } : {},
    titles: meta?.titles && typeof meta.titles === 'object' ? { ...meta.titles } : {},
  };
}

export function normalizeData(data?: Partial<ResumeData>): ResumeData {
  const base = emptyData();
  if (!data) return base;
  return {
    basic: {
      ...base.basic,
      ...(data.basic ?? {}),
      extras: Array.isArray(data.basic?.extras)
        ? data.basic.extras.map((ex, i) => ({ ...ex, id: ex.id || `ex-${i}` }))
        : [],
    },
    intent: {
      ...base.intent,
      ...(data.intent ?? {}),
    },
    education: Array.isArray(data.education)
      ? data.education.map((edu, i) => ({ ...edu, id: edu.id || `edu-${i}` }))
      : [],
    experience: Array.isArray(data.experience)
      ? data.experience.map((exp, i) => ({ ...exp, id: exp.id || `exp-${i}` }))
      : [],
    skills: Array.isArray(data.skills)
      ? data.skills.map((sk, i) => ({ ...sk, id: sk.id || `sk-${i}` }))
      : [],
    certs: Array.isArray(data.certs) ? data.certs : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    evals: Array.isArray(data.evals)
      ? data.evals.map((ev, i) => ({ ...ev, id: ev.id || `ev-${i}` }))
      : [],
    custom: Array.isArray(data.custom) ? data.custom : [],
    helper: {
      keywords: Array.isArray(data.helper?.keywords) ? data.helper.keywords : [],
      greeting: typeof data.helper?.greeting === 'string' ? data.helper.greeting : '',
      redFlags: Array.isArray(data.helper?.redFlags) ? data.helper.redFlags : [],
      memos: Array.isArray(data.helper?.memos)
        ? data.helper.memos.map((m, i) => ({
            id: m.id || `memo-${i}`,
            title: m.title || '未命名备忘',
            items: Array.isArray(m.items) ? m.items : [],
          }))
        : [],
    },
  };
}

export function defSecTitle(key: string): string {
  return FIXED_MODULE_LABELS[key] || key;
}

export function secTitle(meta: ResumeMeta, key: string): string {
  const customTitle = meta.titles?.[key]?.trim();
  return customTitle || defSecTitle(key);
}

export function isShown(meta: ResumeMeta, key: string): boolean {
  return !meta.hidden?.[key];
}

export function richSegs(text: string): Array<{ text: string; bold: boolean }> {
  if (!text) return [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return { text: p.slice(2, -2), bold: true };
    }
    return { text: p, bold: false };
  });
}

export function stripBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

export function parseRange(period: string): {
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  ongoing: boolean;
  parsed: boolean;
} {
  const clean = (period || '').trim();
  const m = clean.match(/^(\d{4})[./-](\d{1,2})\s*[-–~至到]+\s*(至今|现在|Present|(\d{4})[./-](\d{1,2}))$/i);
  if (!m) {
    return { startYear: '', startMonth: '', endYear: '', endMonth: '', ongoing: false, parsed: false };
  }
  const ongoing = !m[4];
  return {
    startYear: m[1],
    startMonth: m[2].padStart(2, '0'),
    endYear: m[4] || '',
    endMonth: m[5] ? m[5].padStart(2, '0') : '',
    ongoing,
    parsed: true,
  };
}

export function fmtRange(
  startYear: string,
  startMonth: string,
  endYear: string,
  endMonth: string,
  ongoing: boolean,
): string {
  if (!startYear || !startMonth) return '';
  const start = `${startYear}.${startMonth.padStart(2, '0')}`;
  if (ongoing) return `${start} - 至今`;
  if (!endYear || !endMonth) return start;
  return `${start} - ${endYear}.${endMonth.padStart(2, '0')}`;
}

export interface ContactMetaItem {
  key: string;
  label: string;
  value: string;
}

export function getContactList(data: ResumeData, lang: 'zh' | 'en' = 'zh'): ContactMetaItem[] {
  const list: ContactMetaItem[] = [];
  const labels =
    lang === 'en'
      ? { phone: 'Phone', email: 'Email', location: 'Location', age: 'Age' }
      : { phone: '电话', email: '邮箱', location: '现居', age: '年龄' };
  if (data.basic.phone.trim()) list.push({ key: 'phone', label: labels.phone, value: data.basic.phone.trim() });
  if (data.basic.email.trim()) list.push({ key: 'email', label: labels.email, value: data.basic.email.trim() });
  if (data.basic.location.trim()) list.push({ key: 'location', label: labels.location, value: data.basic.location.trim() });
  if (data.basic.age.trim()) list.push({ key: 'age', label: labels.age, value: data.basic.age.trim() });
  for (const ex of data.basic.extras || []) {
    if (ex.label.trim() && ex.value.trim()) {
      list.push({ key: ex.id, label: ex.label.trim(), value: ex.value.trim() });
    }
  }
  return list;
}

export function expKpisOf(kpis?: ExpKpi[]): ExpKpi[] {
  if (!Array.isArray(kpis)) return [];
  return kpis.filter((k) => k.num.trim() || k.label.trim());
}

export function customHasContent(cm: CustomModule): boolean {
  if (!cm || !Array.isArray(cm.items) || cm.items.length === 0) return false;
  if (cm.kind === 'tags' || cm.kind === 'bullets' || cm.kind === 'text') {
    return cm.items.some((x) => typeof x === 'string' && x.trim().length > 0);
  }
  if (cm.kind === 'titled') {
    return cm.items.some((x) => {
      const it = x as TitledItem;
      return Boolean(it?.title?.trim() || it?.body?.trim());
    });
  }
  if (cm.kind === 'cases') {
    return cm.items.some((x) => {
      const it = x as CaseItem;
      return Boolean(it?.title?.trim() || it?.bg?.trim() || it?.action?.trim() || it?.result?.trim());
    });
  }
  return false;
}

export function getAllHelperMemos(data: ResumeData): Array<HelperMemoGroup & { source: 'helper' | 'custom' }> {
  const result: Array<HelperMemoGroup & { source: 'helper' | 'custom' }> = [];
  for (const m of data.helper?.memos || []) {
    result.push({ ...m, source: 'helper' });
  }
  for (const cm of data.custom || []) {
    if (!cm.show && cm.kind === 'bullets') {
      result.push({
        id: cm.id,
        title: cm.title || '隐藏备忘录',
        items: (cm.items as string[]).filter((s) => typeof s === 'string' && s.trim()),
        source: 'custom',
      });
    }
  }
  return result;
}

export function searchTemplates(
  entries: TemplateCatalogEntry[],
  query: string,
  category: IndustryCategory,
): TemplateCatalogEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (category !== 'all' && entry.category !== category) return false;
    if (!q) return true;
    const haystack = [
      entry.title,
      entry.subtitle,
      entry.categoryLabel,
      entry.recommendedFor,
      entry.styleTag,
      ...entry.keywords,
      ...entry.highlights,
    ]
      .join(' ')
      .toLowerCase();
    return q.split(/\s+/).every((part) => haystack.includes(part));
  });
}

export function createCustomRoleDoc(
  roleName: string,
  explicitTemplate?: TemplateId,
  explicitTheme?: ThemeId,
): ResumeDoc {
  const cleanRole = roleName.trim() || '目标岗位';
  const lower = cleanRole.toLowerCase();

  let template: TemplateId = explicitTemplate || 'single-column';
  let theme: ThemeId = explicitTheme || 'navy-blue';
  let sectionStyle: SectionStyle = 'bar';
  let fontStyle: ResumeMeta['fontStyle'] = 'sans';
  let headerStyle: ResumeMeta['headerStyle'] = 'tinted';
  let skillHint = '列出与目标岗位直接相关的核心工具、专业方法或行业软件';

  if (!explicitTemplate) {
    if (/自动化|plc|电气|机械|硬件|嵌入式|工控|制造|建筑|机电|施工|bim/.test(lower)) {
      template = 'timeline';
      theme = explicitTheme || 'steel-blue';
      skillHint = '填写核心设备型号、PLC/CAD/仿真软件、通信协议或行业标准规范';
    } else if (/游戏|策划|美术|动画|创意|设计|ui|新媒体|编导|广告/.test(lower)) {
      template = 'top-banner-split';
      theme = explicitTheme || 'purple';
      sectionStyle = 'pill';
      headerStyle = 'banner';
      skillHint = '填写核心引擎/设计工具、玩法拆解能力、作品集链接与内容专长';
    } else if (/财务|会计|审计|税务|法务|律师|行政|党务|国企|金融|银行/.test(lower)) {
      template = 'centered-classic';
      theme = explicitTheme || 'mono';
      sectionStyle = 'underline';
      fontStyle = 'classic';
      headerStyle = 'clean';
      skillHint = '填写专业准则、执业资格证书、财务/办公系统及合规能力';
    } else if (/医疗|护理|护士|医生|医药|药学|生物|临床|cra|crc/.test(lower)) {
      template = 'two-column';
      theme = explicitTheme || 'forest-green';
      skillHint = '填写临床操作/实验技能、GCP/院感规范、执业资格证书';
    } else if (/销售|外贸|商务|bd|大客户|渠道|招商|客户成功/.test(lower)) {
      template = 'two-column-reverse';
      theme = explicitTheme || 'warm-amber';
      skillHint = '填写大客户开拓方法、CRM/外贸平台、外语及招投标谈判能力';
    } else if (/语文|教师|教研|编辑|出版|文科|中文|历史|新闻|文案/.test(lower)) {
      template = 'magazine';
      theme = explicitTheme || 'rose';
      sectionStyle = 'minimal';
      fontStyle = 'serif';
      skillHint = '填写教学教研、深度写作、审校排版及代表性学术/文化专长';
    } else if (/供应链|采购|pmc|物流|电商|产品经理/.test(lower)) {
      template = 'card-grid';
      theme = explicitTheme || 'teal-orange';
      skillHint = '填写 ERP/原型/数据分析工具与核心业务闭环能力';
    }
  }

  return {
    id: nid('resume'),
    name: `定制骨架 · ${cleanRole}`,
    meta: normalizeMeta({
      template,
      theme,
      fs: 12,
      lh: 1.52,
      pad: 28,
      autofit: true,
      showPhotoSlot: false,
      sidebarStyle: 'light',
      kpiStyle: 'accent',
      fontStyle,
      headerStyle,
      sectionStyle,
      printSafe: true,
      order: ['intent', 'experience', 'skills', 'education', 'certs', 'evals'],
      hidden: { tags: true },
      titles: {},
    }),
    data: {
      basic: {
        name: '你的姓名',
        headline: `${cleanRole} | 填写学历/年限背景 · 2 项最能证明胜任力的核心优势`,
        phone: '',
        email: '',
        location: '',
        age: '',
        photo: '',
        extras: [{ id: nid('ex'), label: '核心背景', value: `方向：${cleanRole}` }],
      },
      intent: {
        position: cleanRole,
        city: '',
        salary: '面议',
        availability: '随时可到岗',
      },
      education: [
        {
          id: nid('edu'),
          school: '毕业院校名称',
          major: '所学专业',
          degree: '本科 / 硕士',
          period: '2020.09 - 2024.06',
          desc: '补充与目标岗位相关的核心课程、奖项、毕设或科研经历。',
        },
      ],
      experience: [
        {
          id: nid('exp'),
          company: '填写公司 / 项目 / 实践单位名称',
          role: cleanRole,
          period: '2024.01 - 至今',
          subtitle: `概述你在「${cleanRole}」方向承担的主要职责与交付范围`,
          kpis: [],
          bullets: [
            `**核心交付**：围绕「${cleanRole}」关键工作场景，说明你使用的专业方法/工具及可验证结果。`,
            '**难点攻克**：描述一个你独立推进或协同解决的具体痛点，以及带来的真实改善。',
          ],
        },
      ],
      skills: [
        { id: nid('sk'), cat: `${cleanRole}核心技能`, items: skillHint },
        { id: 'sk-2', cat: '通用工具与协作', items: 'Office / 飞书 / 专业协作软件或外语能力' },
      ],
      certs: ['填写与岗位强相关的执业证书、技能等级或荣誉奖项'],
      tags: [cleanRole],
      evals: [
        { id: 'ev-1', title: '专业胜任力', body: `总结你在「${cleanRole}」领域最突出的实操优势与职业态度。` },
      ],
      custom: [],
      helper: {
        keywords: [cleanRole],
        greeting: `您好！我正在应聘「${cleanRole}」岗位，具备相关专业背景与项目实操经验，希望能与您进一步沟通！`,
        redFlags: ['面试前核实岗位真实日常工作内容、团队规模与成长通道'],
        memos: [
          {
            id: 'm-1',
            title: `${cleanRole} 面试准备清单`,
            items: ['提前准备 2 个最能证明岗位胜任力的真实项目复盘', '查阅目标公司主营业务并准备 2 个有深度的反问问题'],
          },
        ],
      },
    },
  };
}

const JD_STOPWORDS = new Set([
  '岗位职责', '任职要求', '职位描述', '工作内容', '职位要求', '岗位要求', '我们希望', '加分项',
  '优先考虑', '具备良好', '沟通能力', '沟通协调', '团队合作', '团队协作', '学习能力', '责任心',
  '抗压能力', '抗压性', '抗压', '沟通', '协作', '配合', '学习', '执行力', '自驱力', '大局观', '同理心', '吃苦耐劳', '积极主动',
  '本科及以上', '大专及以上', '硕士及以上', '统招本科', '相关专业', '工作经验', '相关经验',
  '年以上', '五险一金', '周末双休', '带薪年假', '弹性工作', '薪资面议', '福利待遇', '扁平管理',
  '商业嗅觉', '业务闭环', '底层逻辑', '核心抓手', '赋能业务', '颗粒度', '方法论', '结果导向',
  '负责', '参与', '完成', '熟悉', '掌握', '精通', '了解', '能够', '具有', '具备', '以及',
  '或者', '根据', '进行', '提供', '支持', '协助', '推动', '优化', '提升', '管理', '公司', '部门',
  '团队', '业务', '项目', '系统', '平台', '方案', '流程', '工作', '能力', '经验', '优先', '学历',
  '专业', '相关', '良好', '优秀', '熟练', '独立', '以上', '需求', '问题', '分析', '设计', '执行',
  '使用', '开发', '应用', '工具', '软件', '技术', '方向', '领域', '日常', '核心', '基础', '主要',
  '查询', '编写', '调优', '搭建', '绘图', '编程', '部署', '配置', '维护', '操作', '运用', '原理',
  '框架', '总线', '语言', '技能', '知识', '水平', '背景', '模块', '功能', '体系', '建设', '梳理',
  '落地', '推进', '统筹', '协同', '对接', '跟进', '输出', '沉淀', '复盘', '监测', '追踪', '处理',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'will', 'are', 'you', 'our', 'can',
  'use', 'using', 'strong', 'good', 'work', 'team', 'experience', 'skills', 'ability', 'preferred',
]);

export interface JdSynonymGroup {
  canonical: string;
  aliases: string[];
  /** Additional terms in a resume that satisfy this JD requirement (one-way entailment). */
  satisfiedBy?: string[];
}

export const JD_SYNONYM_GROUPS: JdSynonymGroup[] = [
  { canonical: 'Java', aliases: ['java', 'java语言', 'jdk', 'jvm', 'j2ee', 'javase'] },
  { canonical: 'Python', aliases: ['python', 'python3', 'py', 'python语言'] },
  { canonical: 'JavaScript', aliases: ['javascript', 'js', 'es6', 'es2015', 'ecmascript'] },
  { canonical: 'TypeScript', aliases: ['typescript', 'ts'] },
  { canonical: 'Go', aliases: ['go', 'golang', 'go语言'] },
  { canonical: 'C/C++', aliases: ['c/c++', 'c++', 'cpp', 'c语言'] },
  { canonical: 'C#', aliases: ['c#', 'csharp', '.net', 'dotnet'] },
  {
    canonical: 'SQL',
    aliases: ['sql', 'sql查询', 'sql编写', 'sql调优', '数据库查询'],
    satisfiedBy: ['mysql', 'postgresql', 'postgres', 'oracle', 'sql server', 'hive sql', 'spark sql', 'clickhouse', 'sqlite'],
  },
  { canonical: 'MySQL', aliases: ['mysql', 'mysql数据库', 'mariadb'] },
  { canonical: 'PostgreSQL', aliases: ['postgresql', 'postgres', 'pg', 'pgsql'] },
  { canonical: 'Redis', aliases: ['redis', 'redis缓存'] },
  { canonical: 'React', aliases: ['react', 'reactjs', 'react.js', 'react18', 'react19'] },
  { canonical: 'Vue', aliases: ['vue', 'vuejs', 'vue.js', 'vue2', 'vue3'] },
  { canonical: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { canonical: 'Spring Boot', aliases: ['spring boot', 'springboot', 'springcloud', 'spring cloud', 'spring全家桶'] },
  { canonical: 'Docker', aliases: ['docker', '容器化', '容器部署', '镜像构建'] },
  { canonical: 'Kubernetes', aliases: ['kubernetes', 'k8s', '容器编排'] },
  {
    canonical: '消息队列',
    aliases: ['消息队列', 'mq', '消息中间件'],
    satisfiedBy: ['kafka', 'rabbitmq', 'rocketmq'],
  },
  { canonical: 'Kafka', aliases: ['kafka', 'apache kafka'] },
  {
    canonical: 'CI/CD',
    aliases: ['ci/cd', 'cicd', '持续集成', '持续交付', '持续部署'],
    satisfiedBy: ['jenkins', 'github actions', 'gitlab ci', 'devops'],
  },
  { canonical: 'Git', aliases: ['git', 'github', 'gitlab', '版本控制'] },
  { canonical: 'Linux', aliases: ['linux', 'shell', 'bash', 'centos', 'ubuntu'] },
  { canonical: 'Power BI', aliases: ['power bi', 'powerbi', 'pbi'] },
  { canonical: 'Tableau', aliases: ['tableau', 'tableau看板'] },
  {
    canonical: 'BI 看板',
    aliases: ['bi看板', 'bi', '商业智能', '数据可视化', '可视化看板', '经营驾驶舱', '数据看板', '报表搭建'],
    satisfiedBy: ['tableau', 'power bi', 'powerbi', 'finebi', 'quickbi', 'superset', 'metabase', '飞书多维表格'],
  },
  {
    canonical: 'Excel',
    aliases: ['excel', 'powerquery', 'power query', '透视表', '数据透视表', 'vlookup', 'vba'],
  },
  {
    canonical: '数据分析',
    aliases: ['数据分析', '商业分析', '商业数据分析', '业务数据分析', 'ba', '数据挖掘', '增长归因', '业务归因', '漏斗分析', 'rfm'],
  },
  { canonical: 'A/B Test', aliases: ['a/b test', 'ab test', 'a/b测试', 'ab测试', 'ab实验', '对照实验', '显著性评估'] },
  { canonical: '机器学习', aliases: ['机器学习', 'ml', 'machine learning', '深度学习', 'dl', '算法建模'] },
  { canonical: '大模型 / LLM', aliases: ['大模型', 'llm', 'aigc', '大语言模型', 'prompt', 'rag', 'agent', '人工智能'] },
  {
    canonical: 'PLC',
    aliases: ['plc', '可编程逻辑控制器', '西门子plc', '三菱plc'],
    satisfiedBy: ['s7-1500', 's7-1200', 'fx5u', 'q系列'],
  },
  { canonical: 'TIA Portal', aliases: ['tia portal', '博途', '博图', '西门子博途'] },
  { canonical: 'EPLAN', aliases: ['eplan', '电气制图', '电气原理图'] },
  { canonical: 'PROFINET', aliases: ['profinet', '工业以太网'] },
  { canonical: 'EtherCAT', aliases: ['ethercat', '工业总线'] },
  { canonical: 'CAD', aliases: ['cad', 'autocad', 'solidworks', 'ug', 'proe', 'creo'] },
  { canonical: 'ERP', aliases: ['erp', 'sap', '用友', '金蝶', '金蝶云', '浪潮'] },
  { canonical: 'CPA', aliases: ['cpa', '注册会计师'] },
  { canonical: '英语能力', aliases: ['英语', '英语流利', '英文读写', 'cet-6', 'cet6', '英语六级', '六级', 'ielts', '雅思', 'toefl', '托福'] },
  { canonical: '项目管理', aliases: ['项目管理', 'pmp', '敏捷开发', 'scrum', 'jira'] },
  { canonical: '产品设计', aliases: ['产品设计', '原型设计', 'axure', 'figma', 'prd', '需求文档', '交互设计'] },
  { canonical: '用户增长', aliases: ['用户增长', '拉新', '留存', '复购', '用户分层', '私域运营'] },
  { canonical: '供应链', aliases: ['供应链', 'scm', 'pmc', '采购管理', '库存周转', '进销存', 'wms'] },
];

const PROTECTED_SLASH_TERMS: Array<[RegExp, string, string]> = [
  [/\bc\s*\/\s*c\+\+/gi, '__TOK_CCPP__', 'C/C++'],
  [/\btcp\s*\/\s*ip/gi, '__TOK_TCPIP__', 'TCP/IP'],
  [/\bci\s*\/\s*cd/gi, '__TOK_CICD__', 'CI/CD'],
  [/\bui\s*\/\s*ux/gi, '__TOK_UIUX__', 'UI/UX'],
  [/\ba\s*\/\s*b\b/gi, '__TOK_AB__', 'A/B'],
  [/\bi\s*\/\s*o\b/gi, '__TOK_IO__', 'I/O'],
  [/\bb2b\s*\/\s*b2c/gi, '__TOK_B2BC__', 'B2B/B2C'],
];

const PROFICIENCY_PREFIX_RE =
  /^(?:能够|可以|需要|要求|必须|至少|并且|以及|或者|具备|具有|拥有|掌握|精通|熟悉|熟练使用|熟练掌握|熟练运用|熟练操作|熟练编写|熟悉使用|熟悉掌握|擅长|了解|使用过|有较强的|有良好的|较强的|良好的|优秀的|扎实的|丰富的|独立的|独立|深度|深入|全面|基本|优先考虑|优先|相关|有)+\s*/;

const PROFICIENCY_SUFFIX_RE =
  /\s*(?:开发经验|使用经验|操作经验|实践经验|项目经验|工作经验|相关经验|实战经验|应用经验|编程经验|经验丰富|经验者优先|者优先|优先考虑|优先|加分项|加分|能力强|能力|技能|技术栈|技术|知识|背景|水平|编程|等工具|等技术|等软件|等框架|等相关工具|等)+$/;

const HR_FLUFF_RE =
  /(?:抗压|大局观|核心抓手|业务闭环|底层逻辑|赋能业务|颗粒度|责任心|自驱力|同理心|吃苦耐劳|积极主动|五险一金|周末双休|带薪年假|弹性工作|薪资面议|福利待遇|扁平管理|团队合作|团队协作|沟通协调|沟通能力|学习能力|执行力|商业嗅觉|结果导向|本科及以上|大专及以上|硕士及以上|统招本科)/;

const BONUS_CLAUSE_RE = /(?:优先|加分|了解即可|熟悉更好|更佳|bonus|plus|preferred|nice\s*to\s*have)/i;
const CORE_CLAUSE_RE =
  /(?:精通|必须|核心|主导|扎实的|熟练掌握|熟练使用|独立负责|硬性|必备|深入理解|must\s*have|required|proficient|expert)/i;

function compactToken(s: string): string {
  return s.toLowerCase().replace(/[\s._-]+/g, '');
}

const SYNONYM_LOOKUP = (() => {
  const map = new Map<string, JdSynonymGroup>();
  for (const group of JD_SYNONYM_GROUPS) {
    map.set(group.canonical.toLowerCase(), group);
    map.set(compactToken(group.canonical), group);
    for (const alias of group.aliases) {
      map.set(alias.toLowerCase(), group);
      map.set(compactToken(alias), group);
    }
  }
  return map;
})();

/**
 * Step 1: Regex preprocessing pipeline to clean mojibake, zero-width control chars,
 * HTML remnants, decorative emojis, full-width ASCII, and messy list formatting from pasted JDs.
 */
export function preprocessJdText(raw: string): { cleaned: string; noiseRemovedCount: number } {
  if (!raw) return { cleaned: '', noiseRemovedCount: 0 };
  let text = raw;
  let noiseRemovedCount = 0;

  const stripWithCount = (re: RegExp, replacement: string) => {
    text = text.replace(re, (m) => {
      if (m !== replacement) noiseRemovedCount += 1;
      return replacement;
    });
  };

  // 1. Decode common HTML entities and strip raw HTML tags (when pasted from job boards)
  stripWithCount(/&nbsp;/gi, ' ');
  stripWithCount(/&amp;/gi, '&');
  stripWithCount(/&lt;/gi, '<');
  stripWithCount(/&gt;/gi, '>');
  stripWithCount(/&quot;/gi, '"');
  stripWithCount(/<[^>]{1,120}>/g, ' ');

  // 2. Remove BOM, zero-width spaces, directional marks, replacement mojibake (U+FFFD), control chars, PUA icons
  stripWithCount(
    /[\uFEFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFFFD\uE000-\uF8FF\u2500-\u259F\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g,
    '',
  );

  // 3. Remove decorative emojis and dingbats while preserving punctuation
  stripWithCount(/[\u2600-\u27BF]|[\u{1F300}-\u{1FAFF}]/gu, ' ');

  // 4. Normalize full-width spaces and full-width ASCII characters (e.g. Ｊａｖａ -> Java, Ｃ＋＋ -> C++)
  text = text.replace(/[\u00A0\u3000]/g, () => {
    noiseRemovedCount += 1;
    return ' ';
  });
  text = text.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    noiseRemovedCount += 1;
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });

  // 5. Strip Markdown wrappers (**bold**, `code`, heading hashes)
  stripWithCount(/[*`~_]{2,}|`+/g, ' ');
  stripWithCount(/(^|\n)\s*#{1,6}\s+/g, '$1');

  // 6. Normalize noisy list prefixes & bullets into crisp newlines
  text = text.replace(/\r\n?/g, '\n');
  stripWithCount(/(?:^|\n)\s*(?:(?:\d{1,2}|[①-⑩]|[a-zA-Z])\s*[.、)）:：]|[•●▪◆◇➢➤★☆▶■□-]\s*)/g, '\n');
  stripWithCount(/[•●▪◆◇➢➤★☆▶■□]+/g, '\n');

  // 7. Split slash-joined independent tech skills (e.g. SQL/Python -> SQL, Python) while keeping idioms like C/C++, CI/CD, A/B
  for (const [re, placeholder] of PROTECTED_SLASH_TERMS) {
    text = text.replace(re, placeholder);
  }
  text = text.replace(/([A-Za-z0-9+#\u4e00-\u9fa5])\s*[/／\\|｜]\s*([A-Za-z0-9+#\u4e00-\u9fa5])/g, '$1, $2');
  for (const [, placeholder, restored] of PROTECTED_SLASH_TERMS) {
    text = text.replaceAll(placeholder, restored);
  }

  // 8. Collapse repeated punctuation & whitespace
  text = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleaned: text, noiseRemovedCount };
}

/**
 * Strip proficiency verbs/modifiers ("熟练使用 Java" -> "Java") and map through the synonym lexicon
 * so equivalent expressions collapse into one canonical keyword.
 */
export function normalizeJdKeyword(rawPhrase: string): {
  canonical: string;
  key: string;
  synonymGroup?: JdSynonymGroup;
} | null {
  let phrase = rawPhrase
    .trim()
    .replace(/^[./_,，。；;、：:（）()【】\[\]《》"'·\-—]+|[./_,，。；;、：:（）()【】\[\]《》"'·\-—]+$/g, '')
    .trim();

  if (!phrase) return null;
  if (JD_STOPWORDS.has(phrase) || JD_STOPWORDS.has(phrase.toLowerCase()) || HR_FLUFF_RE.test(phrase)) {
    return null;
  }

  // Strip proficiency modifiers repeatedly ("熟练使用 Java 开发经验" -> "Java")
  let prev = '';
  while (phrase && phrase !== prev) {
    prev = phrase;
    phrase = phrase.replace(PROFICIENCY_PREFIX_RE, '').trim();
    if (JD_STOPWORDS.has(phrase) || JD_STOPWORDS.has(phrase.toLowerCase())) return null;
    const strippedSuffix = phrase.replace(PROFICIENCY_SUFFIX_RE, '').trim();
    if (strippedSuffix.length >= 2) {
      phrase = strippedSuffix;
    }
    const strippedAsciiTrail = phrase
      .replace(/^([A-Za-z][A-Za-z0-9+#._/\s-]{1,22})\s*(?:开发|语言|框架|数据库)$/, '$1')
      .trim();
    if (strippedAsciiTrail.length >= 2) {
      phrase = strippedAsciiTrail;
    }
  }

  phrase = phrase.replace(/\s{2,}/g, ' ').trim();
  if (phrase.length < 2) {
    // Allow single-letter languages only when explicit like C# / R? Keep min length 2 unless in lexicon
    const exactSingle = SYNONYM_LOOKUP.get(phrase.toLowerCase());
    if (!exactSingle) return null;
    return {
      canonical: exactSingle.canonical,
      key: exactSingle.canonical.toLowerCase(),
      synonymGroup: exactSingle,
    };
  }

  const low = phrase.toLowerCase();
  if (JD_STOPWORDS.has(phrase) || JD_STOPWORDS.has(low)) return null;
  if (/^[一二三四五六七八九十\d]+[年月日岁科级天项次万千百个以上内]?$/.test(phrase)) return null;

  const group = SYNONYM_LOOKUP.get(low) || SYNONYM_LOOKUP.get(compactToken(phrase));
  if (group) {
    return {
      canonical: group.canonical,
      key: group.canonical.toLowerCase(),
      synonymGroup: group,
    };
  }

  return {
    canonical: phrase,
    key: low,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTermWithBoundary(resumeLower: string, resumeCompact: string, term: string): boolean {
  const low = term.toLowerCase().trim();
  if (!low) return false;
  const hasCjk = /[\u4e00-\u9fa5]/.test(low);
  const isPureAscii = /^[a-z0-9+#._/\s-]+$/i.test(low);

  if (isPureAscii) {
    // Use strict alphanumeric boundaries to avoid false positives like "go" matching "mongodb"/"google"
    const boundaryRe = new RegExp(`(?<![a-z0-9])${escapeRegExp(low)}(?![a-z0-9])`, 'i');
    if (boundaryRe.test(resumeLower)) return true;

    // Also handle spacing/hyphen variants for multi-part tech tokens ("Power BI" vs "PowerBI", "S7-1500" vs "S71500")
    if (/[\s._-]/.test(low)) {
      const compact = compactToken(low);
      if (compact.length >= 4) {
        const compactRe = new RegExp(`(?<![a-z0-9])${escapeRegExp(compact)}(?![a-z0-9])`, 'i');
        if (compactRe.test(resumeCompact)) return true;
      }
    }
    return false;
  }

  if (hasCjk) {
    if (resumeLower.includes(low)) return true;
    const compact = compactToken(low);
    if (compact.length >= 3 && resumeCompact.includes(compact)) return true;
  }

  return resumeLower.includes(low);
}

function extractBigrams(text: string): Set<string> {
  const clean = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
  const set = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) {
    set.add(clean.slice(i, i + 2));
  }
  return set;
}

function findFuzzyResumeMatch(
  keyword: string,
  resumeClauses: string[],
): { matchedSnippet: string; similarity: number } | null {
  const cjkChars = keyword.replace(/[^\u4e00-\u9fa5]/g, '');
  // Only apply fuzzy semantic bigram matching to multi-character Chinese or mixed descriptive phrases
  if (cjkChars.length < 4) return null;

  const kwBigrams = extractBigrams(keyword);
  if (kwBigrams.size < 3) return null;

  let bestScore = 0;
  let bestSnippet = '';

  for (const clause of resumeClauses) {
    if (clause.length < 4) continue;
    const clauseBigrams = extractBigrams(clause);
    if (clauseBigrams.size < 2) continue;

    let sharedBigrams = 0;
    for (const bg of kwBigrams) {
      if (clauseBigrams.has(bg)) sharedBigrams += 1;
    }
    if (sharedBigrams < 2) continue;

    // Asymmetric containment similarity: how much of the JD phrase is semantically covered by this resume clause
    const bigramCoverage = sharedBigrams / kwBigrams.size;

    // Bonus check on unique CJK character overlap to prevent coincidence on generic glue bigrams
    const kwCharSet = new Set(cjkChars.split(''));
    let sharedChars = 0;
    for (const ch of kwCharSet) {
      if (clause.includes(ch)) sharedChars += 1;
    }
    const charCoverage = sharedChars / kwCharSet.size;

    const combined = bigramCoverage * 0.65 + charCoverage * 0.35;
    if (combined > bestScore) {
      bestScore = combined;
      bestSnippet = clause.length > 26 ? `${clause.slice(0, 26)}…` : clause;
    }
  }

  if (bestScore >= 0.62) {
    return {
      matchedSnippet: bestSnippet,
      similarity: Math.round(bestScore * 100) / 100,
    };
  }
  return null;
}

/**
 * Step 2a (Local Engine): Extract ranked hard-skill candidates from JD text completely offline.
 */
export function extractLocalJdSkills(jdText: string): {
  skills: JdStructuredSkillItem[];
  cleanedJd: string;
  noiseRemovedCount: number;
} {
  const { cleaned: cleanJd, noiseRemovedCount } = preprocessJdText(jdText || '');
  if (!cleanJd) {
    return { skills: [], cleanedJd: '', noiseRemovedCount };
  }

  interface CandidateAcc {
    canonical: string;
    weight: number;
    tier: JdKeywordTier;
    count: number;
    isKnownLexicon: boolean;
    isAsciiTech: boolean;
    synonymGroup?: JdSynonymGroup;
    surfaceTerms: Set<string>;
  }

  const candidates = new Map<string, CandidateAcc>();

  const registerCandidate = (
    rawTerm: string,
    clauseTier: JdKeywordTier,
    clauseBaseWeight: number,
    clauseRegisteredKeys: Set<string>,
    lexiconBoost = 0,
    surfaceHint?: string,
  ) => {
    const normalized = normalizeJdKeyword(rawTerm);
    if (!normalized) return;
    if (clauseRegisteredKeys.has(normalized.key)) return;
    clauseRegisteredKeys.add(normalized.key);

    const existing = candidates.get(normalized.key);
    const isAsciiTech = /[a-z]/i.test(normalized.canonical);
    const isKnownLexicon = Boolean(normalized.synonymGroup);
    const itemWeight =
      clauseBaseWeight + (isKnownLexicon ? 1.2 + lexiconBoost : 0) + (isAsciiTech ? 0.6 : 0);
    const cleanSurface = (surfaceHint || rawTerm).trim();

    if (existing) {
      existing.count += 1;
      existing.weight = Math.min(10, Math.max(existing.weight, itemWeight) + 0.5);
      if (cleanSurface) existing.surfaceTerms.add(cleanSurface);
      if (clauseTier === 'core' || (clauseTier === 'standard' && existing.tier === 'bonus')) {
        existing.tier = clauseTier;
      }
      if (!existing.synonymGroup && normalized.synonymGroup) {
        existing.synonymGroup = normalized.synonymGroup;
        existing.isKnownLexicon = true;
      }
      return;
    }

    const surfaceTerms = new Set<string>();
    if (cleanSurface) surfaceTerms.add(cleanSurface);

    candidates.set(normalized.key, {
      canonical: normalized.canonical,
      weight: itemWeight,
      tier: clauseTier,
      count: 1,
      isKnownLexicon,
      isAsciiTech,
      synonymGroup: normalized.synonymGroup,
      surfaceTerms,
    });
  };

  // Split cleaned JD into requirement clauses to preserve core vs bonus weighting
  const clauses = cleanJd
    .split(/[\n。；;！？!?]+/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 2);

  for (const clause of clauses) {
    const clauseTier: JdKeywordTier = BONUS_CLAUSE_RE.test(clause)
      ? 'bonus'
      : CORE_CLAUSE_RE.test(clause)
        ? 'core'
        : 'standard';
    const clauseBaseWeight = clauseTier === 'core' ? 3 : clauseTier === 'standard' ? 2 : 1;
    const clauseLower = clause.toLowerCase();
    const clauseCompact = compactToken(clause);
    const clauseRegisteredKeys = new Set<string>();
    let clauseForTechScan = clause;

    // A. Positive dictionary match first (catches multi-word tech terms like "TIA Portal", "Power BI", "Spring Boot", "A/B Test", and domain terms)
    for (const group of JD_SYNONYM_GROUPS) {
      const termsToProbe = [group.canonical, ...group.aliases];
      const matchedTerm = termsToProbe.find((t) => containsTermWithBoundary(clauseLower, clauseCompact, t));
      if (matchedTerm) {
        registerCandidate(
          group.canonical,
          clauseTier,
          clauseBaseWeight,
          clauseRegisteredKeys,
          0.4,
          matchedTerm,
        );
        // Blank out matched multi-word ASCII spans (e.g. "TIA Portal", "Power BI", "Spring Boot") so sub-tokens don't leak in Step B
        for (const term of termsToProbe) {
          if (/^[a-z0-9+#._/\s-]+$/i.test(term) && /\s/.test(term)) {
            const spanRe = new RegExp(`(?<![a-z0-9])${escapeRegExp(term)}(?![a-z0-9])`, 'gi');
            clauseForTechScan = clauseForTechScan.replace(spanRe, ' ');
          }
        }
      }
    }

    // B. Extract English / alphanumeric technical terms & acronyms (e.g. S7-1500, EPLAN, TwinCAT, LabVIEW, React, Vue3)
    const techMatches = clauseForTechScan.match(/[A-Za-z][A-Za-z0-9+#._-]{1,22}/g) || [];
    for (const raw of techMatches) {
      const token = raw.replace(/^[./_-]+|[./_-]+$/g, '');
      if (token.length < 2) continue;
      registerCandidate(token, clauseTier, clauseBaseWeight, clauseRegisteredKeys, 0, token);
    }

    // C. Extract Chinese domain phrases (cleaning proficiency modifiers like "熟练使用" / "熟悉" automatically)
    const cnChunks = clause
      .replace(/[A-Za-z0-9+#._-]+/g, ' ')
      .split(/[\s,，、：:（）()【】\[\]《》“”"'·]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    for (const chunk of cnChunks) {
      const subParts = chunk
        .split(/(?:负责|参与|熟练使用|熟练掌握|熟练运用|熟悉|精通|掌握|了解|具备|具有|能够|以及|并且|进行|开展|推动|完成|协助|配合|优化|提升|需要|优先|经验|能力|的|与|和|及|等|或|对|在|为)/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 2 && p.length <= 10);

      for (const part of subParts) {
        registerCandidate(part, clauseTier, clauseBaseWeight, clauseRegisteredKeys, 0, part);
      }
    }
  }

  const skills: JdStructuredSkillItem[] = Array.from(candidates.values())
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (b.count !== a.count) return b.count - a.count;
      if (a.isKnownLexicon !== b.isKnownLexicon) return a.isKnownLexicon ? -1 : 1;
      if (a.isAsciiTech !== b.isAsciiTech) return a.isAsciiTech ? -1 : 1;
      return a.canonical.length - b.canonical.length;
    })
    .slice(0, 24)
    .map((item) => ({
      keyword: item.canonical,
      tier: item.tier,
      weight: item.weight,
      count: item.count,
      source: 'local',
      surfaceTerms: Array.from(item.surfaceTerms),
    }));

  return { skills, cleanedJd: cleanJd, noiseRemovedCount };
}

/**
 * Step 3 (Unified Matcher): Evaluate any structured skill list (local offline, LLM-extracted, or user-curated)
 * against the resume using exact word-boundary, synonym lexicon, and Chinese bigram fuzzy matching.
 */
export function evaluateJdSkillsAgainstResume(
  doc: ResumeDoc,
  skills: JdStructuredSkillItem[],
  meta?: { cleanedJd?: string; noiseRemovedCount?: number },
): LocalJdMatchResult {
  const cleanedJd = meta?.cleanedJd || '';
  const noiseRemovedCount = meta?.noiseRemovedCount || 0;

  if (!skills || skills.length === 0) {
    return {
      totalKeywords: 0,
      matched: [],
      missing: [],
      scorePct: 0,
      cleanedJd,
      noiseRemovedCount,
      synonymMatchedCount: 0,
      fuzzyMatchedCount: 0,
      matchedDetails: [],
      missingDetails: [],
    };
  }

  const plainResume = formatPlainText(doc);
  const { cleaned: cleanedResume } = preprocessJdText(plainResume);
  const resumeLower = cleanedResume.toLowerCase();
  const resumeCompact = compactToken(cleanedResume);
  const resumeClauses = cleanedResume
    .split(/[\n,，。；;、：:（）()【】\[\]]+/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 4);

  interface EvalItem {
    canonical: string;
    key: string;
    tier: JdKeywordTier;
    weight: number;
    category?: string;
    source: 'local' | 'llm' | 'manual';
    synonymGroup?: JdSynonymGroup;
    surfaceTerms: Set<string>;
  }

  const deduped = new Map<string, EvalItem>();

  for (const rawItem of skills) {
    const rawKw = (rawItem.keyword || '').trim();
    if (!rawKw) continue;
    const isManual = rawItem.source === 'manual';
    const normalized = normalizeJdKeyword(rawKw);
    const canonical = normalized ? normalized.canonical : isManual ? rawKw : '';
    if (!canonical) continue;

    const key = normalized ? normalized.key : canonical.toLowerCase();
    const tier: JdKeywordTier =
      rawItem.tier === 'core' || rawItem.tier === 'bonus' ? rawItem.tier : 'standard';
    const baseWeight = tier === 'core' ? 3 : tier === 'standard' ? 2 : 1;
    const computedWeight =
      typeof rawItem.weight === 'number' && Number.isFinite(rawItem.weight)
        ? rawItem.weight
        : baseWeight + (normalized?.synonymGroup ? 1.2 : 0) + (/[a-z]/i.test(canonical) ? 0.6 : 0);

    const existing = deduped.get(key);
    const incomingSurfaces =
      rawItem.surfaceTerms && rawItem.surfaceTerms.length > 0 ? rawItem.surfaceTerms : [rawKw];

    if (existing) {
      if (tier === 'core' || (tier === 'standard' && existing.tier === 'bonus')) {
        existing.tier = tier;
      }
      existing.weight = Math.max(existing.weight, computedWeight);
      if (!existing.category && rawItem.category) existing.category = rawItem.category;
      if (isManual) existing.source = 'manual';
      for (const s of incomingSurfaces) {
        if (s.trim()) existing.surfaceTerms.add(s.trim());
      }
      continue;
    }

    deduped.set(key, {
      canonical,
      key,
      tier,
      weight: computedWeight,
      category: rawItem.category?.trim() || undefined,
      source: rawItem.source || 'local',
      synonymGroup: normalized?.synonymGroup,
      surfaceTerms: new Set(incomingSurfaces.map((s) => s.trim()).filter(Boolean)),
    });
  }

  const tierRank = (t: JdKeywordTier) => (t === 'core' ? 3 : t === 'standard' ? 2 : 1);
  const ranked = Array.from(deduped.values()).sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (tierRank(b.tier) !== tierRank(a.tier)) return tierRank(b.tier) - tierRank(a.tier);
    return a.canonical.length - b.canonical.length;
  });

  const matched: string[] = [];
  const missing: string[] = [];
  const matchedDetails: LocalJdKeywordDetail[] = [];
  const missingDetails: LocalJdKeywordDetail[] = [];

  let totalWeight = 0;
  let earnedWeight = 0;
  let synonymMatchedCount = 0;
  let fuzzyMatchedCount = 0;

  const hasLiteralSurfaceHit = (term: string): boolean => {
    const low = term.toLowerCase().trim();
    if (!low) return false;
    if (/^[a-z0-9+#._/\s-]+$/i.test(low)) {
      return new RegExp(`(?<![a-z0-9])${escapeRegExp(low)}(?![a-z0-9])`, 'i').test(resumeLower);
    }
    return resumeLower.includes(low);
  };

  for (const item of ranked) {
    const scoreWeight = item.tier === 'core' ? 3 : item.tier === 'standard' ? 2 : 1;
    totalWeight += scoreWeight;

    const surfaceList = Array.from(item.surfaceTerms);
    const directSurfaceHit = surfaceList.some((s) => hasLiteralSurfaceHit(s));

    // 1. Direct literal match of the exact surface term mentioned in JD
    if (directSurfaceHit) {
      matched.push(item.canonical);
      matchedDetails.push({
        keyword: item.canonical,
        weight: Number(item.weight.toFixed(1)),
        tier: item.tier,
        matchType: 'exact',
        category: item.category,
        source: item.source,
      });
      earnedWeight += scoreWeight;
      continue;
    }

    // 2. Synonym lexicon match (canonical/aliases/spacing variants/one-way entailment e.g. K8s <-> Kubernetes, Power BI <-> PowerBI, SQL <- MySQL)
    if (item.synonymGroup) {
      const aliasPool = [
        item.synonymGroup.canonical,
        ...item.synonymGroup.aliases,
        ...(item.synonymGroup.satisfiedBy || []),
      ];
      const matchedAlias = aliasPool.find((alias) =>
        containsTermWithBoundary(resumeLower, resumeCompact, alias),
      );
      if (matchedAlias) {
        synonymMatchedCount += 1;
        matched.push(item.canonical);
        matchedDetails.push({
          keyword: item.canonical,
          weight: Number(item.weight.toFixed(1)),
          tier: item.tier,
          matchType: 'synonym',
          matchedVia: matchedAlias,
          category: item.category,
          source: item.source,
        });
        earnedWeight += scoreWeight;
        continue;
      }
    } else if (containsTermWithBoundary(resumeLower, resumeCompact, item.canonical)) {
      matched.push(item.canonical);
      matchedDetails.push({
        keyword: item.canonical,
        weight: Number(item.weight.toFixed(1)),
        tier: item.tier,
        matchType: 'exact',
        category: item.category,
        source: item.source,
      });
      earnedWeight += scoreWeight;
      continue;
    }

    // 3. Fuzzy bigram overlap match for ambiguous Chinese descriptive phrases
    const fuzzy = findFuzzyResumeMatch(item.canonical, resumeClauses);
    if (fuzzy) {
      fuzzyMatchedCount += 1;
      matched.push(item.canonical);
      matchedDetails.push({
        keyword: item.canonical,
        weight: Number(item.weight.toFixed(1)),
        tier: item.tier,
        matchType: 'fuzzy',
        matchedVia: fuzzy.matchedSnippet,
        similarity: fuzzy.similarity,
        category: item.category,
        source: item.source,
      });
      earnedWeight += scoreWeight * Math.min(0.95, Math.max(0.75, fuzzy.similarity));
      continue;
    }

    missing.push(item.canonical);
    missingDetails.push({
      keyword: item.canonical,
      weight: Number(item.weight.toFixed(1)),
      tier: item.tier,
      matchType: 'missing',
      category: item.category,
      source: item.source,
    });
  }

  const totalKeywords = matched.length + missing.length;
  const scorePct = totalWeight > 0 ? Math.min(100, Math.round((earnedWeight / totalWeight) * 100)) : 0;

  return {
    totalKeywords,
    matched,
    missing,
    scorePct,
    cleanedJd,
    noiseRemovedCount,
    synonymMatchedCount,
    fuzzyMatchedCount,
    matchedDetails,
    missingDetails,
  };
}

/**
 * Pure offline JD keyword gap matcher — requires zero AI/API key.
 * Pipeline:
 * 1) Regex preprocessing (cleans mojibake, zero-width chars, HTML, full-width ASCII, bullets, slashes)
 * 2) Proficiency modifier stripping + synonym lexicon mapping ("熟练使用 Java" == "熟悉 Java" -> "Java")
 * 3) Weighted priority ranking (core requirements > standard > bonus/optional + frequency & lexicon boost)
 * 4) Word-boundary exact match -> synonym alias match -> Chinese bigram fuzzy match for ambiguous descriptions
 */
export function analyzeJdMatchLocal(doc: ResumeDoc, jdText: string): LocalJdMatchResult {
  const { skills, cleanedJd, noiseRemovedCount } = extractLocalJdSkills(jdText);
  return evaluateJdSkillsAgainstResume(doc, skills, { cleanedJd, noiseRemovedCount });
}

export const JD_EXTRACT_SYSTEM_PROMPT =
  '你是一个资深的 HR 和技术专家。请阅读以下 JD，并提取硬性要求。忽略所有软性要求（如沟通能力强、抗压、有责任心、团队合作、大局观等）。将提取出的技能词按分类输出为 JSON 格式（例如：前端、后端、数据库、工程工具、加分项，若为非技术岗位可按岗位贴切分类输出）。如果遇到「精通 A，熟悉 B，了解 C」这类不同熟练度表述，请拆分为独立技能并标注对应层级（core=精通/必须，standard=熟悉/掌握，bonus=了解/优先/加分）。';

/**
 * Build a complete copy-pasteable prompt for zero-config external LLM structured JD extraction.
 */
export function buildJdExtractPrompt(jdText: string, roleHint?: string): string {
  const { cleaned } = preprocessJdText(jdText || '');
  const parts = [
    JD_EXTRACT_SYSTEM_PROMPT,
    roleHint ? `【参考岗位方向】${roleHint.trim()}` : '',
    `【目标岗位 JD】\n${(cleaned || jdText || '').trim()}`,
    `【输出格式要求（请仅输出严格合法 JSON，可直接粘贴回简历工坊渲染分类标签）】
\`\`\`json
{
  "categories": [
    {
      "name": "前端 / 后端 / 数据库 / 工具与平台 / 领域能力 / 加分项",
      "items": [
        { "keyword": "Java", "tier": "core" },
        { "keyword": "Redis", "tier": "standard" },
        { "keyword": "Rust", "tier": "bonus" }
      ]
    }
  ],
  "ignoredSoftSkills": ["抗压能力强", "沟通能力好"]
}
\`\`\``,
  ].filter(Boolean);
  return parts.join('\n\n');
}

function inferTierFromLabel(raw: unknown, categoryName = ''): JdKeywordTier {
  const catLow = categoryName.toLowerCase();
  if (/加分|优先|bonus|plus|nice/i.test(catLow)) return 'bonus';
  const s = String(raw || '').toLowerCase().trim();
  if (/^(core|must|high|required|expert|proficient)$|精通|必须|核心|硬性|熟练掌握|熟练使用/.test(s)) {
    return 'core';
  }
  if (/^(bonus|low|optional|plus|preferred|familiar)$|了解|优先|加分|选修/.test(s)) {
    return 'bonus';
  }
  return 'standard';
}

/**
 * Normalize structured JSON returned by `/api/ai/extract-jd` OR pasted from external LLMs.
 * Supports both `{ categories: [{ name, items }] }` and flat `{ "前端": [...], "数据库": [...], "加分项": [...] }` shapes.
 */
export function normalizeStructuredJdExtract(raw: unknown): JdStructuredExtractResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('JSON 根结构必须是对象（包含 categories 数组或按分类命名的键值对）。');
  }
  const obj = raw as Record<string, unknown>;
  const categories: JdStructuredExtractResult['categories'] = [];
  const ignoredSoftSkills: string[] = [];

  const collectSoft = (val: unknown) => {
    if (!Array.isArray(val)) return;
    for (const v of val) {
      const s = String(v || '').trim();
      if (s && !ignoredSoftSkills.includes(s)) ignoredSoftSkills.push(s);
    }
  };
  collectSoft(obj.ignoredSoftSkills ?? obj.ignored_soft_skills ?? obj.softSkillsIgnored);

  const parseItems = (rawItems: unknown, categoryName: string): Array<{ keyword: string; tier: JdKeywordTier }> => {
    if (!Array.isArray(rawItems)) return [];
    const out: Array<{ keyword: string; tier: JdKeywordTier }> = [];
    const seen = new Set<string>();

    for (const entry of rawItems) {
      let keyword = '';
      let tier: JdKeywordTier = inferTierFromLabel('', categoryName);

      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        if (!trimmed) continue;
        if (CORE_CLAUSE_RE.test(trimmed)) tier = 'core';
        else if (BONUS_CLAUSE_RE.test(trimmed) || /^了解/.test(trimmed)) tier = 'bonus';
        const norm = normalizeJdKeyword(trimmed);
        keyword = norm ? norm.canonical : trimmed;
      } else if (entry && typeof entry === 'object') {
        const rec = entry as Record<string, unknown>;
        const rawKw = String(rec.keyword ?? rec.skill ?? rec.name ?? rec.term ?? '').trim();
        if (!rawKw) continue;
        const norm = normalizeJdKeyword(rawKw);
        keyword = norm ? norm.canonical : rawKw;
        tier = inferTierFromLabel(rec.tier ?? rec.level ?? rec.proficiency ?? rec.priority ?? rawKw, categoryName);
      }

      if (!keyword || HR_FLUFF_RE.test(keyword)) continue;
      const key = keyword.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ keyword, tier });
    }
    return out;
  };

  if (Array.isArray(obj.categories)) {
    for (const cat of obj.categories) {
      if (!cat || typeof cat !== 'object') continue;
      const rec = cat as Record<string, unknown>;
      const name = String(rec.name ?? rec.category ?? rec.title ?? '核心要求').trim() || '核心要求';
      const items = parseItems(rec.items ?? rec.skills ?? rec.keywords, name);
      if (items.length > 0) {
        categories.push({ name, items });
      }
    }
  } else {
    // Support flexible flat object format like { "前端": ["React"], "后端": [{ name: "Java", level: "精通" }], "加分项": ["Rust"] }
    for (const [key, val] of Object.entries(obj)) {
      if (/^(ignoredSoftSkills|ignored_soft_skills|softSkillsIgnored|summary|note|meta)$/i.test(key)) {
        continue;
      }
      if (Array.isArray(val)) {
        const items = parseItems(val, key);
        if (items.length > 0) {
          categories.push({ name: key.trim(), items });
        }
      } else if (val && typeof val === 'object') {
        // Handle nested proficiency object like { "精通": ["Java"], "了解": ["Go"] }
        const nestedItems: Array<{ keyword: string; tier: JdKeywordTier }> = [];
        for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
          if (Array.isArray(subVal)) {
            const subTier = inferTierFromLabel(subKey, key);
            for (const item of parseItems(subVal, key)) {
              nestedItems.push({ keyword: item.keyword, tier: subTier });
            }
          }
        }
        if (nestedItems.length > 0) {
          categories.push({ name: key.trim(), items: nestedItems });
        }
      }
    }
  }

  if (categories.length === 0) {
    throw new Error('JSON 中未找到有效的技能分类数组，请确认已复制完整的结构化 JSON。');
  }

  return {
    categories,
    ignoredSoftSkills: ignoredSoftSkills.length > 0 ? ignoredSoftSkills : undefined,
  };
}

/**
 * Parse external LLM structured JD extraction JSON (supports DeepSeek-R1 <think> blocks & markdown fences).
 */
export function parseExternalJdExtractJson(rawText: string): JdStructuredExtractResult {
  const stripped = (rawText || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!stripped) {
    throw new Error('请先粘贴大模型返回的结构化 JD JSON 内容。');
  }
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced && fenced[1] ? fenced[1].trim() : stripped;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error('无法解析为合法 JSON，请检查是否复制完整（需以 { 开头、} 结尾）。');
  }
  return normalizeStructuredJdExtract(parsed);
}

/**
 * Flatten categorized LLM extraction result into unified JdStructuredSkillItem[] for matching & user editing.
 */
export function flattenStructuredJdSkills(
  extracted: JdStructuredExtractResult,
): JdStructuredSkillItem[] {
  const list: JdStructuredSkillItem[] = [];
  for (const cat of extracted.categories) {
    for (const item of cat.items) {
      list.push({
        keyword: item.keyword,
        tier: item.tier,
        category: cat.name,
        source: 'llm',
        surfaceTerms: [item.keyword],
      });
    }
  }
  return list;
}

/**
 * Split cleaned JD text into segments highlighting active extracted keywords in-context.
 */
export function highlightJdSegments(
  cleanedJd: string,
  details: LocalJdKeywordDetail[],
): Array<{ text: string; detail?: LocalJdKeywordDetail }> {
  if (!cleanedJd) return [];
  if (!details.length) return [{ text: cleanedJd }];

  const termToDetail = new Map<string, LocalJdKeywordDetail>();
  const probeTerms: string[] = [];

  for (const detail of details) {
    const low = detail.keyword.toLowerCase();
    if (!termToDetail.has(low)) {
      termToDetail.set(low, detail);
      probeTerms.push(detail.keyword);
    }
    const group = SYNONYM_LOOKUP.get(low) || SYNONYM_LOOKUP.get(compactToken(detail.keyword));
    if (group) {
      for (const alias of group.aliases) {
        if (alias.length < 2) continue;
        const aLow = alias.toLowerCase();
        if (!termToDetail.has(aLow)) {
          termToDetail.set(aLow, detail);
          probeTerms.push(alias);
        }
      }
    }
  }

  // Sort longest first so multi-word terms like "Power BI" or "TIA Portal" match before shorter substrings
  probeTerms.sort((a, b) => b.length - a.length);
  const patternParts = probeTerms.slice(0, 80).map((t) => {
    const esc = escapeRegExp(t);
    return /^[a-z0-9+#._/\s-]+$/i.test(t) ? `(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])` : esc;
  });

  if (patternParts.length === 0) return [{ text: cleanedJd }];

  const combinedRe = new RegExp(`(${patternParts.join('|')})`, 'gi');
  const segments: Array<{ text: string; detail?: LocalJdKeywordDetail }> = [];
  let lastIndex = 0;

  for (const match of cleanedJd.matchAll(combinedRe)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      segments.push({ text: cleanedJd.slice(lastIndex, idx) });
    }
    const hitText = match[0];
    const hitDetail = termToDetail.get(hitText.toLowerCase());
    segments.push({ text: hitText, detail: hitDetail });
    lastIndex = idx + hitText.length;
  }

  if (lastIndex < cleanedJd.length) {
    segments.push({ text: cleanedJd.slice(lastIndex) });
  }

  return segments;
}

export const JD_SEMANTIC_SCORE_SYSTEM_PROMPT =
  '你是一位资深技术面试官与招聘总监。请跳过死板的字面关键词比对，对目标岗位 JD 与候选人简历中的真实工作/项目经历进行深层语义分析，逐项评估提取出的硬性技能与简历经历的相关性并打分（0-100 分）。75-100 分（strong）表示经历中有深度实战、量化成果或等价上位可迁移能力；40-74 分（partial）表示仅在技能栏提及或经历中浅层体现；0-39 分（missing）表示简历未体现。每项必须基于简历事实给出具体依据（evidence），严禁编造经历，并对薄弱或缺失项提供可落地的补强建议（gapAdvice）。';

/**
 * Compute deterministic weighted overall score (0-100) from individual semantic skill scores.
 * Weights: core = 3, standard = 2, bonus = 1.
 */
export function computeWeightedSemanticScore(skillScores: JdSemanticSkillScore[]): number {
  if (!skillScores.length) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const item of skillScores) {
    const w = item.tier === 'core' ? 3 : item.tier === 'bonus' ? 1 : 2;
    const clamped = Math.max(0, Math.min(100, Number(item.relevanceScore) || 0));
    totalWeight += w;
    weightedSum += clamped * w;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Build a complete copy-pasteable prompt for external LLM semantic relevance scoring.
 */
export function buildJdSemanticScoringPrompt(
  doc: ResumeDoc,
  jdText: string,
  skills: JdStructuredSkillItem[] = [],
): string {
  const { cleaned } = preprocessJdText(jdText || '');
  const resolvedSkills =
    skills.length > 0 ? skills : extractLocalJdSkills(jdText).skills;
  const skillLines =
    resolvedSkills.length > 0
      ? resolvedSkills
          .map((s, idx) => {
            const tierLabel =
              s.tier === 'core' ? '核心/精通' : s.tier === 'bonus' ? '加分/了解' : '常规/熟悉';
            const catLabel = s.category ? `/${s.category}` : '';
            return `${idx + 1}. ${s.keyword}（${tierLabel}${catLabel}）`;
          })
          .join('\n')
      : '（请直接从 JD 中提取硬性技能并逐项打分）';

  const parts = [
    JD_SEMANTIC_SCORE_SYSTEM_PROMPT,
    doc.data.intent.position ? `【目标岗位方向】${doc.data.intent.position}` : '',
    `【目标岗位 JD】\n${(cleaned || jdText || '').trim()}`,
    `【待语义打分的硬性技能项】\n${skillLines}`,
    `【候选人简历全文（重点结合工作/项目经历与成果进行语义评估）】\n${formatPlainText(doc)}`,
    `【输出格式要求（请仅输出严格合法 JSON，可直接粘贴回简历工坊渲染语义相关性打分卡片）】
\`\`\`json
{
  "overallScore": 78,
  "roleAlignment": "一句话概括岗位背景契合度与核心短板",
  "summary": "一句话综合语义匹配结论",
  "skillScores": [
    {
      "keyword": "Python",
      "tier": "core",
      "category": "后端与数据",
      "relevanceScore": 92,
      "status": "strong",
      "evidence": "在星云智选经历中用 Python(Pandas) 搭建自动化流水线，周报耗时缩短 85%",
      "gapAdvice": ""
    }
  ]
}
\`\`\``,
  ].filter(Boolean);
  return parts.join('\n\n');
}

function deriveSemanticStatus(score: number, rawStatus?: unknown): JdSemanticStatus {
  if (score >= 75) return 'strong';
  if (score >= 40) return 'partial';
  if (score < 40) return 'missing';
  const s = String(rawStatus || '').toLowerCase().trim();
  if (s === 'strong' || s === 'partial' || s === 'missing') return s;
  return 'missing';
}

/**
 * Validate and normalize raw LLM JSON output into a deterministic JdSemanticMatchReport.
 */
export function normalizeJdSemanticMatchReport(
  raw: unknown,
  skills: JdStructuredSkillItem[] = [],
  meta?: {
    source?: 'api' | 'external-json';
    usedModel?: string;
    usedProvider?: string;
  },
): JdSemanticMatchReport {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('语义打分结果必须是合法 JSON 对象（包含 skillScores 数组）。');
  }
  const obj = raw as Record<string, unknown>;
  const rawList = Array.isArray(obj.skillScores)
    ? obj.skillScores
    : Array.isArray(obj.skills)
      ? obj.skills
      : Array.isArray(obj.items)
        ? obj.items
        : [];

  if (rawList.length === 0) {
    throw new Error('语义打分 JSON 中未找到有效的 skillScores 评分列表。');
  }

  const skillMetaMap = new Map<string, JdStructuredSkillItem>();
  for (const s of skills) {
    const key = (normalizeJdKeyword(s.keyword)?.key || s.keyword.toLowerCase()).trim();
    if (key && !skillMetaMap.has(key)) skillMetaMap.set(key, s);
  }

  const seen = new Set<string>();
  const skillScores: JdSemanticSkillScore[] = [];

  for (const entry of rawList) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const rawKw = String(rec.keyword ?? rec.skill ?? rec.name ?? '').trim();
    if (!rawKw) continue;
    const norm = normalizeJdKeyword(rawKw);
    const lookupKey = norm?.key || rawKw.toLowerCase();
    if (seen.has(lookupKey)) continue;
    seen.add(lookupKey);

    const matchedInput = skillMetaMap.get(lookupKey);
    const rawScore = Number(rec.relevanceScore ?? rec.score ?? rec.matchScore ?? 0);
    const relevanceScore = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 0;
    const explicitTierRaw = rec.tier ?? rec.level ?? rec.priority;
    const hasExplicitTier =
      typeof explicitTierRaw === 'string' && explicitTierRaw.trim().length > 0;
    const tier: JdKeywordTier = hasExplicitTier
      ? inferTierFromLabel(explicitTierRaw, String(rec.category || ''))
      : matchedInput?.tier || inferTierFromLabel(undefined, String(rec.category || ''));
    const category =
      (typeof rec.category === 'string' && rec.category.trim()) || matchedInput?.category || undefined;
    const status = deriveSemanticStatus(relevanceScore, rec.status);
    const evidence =
      typeof rec.evidence === 'string' && rec.evidence.trim()
        ? rec.evidence.trim()
        : status === 'missing'
          ? '简历经历与技能栏暂未体现该项能力'
          : '简历中存在相关背景支撑';
    const gapAdvice =
      typeof rec.gapAdvice === 'string' && rec.gapAdvice.trim()
        ? rec.gapAdvice.trim()
        : typeof rec.advice === 'string' && rec.advice.trim()
          ? rec.advice.trim()
          : undefined;

    skillScores.push({
      keyword: matchedInput?.keyword || norm?.canonical || rawKw,
      tier,
      category,
      relevanceScore,
      status,
      evidence,
      gapAdvice: status === 'strong' ? undefined : gapAdvice,
    });
  }

  // Ensure every curated input skill is represented even if the LLM omitted one
  for (const inputSkill of skills) {
    const key = normalizeJdKeyword(inputSkill.keyword)?.key || inputSkill.keyword.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      skillScores.push({
        keyword: inputSkill.keyword,
        tier: inputSkill.tier,
        category: inputSkill.category,
        relevanceScore: 0,
        status: 'missing',
        evidence: '简历经历中未检测到明确语义关联',
        gapAdvice: '如实际具备该技能，建议补充具体项目案例与结果',
      });
    }
  }

  // Sort by tier priority (core > standard > bonus), then relevanceScore descending
  const tierOrder = (t: JdKeywordTier) => (t === 'core' ? 3 : t === 'standard' ? 2 : 1);
  skillScores.sort((a, b) => {
    if (tierOrder(b.tier) !== tierOrder(a.tier)) return tierOrder(b.tier) - tierOrder(a.tier);
    return b.relevanceScore - a.relevanceScore;
  });

  const computedOverall = computeWeightedSemanticScore(skillScores);
  const rawOverall = Number(obj.overallScore ?? obj.score);
  const overallScore =
    Number.isFinite(rawOverall) && rawOverall >= 0 && rawOverall <= 100 && Math.abs(rawOverall - computedOverall) <= 15
      ? Math.round(rawOverall)
      : computedOverall;

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : `已完成 ${skillScores.length} 项硬性技能的简历经历语义相关性评估，加权匹配度 ${overallScore}%。`;
  const roleAlignment =
    typeof obj.roleAlignment === 'string' && obj.roleAlignment.trim()
      ? obj.roleAlignment.trim()
      : undefined;

  return {
    overallScore,
    summary,
    roleAlignment,
    skillScores,
    usedModel: meta?.usedModel,
    usedProvider: meta?.usedProvider,
    source: meta?.source || 'api',
  };
}

/**
 * Parse external LLM semantic relevance scoring JSON (supports <think> traces & markdown code fences).
 */
export function parseExternalJdSemanticJson(
  rawText: string,
  skills: JdStructuredSkillItem[] = [],
): JdSemanticMatchReport {
  const stripped = (rawText || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!stripped) {
    throw new Error('请先粘贴大模型返回的语义打分 JSON。');
  }
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced && fenced[1] ? fenced[1].trim() : stripped;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error('无法解析为合法 JSON，请检查是否完整复制（需以 { 开头、} 结尾）。');
  }
  return normalizeJdSemanticMatchReport(parsed, skills, { source: 'external-json' });
}

export interface ScoreJdSemanticRelevanceParams {
  doc: ResumeDoc;
  jdText: string;
  skills?: JdStructuredSkillItem[];
  customConfig?: CustomAiConfig;
  selectedProvider?: AiProviderId;
  endpoint?: string;
  fetcher?: typeof fetch;
}

/**
 * Use an LLM to semantically analyze the JD against the user's resume experiences & skills,
 * scoring each extracted hard-skill requirement (0-100) with concrete experience evidence and gap advice,
 * replacing simple literal text matching.
 */
export async function scoreJdSemanticRelevanceWithLlm(
  params: ScoreJdSemanticRelevanceParams,
): Promise<JdSemanticMatchReport> {
  const {
    doc,
    jdText,
    skills,
    customConfig,
    selectedProvider = 'auto',
    endpoint = '/api/ai/semantic-match',
    fetcher = fetch,
  } = params;

  const { cleaned: cleanedJd } = preprocessJdText(jdText || '');
  if (cleanedJd.length < 8) {
    throw new Error('请先粘贴目标岗位 JD 原文（至少 8 个字）再执行语义相关性打分。');
  }

  const resumeText = formatPlainText(doc);
  if (resumeText.trim().length < 20) {
    throw new Error('当前简历内容过短，请先完善工作经历或技能后再执行语义相关性打分。');
  }

  const resolvedSkills =
    skills && skills.length > 0 ? skills : extractLocalJdSkills(cleanedJd).skills;

  const aiDefaults = customConfig
    ? buildAiRequestDefaults(customConfig, selectedProvider)
    : { provider: selectedProvider };

  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...aiDefaults,
      jdText: cleanedJd,
      skills: resolvedSkills.map((s) => ({
        keyword: s.keyword,
        tier: s.tier,
        category: s.category,
      })),
      resumeText,
      roleHint: doc.data.intent.position || doc.name,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    report?: unknown;
    error?: string;
    meta?: { provider?: string; model?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error || `LLM 语义打分请求失败 (${response.status})`);
  }

  return normalizeJdSemanticMatchReport(payload.report, resolvedSkills, {
    source: 'api',
    usedModel: payload.meta?.model,
    usedProvider: payload.meta?.provider,
  });
}

export interface QuantificationCheckResult {
  hasAny: boolean;
  hasPercent: boolean;
  hasCurrency: boolean;
  hasNumber: boolean;
}

const DATE_NOISE_RE =
  /(?:19|20)\d{2}\s*[./年-]\s*\d{1,2}(?:\s*[./月-]\s*\d{1,2}日?)?|(?:19|20)\d{2}\s*年/g;
const PERCENT_METRIC_RE =
  /(?:[+-]?\d+(?:\.\d+)?\s*[%％]|百分之[零一二三四五六七八九十百千万\d.]+|\d+(?:\.\d+)?\s*个百分点)/;
const CURRENCY_METRIC_RE =
  /(?:[¥￥$€£]\s*\d[\d,.]*(?:\s*[万亿千百KkMmWw])?|\d[\d,.]*\s*(?:万元|亿元|千元|元|美元|美金|港币|欧元|RMB|USD|CNY|万\s*(?:GMV|营收|销售额|成本|预算|回款|流水)))/i;
const NUMBER_METRIC_RE =
  /(?:\d+(?:\.\d+)?\s*(?:倍|万|亿|千|百|余|家|项|个|人|名|位|次|份|场|篇|套|台|条|天|小时|分钟|秒|ms|s|周|个月|月|年|省|市|校|班|门|款|版|例|批|吨|件|单|户|SKU|K|k|M|W|w|\+)|(?:TOP|Top|top|第)\s*\d+(?:\s*名)?|\d+(?:\.\d+)?\s*\/\s*\d+|\b\d+(?:\.\d+)?\s*(?:QPS|TPS|DAU|MAU|PV|UV|ROI|GMV|KPI|SLA)\b)/i;

export function hasQuantifiedDescription(text: string): QuantificationCheckResult {
  const plain = stripBold(text || '').trim();
  if (!plain) {
    return { hasAny: false, hasPercent: false, hasCurrency: false, hasNumber: false };
  }
  const withoutDates = plain.replace(DATE_NOISE_RE, ' ');
  const hasPercent = PERCENT_METRIC_RE.test(withoutDates);
  const hasCurrency = CURRENCY_METRIC_RE.test(withoutDates);
  const hasNumber = NUMBER_METRIC_RE.test(withoutDates);
  return {
    hasAny: hasPercent || hasCurrency || hasNumber,
    hasPercent,
    hasCurrency,
    hasNumber,
  };
}

export function buildQuantEnhancementSuggestion(
  exp: ExperienceItem,
  bulletIndex: number,
  rawBullet: string
): LocalAuditEnhancement {
  const plain = stripBold(rawBullet).trim();
  const baseBody = rawBullet.trim().replace(/[。；;！!]+$/, '');
  const companyLabel = exp.company.trim() || exp.role.trim() || '当前经历';
  const location = `${companyLabel} · 要点 ${bulletIndex + 1}`;
  const alreadyHasSlot = /\bXX\b|\bX\s*(?:天|小时|万|项|倍|个)/.test(plain);

  let appendClause = '';
  let tip = '';
  let missingDimensions: string[] = ['百分比', '数字规模'];

  if (/(?:成本|降本|预算|采购|费用|损耗|开销|支出)/.test(plain)) {
    appendClause = '，实现年度相关成本降低 **XX%**（累计节约约 **XX 万元**）。';
    tip = '补充降本幅度（%）与节约金额（万元），财务与管理视角更有说服力。';
    missingDimensions = ['百分比', '金额'];
  } else if (/(?:销售|营收|回款|签约|转化|成交|GMV|毛利|利润|复购|业绩|客单|招商|开拓|客户)/.test(plain)) {
    appendClause = '，推动业务成交/营收达 **XX 万元**，核心转化率同比提升 **XX%**。';
    tip = '补充成交/回款金额（万元）及转化/增长百分比，直接体现商业贡献。';
    missingDimensions = ['金额', '百分比'];
  } else if (/(?:自动化|流程|耗时|效率|周期|周报|报表|清洗|脚本|排查|调试|上线|迭代|响应|优化|重构|性能)/.test(plain)) {
    appendClause = '，将处理耗时由原 **X 小时** 压缩至 **X 分钟**，整体效率提升 **XX%**。';
    tip = '补充前后耗时对比与提效百分比（如耗时缩短 60%、效率提升 3 倍）。';
    missingDimensions = ['百分比', '时长/倍数'];
  } else if (/(?:教学|课程|班级|学生|培训|撰写|审校|编辑|公文|活动|宣传|媒体|护理|患者|病例|团队|协作)/.test(plain)) {
    appendClause = '，累计覆盖 **XX+ 人/场次**，最终成果满意度/验收通过率达 **XX%**。';
    tip = '补充覆盖人数、产出篇数/场次或满意度/零差错率等可核实数字。';
    missingDimensions = ['数量规模', '百分比'];
  } else {
    appendClause = '，累计交付 **XX 项** 核心成果，推动关键业务指标提升 **XX%**。';
    tip = '补充交付数量、覆盖规模、百分比变化或涉及金额中的 1-2 项真实数据。';
    missingDimensions = ['百分比', '数字规模', '金额'];
  }

  return {
    id: `quant-${exp.id}-${bulletIndex}`,
    expId: exp.id,
    bulletIndex,
    location,
    original: plain,
    missingDimensions,
    suggestedText: alreadyHasSlot ? rawBullet.trim() : `${baseBody}${appendClause}`,
    tip,
  };
}

export function runLocalAudit(doc: ResumeDoc, pageCount = 1): LocalCheckItem[] {
  const checks: LocalCheckItem[] = [];
  const d = doc.data;
  const m = doc.meta;

  if (!d.basic.name.trim()) {
    checks.push({
      id: 'no-name',
      lv: 'err',
      msg: '未填写姓名',
      sub: '姓名是简历第一视觉锚点，请先补充。',
      go: 'basic',
    });
  }
  if (!d.basic.phone.trim() && !d.basic.email.trim()) {
    checks.push({
      id: 'no-contact',
      lv: 'err',
      msg: '缺少有效联系方式',
      sub: '至少填写手机号码或常用邮箱，否则 HR 无法触达。',
      go: 'basic',
    });
  } else if (d.basic.phone.trim() && !/^1[3-9]\d{9}$/.test(d.basic.phone.replace(/[\s-]/g, ''))) {
    checks.push({
      id: 'bad-phone',
      lv: 'warn',
      msg: '手机号格式可能异常',
      sub: `当前填写「${d.basic.phone}」，请核对是否为 11 位常用手机号。`,
      go: 'basic',
    });
  }

  if (!d.basic.headline.trim()) {
    checks.push({
      id: 'no-headline',
      lv: 'warn',
      msg: '缺少一句话定位标语',
      sub: '建议用“目标岗位 | 核心背景 · 2项强卖点”帮 HR 3 秒看懂价值。',
      go: 'basic',
    });
  }

  if (isShown(m, 'intent') && !d.intent.position.trim()) {
    checks.push({
      id: 'no-intent-pos',
      lv: 'warn',
      msg: '求职意向未写明确岗位',
      sub: '开启了求职意向模块但目标岗位为空，建议填写或隐藏该模块。',
      go: 'intent',
    });
  }

  if (d.experience.length === 0) {
    checks.push({
      id: 'no-exp',
      lv: 'err',
      msg: '工作 / 实习经历为空',
      sub: '经历模块是简历核心证据区，请至少补充 1 段真实经历。',
      go: 'experience',
    });
  } else {
    let longBullets = 0;
    let totalBullets = 0;
    let quantifiedBullets = 0;
    const unquantifiedItems: LocalAuditEnhancement[] = [];

    for (const exp of d.experience) {
      exp.bullets.forEach((rawBullet, bIdx) => {
        const plain = stripBold(rawBullet).trim();
        if (!plain) return;
        totalBullets += 1;
        if (plain.length > 78) longBullets += 1;
        const q = hasQuantifiedDescription(plain);
        if (q.hasAny) {
          quantifiedBullets += 1;
        } else {
          unquantifiedItems.push(buildQuantEnhancementSuggestion(exp, bIdx, rawBullet));
        }
      });
    }

    if (longBullets > 0) {
      checks.push({
        id: 'long-bullets',
        lv: 'tip',
        msg: `有 ${longBullets} 条经历要点偏长（>78 字）`,
        sub: '建议压缩为单句精炼结构，配合 **加粗** 突出动词与结果，提升扫视速度。',
        go: 'experience',
      });
    }

    if (totalBullets > 0 && quantifiedBullets === 0) {
      checks.push({
        id: 'no-metrics',
        lv: 'warn',
        msg: '关键经历缺乏量化描述（无百分比、数字或金额）',
        sub: `当前 ${totalBullets} 条经历要点均未包含百分比、数量规模或金额等可核实数据，建议参考下方自动增强建议补充真实指标。`,
        go: 'experience',
        enhancements: unquantifiedItems.slice(0, 4),
      });
    } else if (totalBullets > 0 && unquantifiedItems.length > 0) {
      const quantRatio = quantifiedBullets / totalBullets;
      const topExpUnquantified = unquantifiedItems.some((item) => item.expId === d.experience[0]?.id);
      if (quantRatio < 0.75 || topExpUnquantified) {
        checks.push({
          id: 'low-metrics',
          lv: 'tip',
          msg: `部分关键经历缺乏量化描述（${unquantifiedItems.length}/${totalBullets} 条待增强）`,
          sub: '以下经历描述缺少百分比、具体数字或金额佐证，可一键套用下方自动增强建议后替换为真实数值。',
          go: 'experience',
          enhancements: unquantifiedItems.slice(0, 4),
        });
      }
    }
  }

  if (d.skills.length === 0) {
    checks.push({
      id: 'no-skills',
      lv: 'warn',
      msg: '专业技能模块为空',
      sub: '建议按工具/方法分组列出核心技能，方便 ATS 关键词检索。',
      go: 'skills',
    });
  }

  if (d.education.length === 0) {
    checks.push({
      id: 'no-edu',
      lv: 'warn',
      msg: '教育背景未填写',
      sub: '请补充最高学历、院校、专业与起止时间。',
      go: 'education',
    });
  }

  if (pageCount > 1 && !m.autofit) {
    checks.push({
      id: 'over-page',
      lv: 'warn',
      msg: `当前内容超出 1 页（约 ${pageCount} 页）`,
      sub: '建议在「外观排版」开启「自动压一页」或切换更紧凑的字号与行距。',
      go: 'design',
    });
  }

  if ((d.basic.extras?.length || 0) > 4) {
    checks.push({
      id: 'too-many-extras',
      lv: 'tip',
      msg: `眉首附加信息较多（${d.basic.extras.length} 项）`,
      sub: '建议精选 2-3 项与当前岗位强相关的信息，保持顶部版面利落。',
      go: 'basic',
    });
  }

  return checks;
}

export function formatPlainText(doc: ResumeDoc): string {
  const d = doc.data;
  const m = doc.meta;
  const lines: string[] = [];

  lines.push(`# ${d.basic.name || '未命名简历'}`);
  if (d.basic.headline) lines.push(d.basic.headline);
  const contacts = getContactList(d).map((c) => `${c.label}：${c.value}`);
  if (contacts.length) lines.push(contacts.join(' | '));
  lines.push('');

  for (const key of m.order) {
    if (!isShown(m, key)) continue;
    if (key === 'intent') {
      const items = [
        d.intent.position && `目标岗位：${d.intent.position}`,
        d.intent.city && `期望城市：${d.intent.city}`,
        d.intent.salary && `期望薪资：${d.intent.salary}`,
        d.intent.availability && `到岗时间：${d.intent.availability}`,
      ].filter(Boolean);
      if (items.length) {
        lines.push(`【${secTitle(m, 'intent')}】`);
        lines.push(items.join(' | '));
        lines.push('');
      }
    } else if (key === 'experience' && d.experience.length) {
      lines.push(`【${secTitle(m, 'experience')}】`);
      for (const exp of d.experience) {
        lines.push(`${exp.company} | ${exp.role} (${exp.period})`);
        if (exp.subtitle) lines.push(`  概述：${exp.subtitle}`);
        const kpis = expKpisOf(exp.kpis);
        if (kpis.length) {
          lines.push(`  核心指标：${kpis.map((k) => `${k.num} ${k.label}`).join(' / ')}`);
        }
        for (const b of exp.bullets) {
          if (b.trim()) lines.push(`  - ${stripBold(b.trim())}`);
        }
      }
      lines.push('');
    } else if (key === 'skills' && d.skills.length) {
      lines.push(`【${secTitle(m, 'skills')}】`);
      for (const sk of d.skills) {
        lines.push(`- ${sk.cat}：${sk.items}`);
      }
      lines.push('');
    } else if (key === 'education' && d.education.length) {
      lines.push(`【${secTitle(m, 'education')}】`);
      for (const edu of d.education) {
        lines.push(`${edu.school} | ${edu.major} · ${edu.degree} (${edu.period})`);
        if (edu.desc) lines.push(`  ${edu.desc}`);
      }
      lines.push('');
    } else if (key === 'certs' && d.certs.length) {
      lines.push(`【${secTitle(m, 'certs')}】`);
      lines.push(d.certs.filter(Boolean).join(' / '));
      lines.push('');
    } else if (key === 'tags' && d.tags.length) {
      lines.push(`【${secTitle(m, 'tags')}】`);
      lines.push(d.tags.filter(Boolean).join(' · '));
      lines.push('');
    } else if (key === 'evals' && d.evals.length) {
      lines.push(`【${secTitle(m, 'evals')}】`);
      for (const ev of d.evals) {
        lines.push(`- ${ev.title}：${ev.body}`);
      }
      lines.push('');
    } else if (key.startsWith('custom:')) {
      const cid = key.slice(7);
      const cm = d.custom.find((c) => c.id === cid);
      if (cm && cm.show && customHasContent(cm)) {
        lines.push(`【${cm.title}】`);
        if (cm.kind === 'tags') {
          lines.push((cm.items as string[]).filter(Boolean).join(' · '));
        } else if (cm.kind === 'bullets' || cm.kind === 'text') {
          for (const it of cm.items as string[]) {
            if (it?.trim()) lines.push(`- ${stripBold(it.trim())}`);
          }
        } else if (cm.kind === 'titled') {
          for (const it of cm.items as TitledItem[]) {
            if (it.title || it.body) lines.push(`- ${it.title}：${it.body}`);
          }
        } else if (cm.kind === 'cases') {
          for (const it of cm.items as CaseItem[]) {
            lines.push(`- ${it.title}`);
            if (it.bg) lines.push(`  背景：${it.bg}`);
            if (it.action) lines.push(`  动作：${it.action}`);
            if (it.result) lines.push(`  结果：${it.result}`);
            if (it.evidence) lines.push(`  佐证：${it.evidence}`);
          }
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n').trim();
}

export function buildPdfTitle(doc: ResumeDoc): string {
  const name = doc.data.basic.name.trim() || '简历';
  const pos =
    doc.data.intent.position.split(/[\/|、,，]/)[0]?.trim() ||
    doc.name.replace(/^方向[一二三四五六七八九十\d]+\s*[·\-]\s*/, '').trim() ||
    '求职简历';
  const city = doc.data.basic.location.trim();
  return [name, pos, city].filter(Boolean).join('-');
}

export function applyTailorProposal(
  baseDoc: ResumeDoc,
  proposal: TailorProposal,
  mode: 'new-version' | 'in-place',
): ResumeDoc {
  const next = cloneResumeDoc(baseDoc);
  if (mode === 'new-version') {
    next.id = nid('resume');
    next.name = proposal.versionName?.trim() || `${baseDoc.name}（AI 定制版）`;
  }

  if (
    proposal.recommendedTemplate &&
    (VALID_TEMPLATES as readonly string[]).includes(proposal.recommendedTemplate)
  ) {
    next.meta.template = proposal.recommendedTemplate;
  }
  if (proposal.recommendedTheme && proposal.recommendedTheme in THEMES) {
    next.meta.theme = proposal.recommendedTheme;
  }

  if (proposal.headline?.trim()) {
    next.data.basic.headline = proposal.headline.trim();
  }
  if (proposal.intent) {
    next.data.intent = {
      position: proposal.intent.position || next.data.intent.position,
      city: proposal.intent.city || next.data.intent.city,
      salary: proposal.intent.salary || next.data.intent.salary,
      availability: proposal.intent.availability || next.data.intent.availability,
    };
  }

  if (Array.isArray(proposal.experienceUpdates) && proposal.experienceUpdates.length > 0) {
    const mapById = new Map(proposal.experienceUpdates.map((u) => [u.id, u]));
    next.data.experience = next.data.experience.map((exp, idx) => {
      const matched = mapById.get(exp.id) || proposal.experienceUpdates[idx];
      if (!matched) return exp;
      return {
        ...exp,
        role: matched.role?.trim() || exp.role,
        subtitle: matched.subtitle?.trim() || exp.subtitle,
        bullets:
          Array.isArray(matched.bullets) && matched.bullets.length > 0
            ? matched.bullets.filter((b) => typeof b === 'string' && b.trim())
            : exp.bullets,
      };
    });
  }

  if (Array.isArray(proposal.skills) && proposal.skills.length > 0) {
    next.data.skills = proposal.skills.map((s) => ({
      id: nid('sk'),
      cat: s.cat,
      items: s.items,
    }));
  }
  if (Array.isArray(proposal.tags) && proposal.tags.length > 0) {
    next.data.tags = proposal.tags.filter((t) => typeof t === 'string' && t.trim());
  }
  if (Array.isArray(proposal.evals) && proposal.evals.length > 0) {
    next.data.evals = proposal.evals.map((e) => ({
      id: nid('ev'),
      title: e.title,
      body: e.body,
    }));
  }

  if (proposal.helper) {
    const newHelper: DeliveryHelper = {
      keywords: Array.isArray(proposal.helper.keywords) ? proposal.helper.keywords : [],
      greeting: proposal.helper.greeting || '',
      redFlags: Array.isArray(proposal.helper.redFlags) ? proposal.helper.redFlags : [],
      memos: Array.isArray(proposal.helper.memos)
        ? proposal.helper.memos.map((m) => ({
            id: nid('memo'),
            title: m.title,
            items: Array.isArray(m.items) ? m.items : [],
          }))
        : [],
    };
    next.data.helper = newHelper;
  }

  return next;
}

export function assembleAuditPrompt(promptBody: string, resumeText: string, targetJd?: string): string {
  const parts = [promptBody.trim()];
  if (targetJd && targetJd.trim()) {
    parts.push(`---\n【目标岗位 JD】\n${targetJd.trim()}`);
  }
  parts.push(`---\n【我的简历内容】\n${resumeText.trim()}`);
  parts.push(
    `---\n【输出格式要求（若需直接粘贴回简历工坊渲染卡片，请仅输出以下 JSON）】\n\`\`\`json\n{\n  "overallVerdict": "一句话核心结论",\n  "readinessLevel": "建议精修后投递",\n  "strengths": ["核心优势1", "核心优势2"],\n  "findings": [\n    {\n      "severity": "high",\n      "module": "experience",\n      "title": "问题标题",\n      "issue": "诊断说明",\n      "suggestion": "修改动作建议",\n      "rewriteExample": "可直接替换的原句改写示范"\n    }\n  ]\n}\n\`\`\``,
  );
  return parts.join('\n\n');
}

export function buildTailorPromptForExternalAi(
  doc: ResumeDoc,
  targetRole: string,
  targetJd: string,
  intensity: 'light' | 'deep',
): string {
  const compactResume = {
    basic: {
      name: doc.data.basic.name,
      headline: doc.data.basic.headline,
      location: doc.data.basic.location,
      age: doc.data.basic.age,
      extras: doc.data.basic.extras,
    },
    intent: doc.data.intent,
    education: doc.data.education,
    experience: doc.data.experience,
    skills: doc.data.skills,
    certs: doc.data.certs,
    tags: doc.data.tags,
    evals: doc.data.evals,
  };

  return [
    '你是资深职业转型顾问与简历重构专家。请基于候选人的真实经历，为新目标岗位重构简历并配套生成投递助手包。',
    '红线规则：绝不编造不存在的公司、起止时间、学历或虚假营收数据；experienceUpdates 中的 id 必须与原简历 experience 数组的 id 一一对应；每条 bullet 控制在 30-58 字并用 **双星号** 强调关键动词与真实量化结果。',
    `【重构强度】${intensity === 'deep' ? '深度跨岗重塑' : '精准轻度对齐'}`,
    targetRole.trim() ? `【新目标职位】${targetRole.trim()}` : '',
    targetJd.trim() ? `【目标岗位 JD】\n${targetJd.trim()}` : '',
    `【原简历 JSON】\n${JSON.stringify(compactResume, null, 2)}`,
    `【请严格仅输出以下 JSON 结构（方便直接粘贴回简历工坊一键导入预览）】\n\`\`\`json\n{\n  "versionName": "新版本名称",\n  "strategySummary": "改写策略说明",\n  "fitAssessment": "匹配度判断",\n  "recommendedTemplate": "single-column",\n  "recommendedTheme": "navy-blue",\n  "headline": "新的一句话定位标语",\n  "intent": { "position": "...", "city": "...", "salary": "...", "availability": "..." },\n  "experienceUpdates": [{ "id": "原经历id", "role": "...", "subtitle": "...", "bullets": ["**关键动作**：..."] }],\n  "skills": [{ "cat": "技能分类", "items": "技能列表" }],\n  "tags": ["标签1", "标签2"],\n  "evals": [{ "title": "优势标题", "body": "具体说明" }],\n  "helper": {\n    "keywords": ["搜索词1", "搜索词2"],\n    "greeting": "100-140字 BOSS 直聘首句打招呼语",\n    "redFlags": ["避坑要点1"],\n    "memos": [{ "title": "面试准备清单", "items": ["要点1"] }]\n  }\n}\n\`\`\``,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function extractRawJson(input: string): string {
  // Strip <think>...</think> reasoning traces from DeepSeek-R1 / QwQ / thinking models
  const stripped = input.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) return stripped.slice(start, end + 1);
  return stripped;
}

export function parseExternalTailorJson(raw: string): TailorProposal {
  const cleaned = extractRawJson(raw);
  const parsed = JSON.parse(cleaned) as Partial<TailorProposal>;
  if (!parsed || typeof parsed !== 'object' || (!parsed.headline && !parsed.experienceUpdates)) {
    throw new Error('JSON 中缺少核心字段（如 headline 或 experienceUpdates），请确认复制了完整 JSON。');
  }
  return {
    versionName: parsed.versionName || '外部 AI 定制版',
    strategySummary: parsed.strategySummary || '由外部大模型生成的岗位定制方案。',
    fitAssessment: parsed.fitAssessment || '已解析外部 AI 定制方案',
    recommendedTemplate: parsed.recommendedTemplate || 'single-column',
    recommendedTheme: parsed.recommendedTheme || 'navy-blue',
    headline: parsed.headline || '',
    intent: {
      position: parsed.intent?.position || '',
      city: parsed.intent?.city || '',
      salary: parsed.intent?.salary || '',
      availability: parsed.intent?.availability || '',
    },
    experienceUpdates: Array.isArray(parsed.experienceUpdates) ? parsed.experienceUpdates : [],
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    evals: Array.isArray(parsed.evals) ? parsed.evals : [],
    helper: {
      keywords: Array.isArray(parsed.helper?.keywords) ? parsed.helper!.keywords : [],
      greeting: parsed.helper?.greeting || '',
      redFlags: Array.isArray(parsed.helper?.redFlags) ? parsed.helper!.redFlags : [],
      memos: Array.isArray(parsed.helper?.memos) ? parsed.helper!.memos : [],
    },
  };
}

export function parseExternalAuditJson(raw: string): import('../types/resume').AiAuditReport {
  const cleaned = extractRawJson(raw);
  const parsed = JSON.parse(cleaned) as Partial<import('../types/resume').AiAuditReport>;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.findings)) {
    throw new Error('JSON 中缺少 findings 数组，请使用「复制完整 Prompt」让外部 AI 按 JSON 格式输出。');
  }
  return {
    overallVerdict: parsed.overallVerdict || '已完成外部 AI 体检报告导入。',
    readinessLevel: parsed.readinessLevel || '建议精修后投递',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    findings: parsed.findings.map((f) => ({
      severity: f.severity === 'high' || f.severity === 'low' ? f.severity : 'medium',
      module: f.module || 'experience',
      title: f.title || '待优化项',
      issue: f.issue || '',
      suggestion: f.suggestion || '',
      rewriteExample: f.rewriteExample || '',
    })),
  };
}

export function maskPhone(phone: string): string {
  const clean = phone.trim();
  if (clean.length >= 7) {
    return `${clean.slice(0, 3)}****${clean.slice(-4)}`;
  }
  return clean ? '138****0000' : '';
}

export function maskEmail(email: string): string {
  const clean = email.trim();
  const at = clean.indexOf('@');
  if (at > 2) {
    return `${clean.slice(0, 2)}***${clean.slice(at)}`;
  }
  return clean ? '***@example.com' : '';
}

export function wrapTextWithBold(
  text: string,
  selStart: number,
  selEnd: number,
): string {
  if (selEnd > selStart) {
    const selected = text.slice(selStart, selEnd);
    const wrapped = selected.startsWith('**') && selected.endsWith('**')
      ? selected.slice(2, -2)
      : `**${selected}**`;
    return `${text.slice(0, selStart)}${wrapped}${text.slice(selEnd)}`;
  }
  return text ? `${text} **重点成果**` : '**核心动作**：简述具体方法与落地结果。';
}

export function applyTemplateStyleOnly(
  currentDoc: ResumeDoc,
  templateDoc: ResumeDoc,
): ResumeDoc {
  const next = cloneResumeDoc(currentDoc);
  next.meta = {
    ...next.meta,
    template: templateDoc.meta.template,
    theme: templateDoc.meta.theme,
    customColor: templateDoc.meta.customColor,
    fs: templateDoc.meta.fs,
    fw: resolveBaseFontWeight(templateDoc.meta.fw),
    lh: resolveLineHeight(templateDoc.meta.lh),
    pad: templateDoc.meta.pad,
    sidebarStyle: templateDoc.meta.sidebarStyle,
    kpiStyle: templateDoc.meta.kpiStyle,
    fontStyle: templateDoc.meta.fontStyle,
    headerStyle: templateDoc.meta.headerStyle,
    sectionStyle: templateDoc.meta.sectionStyle,
    printSafe: templateDoc.meta.printSafe,
  };
  return next;
}

export function clearPlaceholderContent(doc: ResumeDoc): ResumeDoc {
  const next = cloneResumeDoc(doc);
  next.data = {
    ...emptyData(),
    basic: {
      ...emptyData().basic,
      name: '你的姓名',
      headline: '一句话职业定位 | 核心背景 · 2 项最强优势',
      phone: '',
      email: '',
      location: '',
      age: '',
      photo: '',
      extras: [],
    },
    experience: [
      {
        id: nid('exp'),
        company: '填写公司 / 学校 / 机构名称',
        role: '担任职位 / 角色',
        period: '2024.01 - 至今',
        subtitle: '',
        kpis: [],
        bullets: ['**核心事项**：描述你的关键行动、专业方法与实际成果。'],
      },
    ],
    education: [
      {
        id: nid('edu'),
        school: '毕业院校',
        major: '所学专业',
        degree: '本科 / 硕士',
        period: '2020.09 - 2024.06',
        desc: '',
      },
    ],
    skills: [
      { id: nid('sk'), cat: '专业能力', items: '填写核心专业技能、工具或语言水平' },
    ],
  };
  return next;
}

export function formatMarkdown(doc: ResumeDoc): string {
  const d = doc.data;
  const m = doc.meta;
  const lines: string[] = [];

  lines.push(`# ${d.basic.name || '未命名简历'}`);
  if (d.basic.headline) lines.push(`> ${d.basic.headline}`);
  const contacts = getContactList(d).map((c) => `**${c.label}**：${c.value}`);
  if (contacts.length) lines.push(contacts.join(' · '));
  lines.push('');

  for (const key of m.order) {
    if (!isShown(m, key)) continue;
    if (key === 'intent') {
      const items = [
        d.intent.position && `- **目标岗位**：${d.intent.position}`,
        d.intent.city && `- **意向城市**：${d.intent.city}`,
        d.intent.salary && `- **期望薪资**：${d.intent.salary}`,
        d.intent.availability && `- **到岗时间**：${d.intent.availability}`,
      ].filter(Boolean) as string[];
      if (items.length) {
        lines.push(`## ${secTitle(m, 'intent')}`, ...items, '');
      }
    } else if (key === 'experience' && d.experience.length) {
      lines.push(`## ${secTitle(m, 'experience')}`);
      for (const exp of d.experience) {
        lines.push(`### ${exp.company} — ${exp.role} (${exp.period})`);
        if (exp.subtitle) lines.push(`*${exp.subtitle}*`);
        const kpis = expKpisOf(exp.kpis);
        if (kpis.length) {
          lines.push(`- **关键亮点**：${kpis.map((k) => `${k.num} ${k.label}`).join(' | ')}`);
        }
        for (const b of exp.bullets) {
          if (b.trim()) lines.push(`- ${b.trim()}`);
        }
        lines.push('');
      }
    } else if (key === 'skills' && d.skills.length) {
      lines.push(`## ${secTitle(m, 'skills')}`);
      for (const sk of d.skills) {
        lines.push(`- **${sk.cat}**：${sk.items}`);
      }
      lines.push('');
    } else if (key === 'education' && d.education.length) {
      lines.push(`## ${secTitle(m, 'education')}`);
      for (const edu of d.education) {
        lines.push(`### ${edu.school} — ${edu.major} · ${edu.degree} (${edu.period})`);
        if (edu.desc) lines.push(edu.desc);
        lines.push('');
      }
    } else if (key === 'certs' && d.certs.length) {
      lines.push(`## ${secTitle(m, 'certs')}`);
      for (const c of d.certs.filter(Boolean)) lines.push(`- ${c}`);
      lines.push('');
    } else if (key === 'tags' && d.tags.length) {
      lines.push(`## ${secTitle(m, 'tags')}`);
      lines.push(d.tags.filter(Boolean).map((t) => `\`${t}\``).join(' '));
      lines.push('');
    } else if (key === 'evals' && d.evals.length) {
      lines.push(`## ${secTitle(m, 'evals')}`);
      for (const ev of d.evals) {
        lines.push(`- **${ev.title}**：${ev.body}`);
      }
      lines.push('');
    } else if (key.startsWith('custom:')) {
      const cm = d.custom.find((c) => c.id === key.slice(7));
      if (cm && cm.show && customHasContent(cm)) {
        lines.push(`## ${cm.title}`);
        if (cm.kind === 'tags') {
          lines.push((cm.items as string[]).filter(Boolean).map((t) => `\`${t}\``).join(' '));
        } else if (cm.kind === 'bullets' || cm.kind === 'text') {
          for (const it of cm.items as string[]) {
            if (it?.trim()) lines.push(`- ${it.trim()}`);
          }
        } else if (cm.kind === 'titled') {
          for (const it of cm.items as TitledItem[]) {
            if (it.title || it.body) lines.push(`- **${it.title}**：${it.body}`);
          }
        } else if (cm.kind === 'cases') {
          for (const it of cm.items as CaseItem[]) {
            lines.push(`### ${it.title}`);
            if (it.bg) lines.push(`- **背景**：${it.bg}`);
            if (it.action) lines.push(`- **行动**：${it.action}`);
            if (it.result) lines.push(`- **成果**：${it.result}`);
            if (it.evidence) lines.push(`- **佐证**：${it.evidence}`);
          }
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function richToHtml(text: string): string {
  return richSegs(text)
    .map((seg) =>
      seg.bold ? `<strong>${escapeHtml(seg.text)}</strong>` : escapeHtml(seg.text),
    )
    .join('');
}

/**
 * Generates a Word/WPS-compatible HTML .doc file with clean print-safe A4 styling.
 */
export function formatWordHtml(doc: ResumeDoc): string {
  const d = doc.data;
  const m = doc.meta;
  const palette = resolvePalette(m.theme, m.customColor);
  const fontFamily =
    m.fontStyle === 'classic'
      ? '"SimSun", "Songti SC", "Noto Serif SC", serif'
      : '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
  const contacts = getContactList(d)
    .map((c) => `${escapeHtml(c.label)}：${escapeHtml(c.value)}`)
    .join(' &nbsp;|&nbsp; ');

  const sections: string[] = [];

  for (const key of m.order) {
    if (!isShown(m, key)) continue;
    const heading = `<h2 style="font-size:12pt;color:${palette.primary};border-bottom:1.5pt solid ${palette.line};padding-bottom:3pt;margin:12pt 0 6pt 0;">${escapeHtml(secTitle(m, key))}</h2>`;

    if (key === 'intent') {
      const parts = [
        d.intent.position && `<strong>目标岗位：</strong>${escapeHtml(d.intent.position)}`,
        d.intent.city && `<strong>意向城市：</strong>${escapeHtml(d.intent.city)}`,
        d.intent.salary && `<strong>期望薪资：</strong>${escapeHtml(d.intent.salary)}`,
        d.intent.availability && `<strong>到岗时间：</strong>${escapeHtml(d.intent.availability)}`,
      ].filter(Boolean);
      if (parts.length) {
        sections.push(`${heading}<p style="margin:0;font-size:10pt;">${parts.join(' &nbsp;&nbsp; ')}</p>`);
      }
    } else if (key === 'experience' && d.experience.length) {
      const blocks = d.experience.map((exp) => {
        const kpis = expKpisOf(exp.kpis);
        const kpiLine = kpis.length
          ? `<p style="margin:3pt 0;font-size:9.5pt;color:${palette.primary};">${kpis.map((k) => `<strong>${escapeHtml(k.num)}</strong> ${escapeHtml(k.label)}`).join(' &nbsp;|&nbsp; ')}</p>`
          : '';
        const bullets = exp.bullets
          .filter((b) => b.trim())
          .map((b) => `<li style="margin:2pt 0;">${richToHtml(b.trim())}</li>`)
          .join('');
        return `<div style="margin-bottom:8pt;">
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="font-weight:bold;font-size:10.5pt;color:#0f172a;">${escapeHtml(exp.company)} <span style="color:${palette.accent};font-weight:600;">${escapeHtml(exp.role)}</span></td>
              <td align="right" style="font-size:9.5pt;color:#64748b;white-space:nowrap;">${escapeHtml(exp.period)}</td>
            </tr>
          </table>
          ${exp.subtitle ? `<p style="margin:2pt 0;font-size:9.5pt;color:#475569;">${escapeHtml(exp.subtitle)}</p>` : ''}
          ${kpiLine}
          ${bullets ? `<ul style="margin:3pt 0 0 16pt;padding:0;font-size:10pt;">${bullets}</ul>` : ''}
        </div>`;
      });
      sections.push(`${heading}${blocks.join('')}`);
    } else if (key === 'education' && d.education.length) {
      const blocks = d.education.map(
        (edu) => `<div style="margin-bottom:6pt;">
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="font-weight:bold;font-size:10.5pt;">${escapeHtml(edu.school)} <span style="font-weight:normal;color:#475569;">${escapeHtml(edu.major)} · ${escapeHtml(edu.degree)}</span></td>
              <td align="right" style="font-size:9.5pt;color:#64748b;white-space:nowrap;">${escapeHtml(edu.period)}</td>
            </tr>
          </table>
          ${edu.desc ? `<p style="margin:2pt 0;font-size:9.5pt;color:#475569;">${escapeHtml(edu.desc)}</p>` : ''}
        </div>`,
      );
      sections.push(`${heading}${blocks.join('')}`);
    } else if (key === 'skills' && d.skills.length) {
      const rows = d.skills
        .map(
          (sk) =>
            `<p style="margin:2.5pt 0;font-size:10pt;"><strong style="color:${palette.primary};">${escapeHtml(sk.cat)}：</strong>${escapeHtml(sk.items)}</p>`,
        )
        .join('');
      sections.push(`${heading}${rows}`);
    } else if (key === 'certs' && d.certs.length) {
      const items = d.certs
        .filter(Boolean)
        .map((c) => `<li style="margin:2pt 0;">${escapeHtml(c)}</li>`)
        .join('');
      sections.push(`${heading}<ul style="margin:2pt 0 0 16pt;padding:0;font-size:10pt;">${items}</ul>`);
    } else if (key === 'tags' && d.tags.length) {
      sections.push(
        `${heading}<p style="margin:0;font-size:10pt;">${d.tags.filter(Boolean).map(escapeHtml).join(' &nbsp;·&nbsp; ')}</p>`,
      );
    } else if (key === 'evals' && d.evals.length) {
      const rows = d.evals
        .map(
          (ev) =>
            `<p style="margin:2.5pt 0;font-size:10pt;"><strong style="color:${palette.primary};">${escapeHtml(ev.title)}：</strong>${escapeHtml(ev.body)}</p>`,
        )
        .join('');
      sections.push(`${heading}${rows}`);
    } else if (key.startsWith('custom:')) {
      const cm = d.custom.find((c) => c.id === key.slice(7));
      if (cm && cm.show && customHasContent(cm)) {
        const cmHead = `<h2 style="font-size:12pt;color:${palette.primary};border-bottom:1.5pt solid ${palette.line};padding-bottom:3pt;margin:12pt 0 6pt 0;">${escapeHtml(cm.title)}</h2>`;
        if (cm.kind === 'tags') {
          sections.push(
            `${cmHead}<p style="margin:0;font-size:10pt;">${(cm.items as string[]).filter(Boolean).map(escapeHtml).join(' &nbsp;·&nbsp; ')}</p>`,
          );
        } else if (cm.kind === 'bullets' || cm.kind === 'text') {
          const items = (cm.items as string[])
            .filter((x) => x?.trim())
            .map((x) => `<li style="margin:2pt 0;">${richToHtml(x.trim())}</li>`)
            .join('');
          sections.push(`${cmHead}<ul style="margin:2pt 0 0 16pt;padding:0;font-size:10pt;">${items}</ul>`);
        } else if (cm.kind === 'titled') {
          const rows = (cm.items as TitledItem[])
            .filter((x) => x.title || x.body)
            .map(
              (x) =>
                `<p style="margin:3pt 0;font-size:10pt;"><strong>${escapeHtml(x.title)}：</strong>${escapeHtml(x.body)}</p>`,
            )
            .join('');
          sections.push(`${cmHead}${rows}`);
        } else if (cm.kind === 'cases') {
          const rows = (cm.items as CaseItem[])
            .map(
              (x) => `<div style="margin-bottom:6pt;font-size:10pt;">
                <p style="margin:0;font-weight:bold;">${escapeHtml(x.title)}</p>
                ${x.bg ? `<p style="margin:1.5pt 0;">背景：${escapeHtml(x.bg)}</p>` : ''}
                ${x.action ? `<p style="margin:1.5pt 0;">行动：${escapeHtml(x.action)}</p>` : ''}
                ${x.result ? `<p style="margin:1.5pt 0;"><strong>成果：</strong>${escapeHtml(x.result)}</p>` : ''}
                ${x.evidence ? `<p style="margin:1.5pt 0;color:#475569;">佐证：${escapeHtml(x.evidence)}</p>` : ''}
              </div>`,
            )
            .join('');
          sections.push(`${cmHead}${rows}`);
        }
      }
    }
  }

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(buildPdfTitle(doc))}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  body { font-family: ${fontFamily}; color: #1e293b; line-height: 1.5; margin: 0; }
</style>
</head>
<body>
  <div style="border-bottom:2pt solid ${palette.primary};padding-bottom:8pt;margin-bottom:10pt;">
    <h1 style="margin:0;font-size:20pt;color:${palette.primary};">${escapeHtml(d.basic.name || '个人简历')}</h1>
    ${d.basic.headline ? `<p style="margin:4pt 0 0 0;font-size:10.5pt;color:${palette.accent};font-weight:600;">${escapeHtml(d.basic.headline)}</p>` : ''}
    ${contacts ? `<p style="margin:5pt 0 0 0;font-size:9.5pt;color:#475569;">${contacts}</p>` : ''}
  </div>
  ${sections.join('\n')}
</body>
</html>`;
}

export function isLocalEndpointUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal)(:\d+)?(\/|$)/i.test(
    (url || '').trim(),
  );
}

/**
 * Computes the exact chat/messages endpoint URL that the server proxy will invoke,
 * helping users confirm whether their Base URL needs `/v1` or not.
 */
export function buildAiEndpointPreview(protocol: CustomAiProtocol, rawBaseUrl: string): string {
  const clean = (rawBaseUrl || '').trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (protocol === 'anthropic') {
    if (/\/v1\/messages$/i.test(clean)) return clean;
    if (/\/v1$/i.test(clean)) return `${clean}/messages`;
    return `${clean}/v1/messages`;
  }
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v\d+$/i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

const HOSTNAME_DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const PLACEHOLDER_KEY_RE = /^(?:sk-\.{2,}|sk-xxx+|your[_-]?api[_-]?key|api[_-]?key|replace[_-]?me)$/i;

/**
 * Validates and normalizes a CustomAiConfig before persisting to localStorage
 * and promoting it as the active default AI request configuration.
 */
export function validateCustomAiConfig(
  cfg: Partial<CustomAiConfig> | null | undefined,
): AiConfigValidationResult {
  const protocol: CustomAiProtocol = cfg?.protocol === 'anthropic' ? 'anthropic' : 'openai';
  const rawBaseUrl = typeof cfg?.baseUrl === 'string' ? cfg.baseUrl : '';
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  const apiKey = (typeof cfg?.apiKey === 'string' ? cfg.apiKey : '').trim();
  // Strip invisible zero-width chars so whitespace-only / invisible Model IDs are caught cleanly
  const model = (typeof cfg?.model === 'string' ? cfg.model : '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  const fetchedModels = Array.isArray(cfg?.fetchedModels)
    ? Array.from(new Set(cfg.fetchedModels.map((m) => String(m || '').trim()).filter(Boolean)))
    : [];
  const existingSaved = Array.isArray(cfg?.savedModels)
    ? cfg.savedModels.map((m) => String(m || '').trim()).filter(Boolean)
    : [];
  const savedModels = Array.from(
    new Set([...(model ? [model] : []), ...existingSaved]),
  ).slice(0, 8);

  const errors: AiConfigValidationErrors = {};
  const isLocal = isLocalEndpointUrl(baseUrl);

  // 1. Strict Base URL format validation (must conform to https:// or http:// with a valid host)
  if (!baseUrl) {
    errors.baseUrl = 'Base URL 不能为空，请填写以 https:// 或 http:// 开头的接口地址（如 https://api.deepseek.com/v1）。';
  } else if (/\s/.test(baseUrl)) {
    errors.baseUrl = 'Base URL 格式错误：地址中不能包含空格或换行符。';
  } else if (!/^https?:\/\//i.test(baseUrl)) {
    errors.baseUrl = 'Base URL 格式错误：必须以 https:// 或 http:// 开头（例如 https://api.deepseek.com/v1）。';
  } else {
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      parsedUrl = null;
    }

    if (!parsedUrl || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
      errors.baseUrl = 'Base URL 格式无效，请检查是否符合标准的 https:// 或 http:// URL 规范。';
    } else if (!parsedUrl.hostname) {
      errors.baseUrl = 'Base URL 缺少有效主机域名，请填写完整地址（例如 https://api.deepseek.com/v1）。';
    } else if (
      /^https?:\/\/(169\.254\.\d+\.\d+|\[?fe80:|metadata\.google\.internal|metadata\.goog)/i.test(
        baseUrl,
      )
    ) {
      errors.baseUrl = '安全拦截：不允许填写链路本地或云元数据地址，请改用公网接口或本地 localhost。';
    } else {
      const host = parsedUrl.hostname.replace(/^\[|\]$/g, '');
      const validIp = IPV4_RE.test(host) && host.split('.').every((n) => Number(n) >= 0 && Number(n) <= 255);
      const validIpv6 = parsedUrl.hostname.startsWith('[') && parsedUrl.hostname.endsWith(']');
      const validDomain = HOSTNAME_DOMAIN_RE.test(host);
      if (!isLocal && !validDomain && !validIp && !validIpv6) {
        errors.baseUrl = 'Base URL 域名格式无效，请确认填写了完整域名或 IP（如 https://api.deepseek.com/v1）。';
      }
    }
  }

  // 2. API Key format validation (keyless allowed only for verified local endpoints like Ollama)
  if (!isLocal) {
    if (!apiKey) {
      errors.apiKey = '远程接口必须填写 API Key（本地 Ollama 如 http://localhost:11434/v1 可留空）。';
    } else if (/^bearer\s+/i.test(apiKey)) {
      errors.apiKey = 'API Key 格式错误：无需包含 "Bearer " 前缀，请直接粘贴密钥本体（如 sk-...）。';
    } else if (/\s/.test(apiKey)) {
      errors.apiKey = 'API Key 格式错误：不能包含空格或换行符，请检查是否多复制了字符。';
    } else if (/[^\x21-\x7E]/.test(apiKey)) {
      errors.apiKey = 'API Key 格式错误：包含中文或不可见字符，请核对是否误粘贴了说明文字。';
    } else if (apiKey.length < 8 || PLACEHOLDER_KEY_RE.test(apiKey)) {
      errors.apiKey = 'API Key 格式错误：密钥长度过短或为占位示例，请粘贴完整的真实 API Key。';
    }
  } else if (apiKey) {
    if (/^bearer\s+/i.test(apiKey)) {
      errors.apiKey = 'API Key 格式错误：无需包含 "Bearer " 前缀。';
    } else if (/\s/.test(apiKey) || /[^\x21-\x7E]/.test(apiKey)) {
      errors.apiKey = 'API Key 格式错误：不能包含空格、换行或非 ASCII 字符。';
    }
  }

  // 3. Model ID emptiness & format validation
  if (!model) {
    errors.model = 'Model ID 不能为空：请填写具体模型标识（如 deepseek-chat / gpt-4o-mini），或点击「测试并获取模型」拉取后选择。';
  } else if (/\s/.test(model)) {
    errors.model = 'Model ID 格式错误：不能包含空格或换行符，请填写标准的英文模型 ID（如 deepseek-chat）。';
  } else if (/[^\x21-\x7E]/.test(model)) {
    errors.model = 'Model ID 格式错误：包含中文或非法字符，请填写接口对应的英文 Model ID（如 deepseek-chat）。';
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    isLocal,
    errors,
    normalized: {
      enabled: valid ? (cfg?.enabled ?? true) : false,
      protocol,
      baseUrl,
      apiKey,
      model,
      fetchedModels,
      savedModels,
      lastVerifiedAt: typeof cfg?.lastVerifiedAt === 'string' ? cfg.lastVerifiedAt : undefined,
    },
  };
}

/**
 * Formats field-level AI config validation errors into one concise, specific user-facing message.
 */
export function summarizeAiConfigErrors(errors: AiConfigValidationErrors): string {
  const details = [errors.baseUrl, errors.apiKey, errors.model].filter(
    (msg): msg is string => Boolean(msg && msg.trim()),
  );
  if (details.length === 0) return '配置校验失败，请检查 Base URL、API Key 与 Model ID。';
  if (details.length === 1) return `配置失败：${details[0]}`;
  return `配置失败（共 ${details.length} 项错误）：${details.join(' ')}`;
}

/**
 * Translates raw fetch / proxy / HTTP errors into concrete, actionable Chinese diagnostics
 * (e.g., network unreachable, DNS failure, timeout, invalid API Key format, wrong path).
 */
export function classifyAiNetworkError(rawMessage: string, status?: number): string {
  const msg = (rawMessage || '').trim();
  const lower = msg.toLowerCase();

  if (
    status === 401 ||
    lower.includes('401') ||
    lower.includes('invalid_api_key') ||
    lower.includes('incorrect api key') ||
    lower.includes('authentication_error') ||
    lower.includes('unauthorized')
  ) {
    return 'API Key 鉴权失败（401）：密钥格式错误、已失效或与所选协议不匹配，请核对 API Key。';
  }
  if (status === 403 || lower.includes('403') || lower.includes('forbidden')) {
    return '接口拒绝访问（403）：API Key 权限不足、账号受限或地区/IP 被拦截。';
  }
  if (status === 404 || lower.includes('404')) {
    return '接口地址或模型不存在（404）：请检查 Base URL 是否缺少/多写了 /v1，或确认该服务商支持当前 Model ID。';
  }
  if (status === 429 || lower.includes('429') || lower.includes('rate limit') || lower.includes('insufficient_quota')) {
    return '请求频率超限或余额不足（429）：请检查服务商账户余额与限流配额后重试。';
  }
  if (lower.includes('enotfound') || lower.includes('eai_again') || lower.includes('getaddrinfo')) {
    return '网络不可达（域名无法解析）：请检查 Base URL 域名拼写是否正确，或确认当前网络可访问该服务商。';
  }
  if (lower.includes('econnrefused')) {
    return '网络不可达（连接被拒绝）：目标主机未响应端口；如使用本地 Ollama，请确认本地服务已启动。';
  }
  if (
    status === 504 ||
    lower.includes('etimedout') ||
    lower.includes('timeout') ||
    lower.includes('aborted')
  ) {
    return '网络连接超时：目标接口或中转站长时间无响应，请检查网络连通性或稍后重试。';
  }
  if (lower.includes('cert') || lower.includes('ssl') || lower.includes('tls')) {
    return 'HTTPS/SSL 证书校验失败：目标站点证书无效或过期，请核对 Base URL 协议与地址。';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('enetunreach') ||
    lower.includes('ehostunreach') ||
    lower.includes('econnreset')
  ) {
    return '网络不可达或连接中断：无法连接到目标接口，请检查 Base URL 是否可访问、网络代理或防火墙设置。';
  }
  return msg || '接口配置或连接失败，请检查 Base URL、API Key 与网络状态。';
}

/**
 * Checks whether a browser-local BYOK CustomAiConfig is validated and ready to call the proxy.
 */
export function isCustomAiReady(cfg: CustomAiConfig | null | undefined): boolean {
  if (!cfg || !cfg.enabled) return false;
  return validateCustomAiConfig(cfg).valid;
}

export function toCustomAiPayload(
  cfg: CustomAiConfig | null | undefined,
): CustomAiRequestPayload | undefined {
  if (!cfg || !cfg.enabled) return undefined;
  const check = validateCustomAiConfig(cfg);
  if (!check.valid) return undefined;
  return {
    protocol: check.normalized.protocol,
    baseUrl: check.normalized.baseUrl,
    apiKey: check.normalized.apiKey,
    model: check.normalized.model,
  };
}

export function buildAiRequestDefaults(
  cfg: CustomAiConfig | null | undefined,
  selectedProvider: AiProviderId,
): { provider: AiProviderId; customConfig?: CustomAiRequestPayload } {
  const customPayload = toCustomAiPayload(cfg);
  return {
    provider: selectedProvider,
    customConfig: customPayload,
  };
}

/**
 * Counts meaningful non-whitespace characters across the rendered resume
 * (helpful for keeping 1-page resumes in the recruiter-friendly 450-900 char sweet spot).
 */
export function countResumeChars(doc: ResumeDoc): number {
  const plain = formatPlainText(doc);
  return plain.replace(/\s+/g, '').length;
}

const WEAK_OPENER_RE = /^(?:主要)?(?:负责|协助|参与|帮忙|做过|处理日常|配合完成)/;

/**
 * Pure offline weak-verb detector for experience bullets.
 */
export function detectWeakBulletOpener(bullet: string): string | null {
  const plain = stripBold(bullet || '').trim();
  if (plain.length < 8) return null;
  const m = plain.match(WEAK_OPENER_RE);
  if (!m) return null;
  return `开头「${m[0]}」偏弱，建议改用「主导/搭建/推进/优化/交付」或点「AI 润色」`;
}

export const ENGLISH_SECTION_TITLES: Record<string, string> = {
  intent: 'CAREER OBJECTIVE',
  experience: 'EXPERIENCE',
  skills: 'SKILLS',
  education: 'EDUCATION',
  certs: 'CERTIFICATIONS',
  tags: 'HIGHLIGHTS',
  evals: 'SUMMARY',
};

/**
 * Toggles all standard section headings between Chinese defaults and clean English headings
 * (ideal for foreign enterprises, overseas trade, game publishing, and bilingual applications).
 */
export function applySectionLanguage(meta: ResumeMeta, lang: 'zh' | 'en'): void {
  if (lang === 'en') {
    meta.titles = { ...meta.titles, ...ENGLISH_SECTION_TITLES };
  } else {
    const next = { ...meta.titles };
    for (const k of Object.keys(ENGLISH_SECTION_TITLES)) {
      if (next[k] === ENGLISH_SECTION_TITLES[k]) {
        delete next[k];
      }
    }
    meta.titles = next;
  }
}

/**
 * Pure offline raw-text resume importer (works with zero AI / API key).
 * Extracts name, phone, email, city, education, skills, and experience lines
 * from messy text copied out of an old Word/PDF resume.
 */
export function parsePlainTextResumeLocal(rawText: string): ResumeDoc {
  const lines = (rawText || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const joined = lines.join('\n');
  const phoneMatch = joined.match(/1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}/);
  const emailMatch = joined.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  const cityMatch = joined.match(
    /(?:现居|城市|坐标|地址)[：:\s]*([^\s，,；;|/]{2,8})|(北京|上海|广州|深圳|杭州|苏州|成都|南京|武汉|西安|重庆|厦门|宁波|无锡|合肥|长沙)/,
  );
  const ageMatch = joined.match(/(\d{2})\s*岁/);

  // Heuristic for name: first short clean line that isn't a heading or contact
  let name = '';
  for (const line of lines.slice(0, 6)) {
    const cleaned = line.replace(/^(姓名[：:\s]*)/, '').trim();
    if (
      cleaned.length >= 2 &&
      cleaned.length <= 12 &&
      !/个人简历|简历|求职|电话|邮箱|手机|@|\d{5}/.test(cleaned)
    ) {
      name = cleaned;
      break;
    }
  }

  // Bucket lines into sections when headings appear
  let currentSec: 'head' | 'intent' | 'edu' | 'exp' | 'skill' | 'cert' | 'eval' = 'head';
  const buckets: Record<string, string[]> = {
    head: [],
    intent: [],
    edu: [],
    exp: [],
    skill: [],
    cert: [],
    eval: [],
  };

  for (const line of lines) {
    if (/^(?:求职意向|期望岗位|意向岗位)/.test(line) && line.length <= 14) {
      currentSec = 'intent';
      continue;
    }
    if (/^(?:教育背景|教育经历|学历背景|EDUCATION)/i.test(line) && line.length <= 16) {
      currentSec = 'edu';
      continue;
    }
    if (/^(?:工作经历|工作经验|实习经历|项目经历|实践经历|EXPERIENCE)/i.test(line) && line.length <= 16) {
      currentSec = 'exp';
      continue;
    }
    if (/^(?:专业技能|技能特长|技术栈|个人技能|SKILLS)/i.test(line) && line.length <= 16) {
      currentSec = 'skill';
      continue;
    }
    if (/^(?:资格证书|资质证书|荣誉奖项|证书|CERTIFICATIONS)/i.test(line) && line.length <= 16) {
      currentSec = 'cert';
      continue;
    }
    if (/^(?:自我评价|个人总结|个人优势|SUMMARY)/i.test(line) && line.length <= 16) {
      currentSec = 'eval';
      continue;
    }
    buckets[currentSec].push(line);
  }

  const intentPosMatch = joined.match(/(?:求职意向|目标岗位|期望职位|应聘岗位)[：:\s]*([^\n|；;]{2,28})/);
  const data = emptyData();
  data.basic.name = name || '未命名候选人';
  data.basic.phone = phoneMatch ? phoneMatch[0].replace(/[\s-]/g, '') : '';
  data.basic.email = emailMatch ? emailMatch[0] : '';
  data.basic.location = cityMatch ? cityMatch[1] || cityMatch[2] || '' : '';
  data.basic.age = ageMatch ? `${ageMatch[1]} 岁` : '';
  data.basic.headline =
    intentPosMatch?.[1]?.trim() ||
    buckets.head.find((l) => l !== name && l.length >= 6 && l.length <= 42 && !/@|1[3-9]\d{9}/.test(l)) ||
    '';

  data.intent.position = intentPosMatch?.[1]?.trim() || '';
  data.intent.city = data.basic.location;

  if (buckets.edu.length > 0) {
    const eduLine = buckets.edu[0];
    const periodM = eduLine.match(/(\d{4}[./-]\d{1,2}\s*[-~—至]+\s*(?:\d{4}[./-]\d{1,2}|至今))/);
    const schoolM = eduLine.match(/([\u4e00-\u9fa5]{2,16}(?:大学|学院|学校))/);
    data.education = [
      {
        id: nid('edu'),
        school: schoolM ? schoolM[1] : eduLine.slice(0, 20),
        major: '',
        degree: /硕士|研究生/.test(eduLine) ? '硕士' : /博士/.test(eduLine) ? '博士' : /大专|专科/.test(eduLine) ? '专科' : '本科',
        period: periodM ? periodM[1] : '',
        desc: buckets.edu.slice(1).join('；'),
      },
    ];
  }

  if (buckets.exp.length > 0) {
    const expLines = buckets.exp.map((l) => l.replace(/^[•·\-—\d.、\s]+/, '').trim()).filter(Boolean);
    const firstLine = expLines[0] || '';
    const periodM = firstLine.match(/(\d{4}[./-]\d{1,2}\s*[-~—至]+\s*(?:\d{4}[./-]\d{1,2}|至今))/);
    data.experience = [
      {
        id: nid('exp'),
        company: firstLine.replace(periodM?.[0] || '', '').trim().slice(0, 26) || '导入经历（请核对公司与职位）',
        role: data.intent.position || '',
        period: periodM ? periodM[1] : '',
        subtitle: '',
        bullets: expLines.length > 1 ? expLines.slice(1, 8) : expLines,
      },
    ];
  } else {
    // Fallback: put long body lines as editable bullets so zero text is lost
    const bodyLines = lines
      .filter((l) => l.length >= 12 && l !== name && !/@/.test(l))
      .slice(0, 8)
      .map((l) => l.replace(/^[•·\-—\d.、\s]+/, '').trim());
    if (bodyLines.length > 0) {
      data.experience = [
        {
          id: nid('exp'),
          company: '导入经历（请按需拆分与补充公司名）',
          role: data.intent.position || '',
          period: '',
          subtitle: '',
          bullets: bodyLines,
        },
      ];
    }
  }

  if (buckets.skill.length > 0) {
    data.skills = buckets.skill.slice(0, 6).map((line) => {
      const colonIdx = line.search(/[：:]/);
      if (colonIdx > 0 && colonIdx <= 12) {
        return {
          id: nid('sk'),
          cat: line.slice(0, colonIdx).replace(/^[•·\-—\s]+/, ''),
          items: line.slice(colonIdx + 1).trim(),
        };
      }
      return { id: nid('sk'), cat: '专业技能', items: line.replace(/^[•·\-—\s]+/, '') };
    });
  }

  if (buckets.cert.length > 0) {
    data.certs = buckets.cert.map((l) => l.replace(/^[•·\-—\s]+/, '')).slice(0, 8);
  }

  if (buckets.eval.length > 0) {
    data.evals = [
      {
        id: nid('ev'),
        title: '个人总结',
        body: buckets.eval.join(' '),
      },
    ];
  }

  return {
    id: nid('resume'),
    name: `${data.basic.name} · 文本导入版`,
    meta: normalizeMeta({ template: 'single-column', theme: 'navy-blue' }),
    data,
  };
}

/**
 * Merges imported JSON resume(s) safely:
 * - Importing a single resume (e.g. from "导出当前单份 JSON") appends it non-destructively
 *   with a collision-free ID so existing user resumes are NEVER wiped.
 * - Importing a multi-resume backup normalizes IDs and restores the backup cleanly.
 */
export function normalizeLineage(raw?: Partial<ResumeVersionLineage> | null): ResumeVersionLineage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const parentId = typeof raw.parentId === 'string' ? raw.parentId.trim() : '';
  const parentName = typeof raw.parentName === 'string' ? raw.parentName.trim() : '';
  const parentPosition = typeof raw.parentPosition === 'string' ? raw.parentPosition.trim() : '';
  if (!parentId && !parentName && !parentPosition) return undefined;
  return {
    parentId,
    parentName: parentName || '原版本',
    parentPosition: parentPosition || '未填写职位',
    targetRole:
      typeof raw.targetRole === 'string' && raw.targetRole.trim()
        ? raw.targetRole.trim()
        : undefined,
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : new Date().toISOString(),
  };
}

/**
 * Extracts the primary associated position/role label of a resume version
 * for automatic lineage tagging when cloning & deriving targeted versions.
 */
export function extractResumePositionLabel(doc: ResumeDoc): string {
  const intentPos = (doc.data.intent.position || '').trim();
  if (intentPos) return intentPos;

  const headline = stripBold(doc.data.basic.headline || '').trim();
  if (headline) {
    const firstPart = headline.split(/[|｜·/]/)[0]?.trim();
    if (firstPart) return firstPart;
  }

  const firstRole = (doc.data.experience[0]?.role || '').trim();
  if (firstRole) return firstRole;

  return doc.name.trim() || '通用岗位';
}

/**
 * Clones a source resume into a new "针对性优化版" while automatically tagging
 * the parent version and its associated position info for multi-application comparison.
 */
export function deriveTargetedResumeVersion(
  sourceDoc: ResumeDoc,
  options?: { targetRole?: string; existingNames?: string[] }
): ResumeDoc {
  const copy = cloneResumeDoc(sourceDoc);
  copy.id = nid('resume');

  const parentPosition = extractResumePositionLabel(sourceDoc);
  const targetRole = (options?.targetRole || '').trim();
  const baseName = sourceDoc.name
    .replace(/(?:\s*·\s*针对性优化版|\s*（针对性优化版）)(?:\s*#\d+)?$/, '')
    .trim();

  const rawName = targetRole
    ? targetRole.includes('优化版')
      ? targetRole
      : `${targetRole}（针对性优化版）`
    : `${baseName || '简历'} · 针对性优化版`;

  const existingSet = new Set((options?.existingNames || []).map((n) => n.trim()));
  let finalName = rawName;
  let seq = 2;
  while (existingSet.has(finalName)) {
    finalName = `${rawName} #${seq}`;
    seq += 1;
  }

  copy.name = finalName;
  if (targetRole) {
    copy.data.intent.position = targetRole;
  }
  copy.lineage = {
    parentId: sourceDoc.id,
    parentName: sourceDoc.name,
    parentPosition,
    targetRole: targetRole || undefined,
    createdAt: new Date().toISOString(),
  };

  return copy;
}

export function mergeImportedResumes(
  existing: ResumeDoc[],
  incoming: Array<Partial<ResumeDoc>>,
): { resumes: ResumeDoc[]; activeId: string; mode: 'append-single' | 'restore-backup'; importedCount: number } {
  const normalized: ResumeDoc[] = incoming.map((r) => {
    const lineage = normalizeLineage(r.lineage);
    const bilingual =
      r.bilingual &&
      (r.bilingual.lang === 'zh' || r.bilingual.lang === 'en') &&
      typeof r.bilingual.pairedId === 'string' &&
      r.bilingual.pairedId.trim()
        ? {
            lang: r.bilingual.lang,
            pairedId: r.bilingual.pairedId.trim(),
            pairedName: typeof r.bilingual.pairedName === 'string' ? r.bilingual.pairedName : '',
            translatedAt: typeof r.bilingual.translatedAt === 'string' ? r.bilingual.translatedAt : '',
            ...(Array.isArray(r.bilingual.glossaryNotes) ? { glossaryNotes: r.bilingual.glossaryNotes } : {}),
            ...(typeof r.bilingual.modelUsed === 'string' ? { modelUsed: r.bilingual.modelUsed } : {}),
          }
        : undefined;
    return {
      id: r.id || nid('resume'),
      name: r.name || '导入版本',
      meta: normalizeMeta(r.meta),
      data: normalizeData(r.data),
      ...(lineage ? { lineage } : {}),
      ...(bilingual ? { bilingual } : {}),
    };
  });

  if (normalized.length === 1) {
    const existingIds = new Set(existing.map((r) => r.id));
    const single = cloneResumeDoc(normalized[0]);
    if (existingIds.has(single.id)) {
      single.id = nid('resume');
      if (!single.name.includes('导入')) {
        single.name = `${single.name}（导入）`;
      }
    }
    return {
      resumes: [...existing.map(cloneResumeDoc), single],
      activeId: single.id,
      mode: 'append-single',
      importedCount: 1,
    };
  }

  // Deduplicate IDs inside a multi-resume backup
  const seen = new Set<string>();
  const deduped = normalized.map((doc) => {
    const copy = cloneResumeDoc(doc);
    if (seen.has(copy.id)) {
      copy.id = nid('resume');
    }
    seen.add(copy.id);
    return copy;
  });

  return {
    resumes: deduped,
    activeId: deduped[0].id,
    mode: 'restore-backup',
    importedCount: deduped.length,
  };
}

const PLACEHOLDER_RULES: Array<{ re: RegExp; label: string }> = [
  { re: /你的姓名|姓名占位|张三|李四/g, label: '示例姓名占位符' },
  { re: /填写公司|公司名称|学校\s*\/\s*机构名称|某[某科技有限公司互联网公司]+|XX(?:公司|大学|学院|项目|系统|岗位)/gi, label: '机构/项目占位符' },
  { re: /担任职位\s*\/\s*角色|一句话职业定位|核心背景\s*·\s*2\s*项最强优势|描述你的关键行动/g, label: '默认引导占位语' },
  { re: /毕业院校|所学专业|填写核心专业技能|请按需拆分|导入经历（请核对/g, label: '未替换的模板提示' },
  { re: /(?:待填写|待补充|待完善|请填写|请补充|示例文字|示例内容|测试数据|占位符)/g, label: '待填/示例占位词' },
  { re: /\b(?:TODO|TBD|FIXME|lorem\s+ipsum)\b/gi, label: 'TODO/Lorem 占位词' },
  { re: /(?:^|[^a-zA-Z0-9])(?:XXX+|xxx+)(?:[^a-zA-Z0-9]|$)/g, label: 'XXX 占位符' },
  { re: /@example\.(?:com|org|net)\b/gi, label: '示例邮箱 (@example.com)' },
  { re: /\b1[3-9]\d0{4}\d{4}\b/g, label: '示例手机号 (含连续 0000)' },
  { re: /\[(?:填写|待填|请填|此处|你的)[^\]]{0,20}\]|【(?:填写|待填|请填|此处|你的)[^】]{0,20}】/g, label: '括号占位标记' },
];

const REPEATED_TOKEN_RE = /([\u4e00-\u9fa5a-zA-Z0-9]{2,8})\1{2,}|([\.。\-_~*!！?？])\2{4,}/;

function normalizeCompareText(raw: string): string {
  return stripBold(raw || '')
    .toLowerCase()
    .replace(/[\s，。、；：！？,.;:!?'"“”‘’()（）\-—_·•]/g, '')
    .trim();
}

/**
 * Automated pre-export PDF preflight audit.
 * Checks 4 core dimensions before printing/exporting:
 * 1. Required fields (name, contact, experience, education/skills)
 * 2. Content length (too short overall, sparse page fill, overly brief bullets)
 * 3. Placeholder residue (template hints, XXX, TODO, @example.com, fake 0000 phones)
 * 4. Duplicate / repeated content or duplicated placeholders
 * Plus layout overflow protection.
 */
export function runPdfExportPreflight(
  doc: ResumeDoc,
  pageCount: number,
  fillPct: number,
): PdfPreflightReport {
  const d = doc.data;
  const m = doc.meta;
  const issues: PdfPreflightIssue[] = [];
  const charCount = countResumeChars(doc);

  // --- 1. Required Fields ---
  if (!d.basic.name.trim()) {
    issues.push({
      id: 'pf-no-name',
      category: 'required',
      severity: 'error',
      title: '缺少必填项：姓名未填写',
      detail: '眉首姓名不能为空，否则导出后的 PDF 无法识别候选人身份。',
      guide: '点击「去基本信息填写」，补充你的真实姓名。',
      moduleKey: 'basic',
      actionLabel: '去基本信息填写',
    });
  }

  const phoneClean = d.basic.phone.replace(/[\s-]/g, '');
  const emailClean = d.basic.email.trim();
  if (!phoneClean && !emailClean) {
    issues.push({
      id: 'pf-no-contact',
      category: 'required',
      severity: 'error',
      title: '缺少必填项：手机与邮箱均未填写',
      detail: '简历中没有任何有效联系方式，HR 通过筛选后无法联系到你。',
      guide: '点击「去基本信息补充」，至少填写 11 位常用手机号或常用邮箱。',
      moduleKey: 'basic',
      actionLabel: '去基本信息补充',
    });
  } else if (phoneClean && !/^1[3-9]\d{9}$/.test(phoneClean)) {
    issues.push({
      id: 'pf-bad-phone',
      category: 'required',
      severity: 'warning',
      title: '手机号格式可能异常',
      detail: `当前填写为「${d.basic.phone}」，不符合常规 11 位手机号格式。`,
      guide: '请核对是否漏位或误输入了额外字符。',
      moduleKey: 'basic',
      actionLabel: '核对手机号',
    });
  }

  const nonEmptyBullets: Array<{ text: string; norm: string; expCompany: string }> = [];
  for (const exp of d.experience) {
    for (const b of exp.bullets) {
      const plain = stripBold(b).trim();
      if (plain) {
        nonEmptyBullets.push({
          text: plain,
          norm: normalizeCompareText(plain),
          expCompany: exp.company.trim() || '未命名经历',
        });
      }
    }
  }

  if (d.experience.length === 0 || nonEmptyBullets.length === 0) {
    issues.push({
      id: 'pf-no-exp',
      category: 'required',
      severity: 'error',
      title: '缺少必填项：工作 / 实践经历为空',
      detail: '经历模块没有任何有效经历或要点，导出后的简历缺乏核心说服力。',
      guide: '点击「去补充经历」，至少填写 1 段真实工作、实习或项目经历。',
      moduleKey: 'experience',
      actionLabel: '去补充经历',
    });
  }

  if (isShown(m, 'education') && d.education.length === 0) {
    issues.push({
      id: 'pf-no-edu',
      category: 'required',
      severity: 'warning',
      title: '教育背景模块为空',
      detail: '当前显示了教育背景模块但尚未填写院校与学历信息。',
      guide: '建议补充最高学历、学校与专业，或在「外观排版」中隐藏该模块。',
      moduleKey: 'education',
      actionLabel: '去补充教育背景',
    });
  }

  if (isShown(m, 'skills') && d.skills.length === 0) {
    issues.push({
      id: 'pf-no-skills',
      category: 'required',
      severity: 'warning',
      title: '专业技能模块为空',
      detail: '缺少技能关键词容易在招聘系统（ATS）关键词检索中吃亏。',
      guide: '建议按工具、业务方法或专业证书分组填写 2–3 条核心技能。',
      moduleKey: 'skills',
      actionLabel: '去补充技能',
    });
  }

  // --- 2. Content Length & Information Density ---
  if (charCount < 150) {
    issues.push({
      id: 'pf-too-short-critical',
      category: 'length',
      severity: 'error',
      title: `简历内容严重过短（仅 ${charCount} 字）`,
      detail: '标准一页 A4 简历建议在 400–900 字，当前字数过少会导致页面大面积留白、信息量不足。',
      guide: '请充实工作/项目经历中的具体动作、工具方法与结果证据，或通过「粘贴旧简历文本」快速导入。',
      moduleKey: 'experience',
      actionLabel: '去充实经历内容',
    });
  } else if (charCount < 320) {
    issues.push({
      id: 'pf-too-short-warn',
      category: 'length',
      severity: 'warning',
      title: `简历内容整体偏短（当前 ${charCount} 字）`,
      detail: '当前内容密度偏低（建议 400–900 字），容易让面试官感觉经历较单薄。',
      guide: '可在核心经历下补充 2–3 条带场景与结果的要点，或新增代表项目/作品集模块。',
      moduleKey: 'experience',
      actionLabel: '去完善内容',
    });
  }

  const shortBullets = nonEmptyBullets.filter((b) => b.text.replace(/\s+/g, '').length < 14);
  if (shortBullets.length > 0) {
    issues.push({
      id: 'pf-short-bullets',
      category: 'length',
      severity: 'warning',
      title: `有 ${shortBullets.length} 条经历要点描述过短（<14 字）`,
      detail: '过于简略的条目（如仅写岗位职责词）难以体现个人贡献和专业深度。',
      guide: '建议按「强动作动词 + 工具/方法 + 具体交付结果」扩写至 25–55 字，并加粗核心词。',
      moduleKey: 'experience',
      actionLabel: '去润色过短要点',
      samples: shortBullets.slice(0, 3).map((b) => b.text),
    });
  }

  if (pageCount === 1 && fillPct > 0 && fillPct < 45 && charCount >= 150) {
    issues.push({
      id: 'pf-sparse-page',
      category: 'length',
      severity: 'warning',
      title: `A4 页面下半部留白过多（当前填充约 ${fillPct}%）`,
      detail: '单页填充率低于 45% 时，打印为 PDF 视觉上会显得空旷。',
      guide: '可补充项目/作品/荣誉模块，或在「外观排版」中适度调大字号与行距。',
      moduleKey: 'design',
      actionLabel: '去调整排版',
    });
  }

  // --- 3. Placeholder Residue Detection ---
  interface TextSlot {
    text: string;
    moduleKey: string;
    fieldLabel: string;
  }
  const slots: TextSlot[] = [
    { text: d.basic.name, moduleKey: 'basic', fieldLabel: '姓名' },
    { text: d.basic.headline, moduleKey: 'basic', fieldLabel: '一句话定位' },
    { text: d.basic.phone, moduleKey: 'basic', fieldLabel: '手机号' },
    { text: d.basic.email, moduleKey: 'basic', fieldLabel: '邮箱' },
    { text: d.basic.location, moduleKey: 'basic', fieldLabel: '城市' },
    ...d.basic.extras.map((ex) => ({
      text: `${ex.label} ${ex.value}`,
      moduleKey: 'basic',
      fieldLabel: `眉首附加项(${ex.label || '未命名'})`,
    })),
  ];

  if (isShown(m, 'intent')) {
    slots.push(
      { text: d.intent.position, moduleKey: 'intent', fieldLabel: '目标岗位' },
      { text: d.intent.city, moduleKey: 'intent', fieldLabel: '意向城市' },
    );
  }
  for (const exp of d.experience) {
    slots.push(
      { text: exp.company, moduleKey: 'experience', fieldLabel: '经历机构名' },
      { text: exp.role, moduleKey: 'experience', fieldLabel: '担任职位' },
      { text: exp.subtitle, moduleKey: 'experience', fieldLabel: '经历摘要' },
      ...exp.bullets.map((b) => ({
        text: stripBold(b),
        moduleKey: 'experience',
        fieldLabel: '经历要点',
      })),
    );
  }
  if (isShown(m, 'education')) {
    for (const edu of d.education) {
      slots.push(
        { text: edu.school, moduleKey: 'education', fieldLabel: '毕业院校' },
        { text: edu.major, moduleKey: 'education', fieldLabel: '所学专业' },
        { text: edu.desc, moduleKey: 'education', fieldLabel: '教育描述' },
      );
    }
  }
  if (isShown(m, 'skills')) {
    for (const sk of d.skills) {
      slots.push(
        { text: sk.cat, moduleKey: 'skills', fieldLabel: '技能分类' },
        { text: sk.items, moduleKey: 'skills', fieldLabel: '技能明细' },
      );
    }
  }
  if (isShown(m, 'evals')) {
    for (const ev of d.evals) {
      slots.push({ text: `${ev.title} ${ev.body}`, moduleKey: 'evals', fieldLabel: '自我评价' });
    }
  }
  for (const cm of d.custom) {
    if (!cm.show || !isShown(m, `custom:${cm.id}`)) continue;
    const rawItems = Array.isArray(cm.items) ? cm.items : [];
    const textJoined = rawItems
      .map((it) => (typeof it === 'string' ? stripBold(it) : JSON.stringify(it)))
      .join(' ');
    slots.push({ text: `${cm.title} ${textJoined}`, moduleKey: `custom:${cm.id}`, fieldLabel: cm.title });
  }

  const placeholderHits: Array<{ snippet: string; moduleKey: string; fieldLabel: string; label: string }> = [];
  const placeholderHitCounts = new Map<string, number>();

  for (const slot of slots) {
    if (!slot.text || !slot.text.trim()) continue;
    for (const rule of PLACEHOLDER_RULES) {
      const matches = slot.text.match(rule.re);
      if (matches && matches.length > 0) {
        for (const matched of matches) {
          const cleanHit = matched.trim();
          if (!cleanHit) continue;
          const key = cleanHit.toLowerCase();
          placeholderHitCounts.set(key, (placeholderHitCounts.get(key) || 0) + 1);
          placeholderHits.push({
            snippet: `${slot.fieldLabel}：${cleanHit}`,
            moduleKey: slot.moduleKey,
            fieldLabel: slot.fieldLabel,
            label: rule.label,
          });
        }
      }
    }
  }

  if (placeholderHits.length > 0) {
    const uniqueSamples = Array.from(new Set(placeholderHits.map((h) => h.snippet))).slice(0, 4);
    const firstMod = placeholderHits[0].moduleKey;
    const hasRepeatedPlaceholder = Array.from(placeholderHitCounts.values()).some((c) => c >= 2);
    issues.push({
      id: 'pf-placeholder-residue',
      category: 'placeholder',
      severity: 'error',
      title: hasRepeatedPlaceholder
        ? `检测到 ${placeholderHits.length} 处未替换占位符（含重复占位符）`
        : `检测到 ${placeholderHits.length} 处疑似示例/占位符内容`,
      detail: '直接导出含示例联系方式、模板提示或 XXX/TODO 的简历会严重影响 HR 专业印象。',
      guide: `请点击「定位替换占位符」逐一改为你的真实信息（首次出现于「${placeholderHits[0].fieldLabel}」）。`,
      moduleKey: firstMod,
      actionLabel: '定位替换占位符',
      samples: uniqueSamples,
    });
  }

  // --- 4. Duplicate Content & Repeated Placeholder / Phrase Detection ---
  const duplicateSamples: string[] = [];
  let duplicateModuleKey = 'experience';

  // 4a. Duplicated bullets across or within experiences
  const bulletFreq = new Map<string, { count: number; raw: string }>();
  for (const b of nonEmptyBullets) {
    if (b.norm.length < 4) continue;
    const prev = bulletFreq.get(b.norm);
    if (prev) {
      prev.count += 1;
    } else {
      bulletFreq.set(b.norm, { count: 1, raw: b.text });
    }
  }
  for (const [, entry] of bulletFreq) {
    if (entry.count >= 2) {
      duplicateSamples.push(
        `经历要点重复 ${entry.count} 次：「${entry.raw.slice(0, 26)}${entry.raw.length > 26 ? '…' : ''}」`,
      );
    }
  }

  // 4b. Duplicated company + role combinations
  const expPairFreq = new Map<string, { count: number; raw: string }>();
  for (const exp of d.experience) {
    const key = normalizeCompareText(`${exp.company}|${exp.role}|${exp.period}`);
    if (key.length < 3) continue;
    const raw = `${exp.company || '未填公司'} · ${exp.role || '未填职位'}`;
    const prev = expPairFreq.get(key);
    if (prev) prev.count += 1;
    else expPairFreq.set(key, { count: 1, raw });
  }
  for (const [, entry] of expPairFreq) {
    if (entry.count >= 2) {
      duplicateSamples.push(`相同经历重复 ${entry.count} 次：「${entry.raw}」`);
    }
  }

  // 4c. Duplicated skill lines, certs, or tags
  const skillFreq = new Map<string, { count: number; raw: string }>();
  for (const sk of d.skills) {
    const key = normalizeCompareText(sk.items);
    if (key.length < 4) continue;
    const prev = skillFreq.get(key);
    if (prev) prev.count += 1;
    else skillFreq.set(key, { count: 1, raw: `${sk.cat}：${sk.items}` });
  }
  for (const [, entry] of skillFreq) {
    if (entry.count >= 2) {
      if (duplicateSamples.length === 0) duplicateModuleKey = 'skills';
      duplicateSamples.push(
        `技能内容重复 ${entry.count} 次：「${entry.raw.slice(0, 24)}${entry.raw.length > 24 ? '…' : ''}」`,
      );
    }
  }

  const tagFreq = new Map<string, { count: number; raw: string }>();
  for (const t of d.tags) {
    const key = normalizeCompareText(t);
    if (!key) continue;
    const prev = tagFreq.get(key);
    if (prev) prev.count += 1;
    else tagFreq.set(key, { count: 1, raw: t.trim() });
  }
  for (const [, entry] of tagFreq) {
    if (entry.count >= 2) {
      if (duplicateSamples.length === 0) duplicateModuleKey = 'tags';
      duplicateSamples.push(`核心标签重复 ${entry.count} 次：「${entry.raw}」`);
    }
  }

  // 4d. Abnormal inline token repetition (e.g. "测试测试测试" / "placeholder..." / "......")
  for (const slot of slots) {
    const match = slot.text.match(REPEATED_TOKEN_RE);
    if (match) {
      if (duplicateSamples.length === 0) duplicateModuleKey = slot.moduleKey;
      duplicateSamples.push(`${slot.fieldLabel}存在重复字符/词组：「${match[0].slice(0, 20)}」`);
    }
  }

  if (duplicateSamples.length > 0) {
    issues.push({
      id: 'pf-duplicate-content',
      category: 'duplicate',
      severity: duplicateSamples.length >= 2 ? 'error' : 'warning',
      title: `检测到 ${duplicateSamples.length} 处重复内容或重复占位词`,
      detail: '不同条目间出现完全重复的句子、标签或重复字符，通常是复制模板后忘删或忘改所致。',
      guide: '建议删除冗余条目或改写为差异化亮点，确保简历每行内容都有独立价值。',
      moduleKey: duplicateModuleKey,
      actionLabel: '去清理重复项',
      samples: Array.from(new Set(duplicateSamples)).slice(0, 4),
    });
  }

  // --- 5. Page Overflow Layout Check ---
  if (pageCount > 1 && !m.autofit) {
    issues.push({
      id: 'pf-page-overflow',
      category: 'layout',
      severity: 'warning',
      title: `当前内容共 ${pageCount} 页，可能出现跨页截断`,
      detail: '未开启「自动压一页」时，导出 PDF 会自动分页，可能将最后一段文字孤立在第二页。',
      guide: '建议前往「外观排版」开启「自动压一页」，或微调字号与页边距。',
      moduleKey: 'design',
      actionLabel: '去开启压一页',
    });
  }

  // Sort errors first, then warnings, then info
  const rank = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => rank[a.severity] - rank[b.severity]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const hasReqErr = issues.some((i) => i.category === 'required');
  const hasLenErr = issues.some((i) => i.category === 'length');
  const hasPlaceholderErr = issues.some((i) => i.category === 'placeholder');
  const hasDupErr = issues.some((i) => i.category === 'duplicate');

  const checklist = [
    {
      id: 'required',
      label: '必填项完整',
      passed: !hasReqErr,
      summary: hasReqErr
        ? `${issues.filter((i) => i.category === 'required').length} 项待完善`
        : '姓名/联系/经历齐全',
    },
    {
      id: 'length',
      label: '内容长度达标',
      passed: !hasLenErr,
      summary: hasLenErr ? `${charCount} 字 · 偏短/留白多` : `${charCount} 字 · 饱满度 ${fillPct}%`,
    },
    {
      id: 'placeholder',
      label: '无占位符残留',
      passed: !hasPlaceholderErr,
      summary: hasPlaceholderErr ? `${placeholderHits.length} 处疑似占位符` : '已全部替换为真实内容',
    },
    {
      id: 'duplicate',
      label: '无明显重复',
      passed: !hasDupErr,
      summary: hasDupErr ? `${duplicateSamples.length} 处重复内容` : '条目表达无冗余重复',
    },
  ];

  const passedCount = checklist.filter((c) => c.passed).length;
  const status: PdfPreflightReport['status'] =
    errorCount > 0 ? 'blocked' : warningCount > 0 ? 'warn' : 'ready';

  return {
    status,
    charCount,
    pageCount,
    fillPct,
    errorCount,
    warningCount,
    passedCount,
    totalChecks: checklist.length,
    issues,
    checklist,
  };
}

const GENERIC_EXP_COMPANIES = new Set(['新公司名称', '公司名称', '某公司', '未命名']);
const GENERIC_EXP_ROLES = new Set(['职位名称', '岗位名称', '未填写']);

export function validateExpandExperienceInput(exp: {
  company?: string;
  role?: string;
  subtitle?: string;
}): { ok: boolean; error?: string } {
  const company = (exp.company || '').trim();
  const role = (exp.role || '').trim();
  const subtitle = (exp.subtitle || '').trim();

  const hasMeaningfulCompany = Boolean(company && !GENERIC_EXP_COMPANIES.has(company));
  const hasMeaningfulRole = Boolean(role && !GENERIC_EXP_ROLES.has(role));
  const hasSubtitle = Boolean(subtitle);

  if (!hasMeaningfulCompany && !hasMeaningfulRole && !hasSubtitle) {
    return {
      ok: false,
      error: '请先填写「公司 / 团队」和「担任职位」或「一句话职责概要」，AI 才能生成贴合岗位的 STAR 补充经历。',
    };
  }
  return { ok: true };
}

export function normalizeStarSuggestions(raw: unknown): ExperienceStarSuggestion[] {
  const candidates = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { suggestions?: unknown }).suggestions)
      ? ((raw as { suggestions: unknown[] }).suggestions)
      : raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
        ? ((raw as { items: unknown[] }).items)
        : [];

  const seen = new Set<string>();
  const out: ExperienceStarSuggestion[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const item = candidates[i];
    if (!item) continue;

    if (typeof item === 'string') {
      const bullet = item.trim();
      const key = stripBold(bullet).replace(/\s+/g, '');
      if (bullet && !seen.has(key)) {
        seen.add(key);
        out.push({
          id: nid('star'),
          focus: `STAR 建议 ${out.length + 1}`,
          situation: '',
          action: '',
          result: '',
          bullet,
        });
      }
      if (out.length >= 3) break;
      continue;
    }

    if (typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const pickStr = (...keys: string[]): string => {
      for (const k of keys) {
        const val = rec[k];
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
      return '';
    };

    const focus = pickStr('focus', 'dimension', 'tag', 'title') || `核心维度 ${out.length + 1}`;
    const situation = pickStr('situation', 'task', 'context', 'bg', 'background');
    const action = pickStr('action', 'actions', 'method');
    const result = pickStr('result', 'outcome', 'impact');
    let bullet = pickStr('bullet', 'text', 'content', 'summary');

    if (!bullet) {
      const synthesized = [situation, action, result].filter(Boolean).join('，');
      if (synthesized) bullet = synthesized.endsWith('。') ? synthesized : `${synthesized}。`;
    }

    const dedupeKey = stripBold(bullet).replace(/\s+/g, '');
    if (!bullet || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    out.push({
      id: nid('star'),
      focus,
      situation,
      action,
      result,
      bullet,
    });

    if (out.length >= 3) break;
  }

  return out;
}

export function buildExpandExperiencePrompt(params: {
  company: string;
  role: string;
  subtitle: string;
  existingBullets: string[];
  industryLabel?: string;
}): string {
  const existingClean = params.existingBullets
    .map((b) => stripBold(b).trim())
    .filter(Boolean);

  return [
    '你是资深全行业中文简历顾问，精通 STAR 法则（Situation 情境 / Task 任务 / Action 行动 / Result 结果）。',
    '请根据下面这段工作经历的公司名称、担任职位和岗位职责，生成恰好 3 条彼此视角互补、不与已有要点重复的 STAR 原则补充经历建议。',
    '要求：',
    '1）3 条建议分别覆盖不同价值维度（如：核心交付、流程提效、跨团队协同或技术创新）；',
    '2）严禁编造虚构的公司机密营收数据，如需量化请使用「约 XX%」「X+ 个」等明确占位符方便我按实替换；',
    '3）避免“负责/协助/参与”等弱动词，采用精准强动词，并用 **双星号** 加粗 1-2 个关键动作或成果；',
    '4）每条 bullet 控制在 40-75 字。',
    params.industryLabel ? `【行业语境】${params.industryLabel}` : '',
    params.company.trim() ? `【公司 / 团队】${params.company.trim()}` : '',
    params.role.trim() ? `【担任职位】${params.role.trim()}` : '',
    params.subtitle.trim() ? `【岗位职责 / 价值概要】${params.subtitle.trim()}` : '',
    existingClean.length > 0
      ? `【已有经历要点（请避免重复，做补充扩充）】\n${existingClean.map((b, i) => `${i + 1}. ${b}`).join('\n')}`
      : '',
    `【请严格仅输出以下 JSON（可直接粘贴回简历工坊一键加入简历）】\n\`\`\`json\n{\n  "suggestions": [\n    {\n      "focus": "价值维度（如：效率优化）",\n      "situation": "情境/任务（10-20字）",\n      "action": "关键行动与方法（15-28字）",\n      "result": "量化或可验证成果（10-22字）",\n      "bullet": "可直接写入简历的完整 STAR 要点（40-75字，含 **双星号** 加粗）"\n    }\n  ]\n}\n\`\`\``,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function parseExternalExpandExperienceJson(raw: string): ExperienceStarSuggestion[] {
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced && fenced[1] ? fenced[1].trim() : stripped;

  if (!fenced) {
    const objStart = stripped.indexOf('{');
    const arrStart = stripped.indexOf('[');
    if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
      const arrEnd = stripped.lastIndexOf(']');
      if (arrEnd > arrStart) candidate = stripped.slice(arrStart, arrEnd + 1);
    } else if (objStart !== -1) {
      const objEnd = stripped.lastIndexOf('}');
      if (objEnd > objStart) candidate = stripped.slice(objStart, objEnd + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error('未能解析出合法 JSON，请确认完整复制了外部 AI 返回的 JSON 代码块。');
  }

  const normalized = normalizeStarSuggestions(parsed);
  if (normalized.length === 0) {
    throw new Error('JSON 中未找到有效的 suggestions 经历建议，请使用「复制 STAR 扩充 Prompt」让外部 AI 按 JSON 格式输出。');
  }
  return normalized;
}

export interface StoredResumePayload {
  activeId: string;
  resumes: ResumeDoc[];
}

/**
 * Validate and normalize a persisted resume store payload (from browser localStorage or portable resumes-data.json).
 */
export function normalizeStoredResumePayload(
  raw: unknown,
  normalizeBilingualFn?: (b: unknown) => ResumeDoc['bilingual'],
): StoredResumePayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const parsed = raw as Partial<StoredResumePayload>;
  if (!Array.isArray(parsed.resumes) || parsed.resumes.length === 0) return null;

  const validEntries = parsed.resumes.filter(
    (item): item is ResumeDoc => Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  );
  if (validEntries.length === 0) return null;

  const normalized: ResumeDoc[] = validEntries.map((r) => {
    const lineage = normalizeLineage(r?.lineage);
    const bilingual = normalizeBilingualFn ? normalizeBilingualFn(r?.bilingual) : r?.bilingual;
    return {
      id: r?.id || nid('resume'),
      name: r?.name || '未命名版本',
      meta: normalizeMeta(r?.meta),
      data: normalizeData(r?.data),
      ...(lineage ? { lineage } : {}),
      ...(bilingual ? { bilingual } : {}),
    };
  });

  const activeExists = normalized.some((r) => r.id === parsed.activeId);
  return {
    activeId: activeExists && parsed.activeId ? parsed.activeId : normalized[0].id,
    resumes: normalized,
  };
}

export type PortableSyncAction =
  | { action: 'hydrate-from-disk'; payload: StoredResumePayload }
  | { action: 'seed-disk-from-local'; payload: StoredResumePayload };

/**
 * Decide how portable `.exe` mode reconciles disk storage (`resumes-data.json`) with browser `localStorage` on startup.
 * Disk storage is the source of truth whenever valid resumes exist on disk (protecting against port changes or cleared browser cache).
 */
export function resolvePortableSyncDecision(params: {
  localPayload: StoredResumePayload;
  diskPayload: StoredResumePayload | null;
}): PortableSyncAction {
  if (params.diskPayload && params.diskPayload.resumes.length > 0) {
    return { action: 'hydrate-from-disk', payload: params.diskPayload };
  }
  return { action: 'seed-disk-from-local', payload: params.localPayload };
}

const LINKEDIN_MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const LINKEDIN_NOISE_RE =
  /^(?:1st|2nd|3rd\+?|contact info|connections?|\d+\+?\s*(?:connections?|followers?)|show all.*|see (?:more|less|all).*|\.{2,}\s*see more|follow|following|connect|message|more|open to work|highlights|activity|interests|recommendations|people also viewed|page \d+ of \d+|endorsed by .*|\d+\s*endorsements?|top voices|verified|he\/him|she\/her|they\/them|联系信息|\d+\+?\s*位好友|关注|发消息|查看更多|显示全部.*)$/i;

const LINKEDIN_PERIOD_RE =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{4}\s*[./年-]\s*\d{1,2}\s*月?|\b(?:19|20)\d{2}\b)\s*(?:[-–—~]|至(?!今))+\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{4}\s*[./年-]\s*\d{1,2}\s*月?|\b(?:19|20)\d{2}\b|Present|Current|Now|至今)/i;

function normalizeLinkedInDateToken(token: string, preferEnglish: boolean): string {
  const clean = token.trim();
  if (/^(?:present|current|now|至今)$/i.test(clean)) {
    return preferEnglish ? 'Present' : '至今';
  }
  const enMonth = clean.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (enMonth) {
    const mm = LINKEDIN_MONTH_MAP[enMonth[1].toLowerCase()];
    if (mm) return `${enMonth[2]}.${mm}`;
  }
  const zhDate = clean.match(/^(\d{4})\s*[./年-]\s*(\d{1,2})\s*月?$/);
  if (zhDate) {
    return `${zhDate[1]}.${zhDate[2].padStart(2, '0')}`;
  }
  return clean;
}

function normalizeLinkedInPeriod(raw: string, preferEnglish: boolean): string {
  const m = raw.match(LINKEDIN_PERIOD_RE);
  if (!m) return '';
  const rangeStr = m[0];
  const parts = rangeStr.split(/\s*(?:[-–—~]|至(?!今))+\s*/);
  if (parts.length < 2) return rangeStr.trim();
  const start = normalizeLinkedInDateToken(parts[0], preferEnglish);
  const end = normalizeLinkedInDateToken(parts[1], preferEnglish);
  return `${start} - ${end}`;
}

function stripLinkedInEmploymentMeta(line: string): string {
  return line
    .replace(
      /\s*[·•|]\s*(?:Full-time|Part-time|Self-employed|Freelance|Contract|Internship|Apprenticeship|Seasonal|On-site|Hybrid|Remote|全职|兼职|实习|自由职业|合同工|远程|现场|混合办公)(?=\s|$|[·•|])/gi,
      '',
    )
    .replace(/\s*[·•]\s*\d+\s*(?:yrs?|mos?|years?|months?|年|个月)(?:\s+\d+\s*(?:mos?|months?|个月))?$/i, '')
    .trim();
}

/**
 * Pure offline LinkedIn profile text parser (supports LinkedIn Web copy-paste and "Save to PDF" text, EN & ZH).
 * Transforms pasted LinkedIn profile text into a normalized ResumeDoc ready for `handleImportParsedDoc`.
 */
export function parseLinkedInProfileText(rawText: string): ResumeDoc {
  const rawLines = (rawText || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\u200B|\uFEFF/g, '').trim())
    .filter(Boolean);

  const lines = rawLines.filter((l) => !LINKEDIN_NOISE_RE.test(l));
  const joined = lines.join('\n');

  const cjkCount = (joined.match(/[\u4e00-\u9fa5]/g) || []).length;
  const latinWordCount = (joined.match(/[A-Za-z]{2,}/g) || []).length;
  const preferEnglish = cjkCount < 20 && latinWordCount >= 12;

  const emailMatch = joined.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  const cnPhoneMatch = joined.match(/1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}/);
  const intlPhoneMatch = joined.match(/\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);
  const linkedInUrlMatch = joined.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9-_%]+/i);

  type LiSec = 'head' | 'about' | 'exp' | 'edu' | 'skill' | 'cert' | 'other';
  let currentSec: LiSec = 'head';
  const buckets: Record<LiSec, string[]> = {
    head: [],
    about: [],
    exp: [],
    edu: [],
    skill: [],
    cert: [],
    other: [],
  };

  for (const line of lines) {
    const cleanHeading = line.replace(/[：:]+$/, '').trim();
    if (cleanHeading.length <= 32) {
      if (/^(?:About|Summary|简介|个人简介|关于)$/i.test(cleanHeading)) {
        currentSec = 'about';
        continue;
      }
      if (/^(?:Experience|Work Experience|工作经历|工作经验|职业经历)$/i.test(cleanHeading)) {
        currentSec = 'exp';
        continue;
      }
      if (/^(?:Education|教育背景|教育经历)$/i.test(cleanHeading)) {
        currentSec = 'edu';
        continue;
      }
      if (/^(?:Skills|Top Skills|Skills & Endorsements|技能|核心技能|专业技能)$/i.test(cleanHeading)) {
        currentSec = 'skill';
        continue;
      }
      if (/^(?:Licenses & certifications|Certifications|Honors-Awards|Honors & awards|执照和资格证书|资格证书|资质证书|荣誉奖项)$/i.test(cleanHeading)) {
        currentSec = 'cert';
        continue;
      }
      if (/^(?:Languages|Contact|Volunteering|Publications|Projects|语言能力|联系方式)$/i.test(cleanHeading)) {
        currentSec = /^Contact|联系方式$/i.test(cleanHeading) ? 'head' : 'other';
        continue;
      }
    }
    buckets[currentSec].push(line);
  }

  // Extract Name, Headline, and Location from header bucket
  const headCandidates = buckets.head.filter(
    (l) =>
      !/@/.test(l) &&
      !/linkedin\.com\/in\//i.test(l) &&
      !/^(?:\+?\d[\d\s()-]{7,})$/.test(l) &&
      !/^\(?(?:Mobile|Work|Home|Email|LinkedIn)\)?$/i.test(l),
  );

  let name = '';
  let nameIdx = -1;
  for (let i = 0; i < Math.min(headCandidates.length, 5); i++) {
    const cand = headCandidates[i];
    if (cand.length >= 2 && cand.length <= 42 && !/[,|·•]/.test(cand)) {
      name = cand;
      nameIdx = i;
      break;
    }
  }
  if (!name && headCandidates.length > 0) {
    name = headCandidates[0].slice(0, 40);
    nameIdx = 0;
  }

  const afterName = nameIdx >= 0 ? headCandidates.slice(nameIdx + 1) : headCandidates;
  let headline = '';
  let location = '';

  for (const line of afterName) {
    const looksLikeLocation =
      /(?:Area|Metropolitan|United States|United Kingdom|Canada|Australia|Singapore|China|Germany|Japan|France|Remote|California|New York|Texas|Washington|London|Tokyo|北京|上海|广州|深圳|杭州|苏州|成都|南京|香港|新加坡)/i.test(
        line,
      ) && line.length <= 60;
    if (!location && looksLikeLocation && (headline || /,/.test(line))) {
      location = line.replace(/\s*·\s*Contact info$/i, '').trim();
    } else if (!headline && line.length >= 4 && line.length <= 120) {
      headline = line;
    } else if (!location && line.length >= 2 && line.length <= 48 && /,/.test(line)) {
      location = line;
    }
  }

  // Parse Experience entries (split on lines containing LinkedIn date ranges)
  const experiences: ResumeDoc['data']['experience'] = [];
  if (buckets.exp.length > 0) {
    const expLines = buckets.exp;
    const periodIndices: number[] = [];
    for (let i = 0; i < expLines.length; i++) {
      if (LINKEDIN_PERIOD_RE.test(expLines[i])) {
        periodIndices.push(i);
      }
    }

    if (periodIndices.length > 0) {
      let cursor = 0;
      for (let p = 0; p < periodIndices.length; p++) {
        const pIdx = periodIndices[p];
        const nextPIdx = p + 1 < periodIndices.length ? periodIndices[p + 1] : expLines.length;
        // Reserve up to 2 header lines (role + company) immediately preceding the next period line
        const bodyEnd =
          p + 1 < periodIndices.length ? Math.max(pIdx + 1, nextPIdx - 2) : expLines.length;

        const headerSlice = expLines.slice(cursor, pIdx).map(stripLinkedInEmploymentMeta).filter(Boolean);
        const periodStr = normalizeLinkedInPeriod(expLines[pIdx], preferEnglish);
        const rawBody = expLines.slice(pIdx + 1, bodyEnd);

        // First line after period is often a location line (e.g. "San Francisco, CA · Hybrid")
        const bodyLines: string[] = [];
        for (let b = 0; b < rawBody.length; b++) {
          const cleaned = rawBody[b].replace(/^[•·\-—*]\s*/, '').trim();
          if (!cleaned) continue;
          if (
            b === 0 &&
            cleaned.length <= 50 &&
            /(?:Remote|Hybrid|On-site|Area|United States|China|Singapore|California|New York|北京|上海|深圳|杭州|广州)/i.test(
              cleaned,
            ) &&
            !/[.。%$¥]/.test(cleaned)
          ) {
            continue;
          }
          bodyLines.push(cleaned);
        }

        let role = '';
        let company = '';
        if (headerSlice.length >= 2) {
          role = headerSlice[headerSlice.length - 2];
          company = headerSlice[headerSlice.length - 1];
        } else if (headerSlice.length === 1) {
          const single = headerSlice[0];
          const atSplit = single.split(/\s+(?:at|@)\s+/i);
          if (atSplit.length === 2) {
            role = atSplit[0].trim();
            company = atSplit[1].trim();
          } else {
            company = single;
          }
        } else {
          company = preferEnglish ? 'Imported Experience' : 'LinkedIn 导入经历';
        }

        experiences.push({
          id: nid('exp'),
          company: company.slice(0, 60),
          role: role.slice(0, 60),
          period: periodStr,
          subtitle: '',
          kpis: [],
          bullets: bodyLines.slice(0, 8),
        });

        cursor = bodyEnd;
      }
    } else {
      const cleaned = expLines.map((l) => l.replace(/^[•·\-—*]\s*/, '').trim()).filter(Boolean);
      experiences.push({
        id: nid('exp'),
        company: stripLinkedInEmploymentMeta(cleaned[0] || '') || (preferEnglish ? 'Experience' : 'LinkedIn 导入经历'),
        role: '',
        period: '',
        subtitle: '',
        kpis: [],
        bullets: cleaned.slice(1, 8),
      });
    }
  }

  // Parse Education entries
  const educations: ResumeDoc['data']['education'] = [];
  if (buckets.edu.length > 0) {
    const eduLines = buckets.edu;
    let currentEdu: { school: string; major: string; degree: string; period: string; desc: string[] } | null = null;
    const flushEdu = () => {
      if (!currentEdu) return;
      educations.push({
        id: nid('edu'),
        school: currentEdu.school,
        major: currentEdu.major,
        degree: currentEdu.degree,
        period: currentEdu.period,
        desc: currentEdu.desc.join(' · '),
      });
      currentEdu = null;
    };

    for (const line of eduLines) {
      if (LINKEDIN_PERIOD_RE.test(line)) {
        const period = normalizeLinkedInPeriod(line, preferEnglish);
        const rest = line.replace(LINKEDIN_PERIOD_RE, '').replace(/^[,·|\s-]+|[,·|\s-]+$/g, '').trim();
        if (!currentEdu) {
          currentEdu = { school: rest || line, major: '', degree: '', period, desc: [] };
        } else if (!currentEdu.period) {
          currentEdu.period = period;
          if (rest) currentEdu.desc.push(rest);
        } else {
          flushEdu();
          currentEdu = { school: rest || line, major: '', degree: '', period, desc: [] };
        }
        continue;
      }

      const looksLikeDegree =
        /\b(?:Bachelor|Master|Ph\.?D|MBA|B\.S\.?|M\.S\.?|B\.A\.?|M\.A\.?|B\.Eng|M\.Eng|Associate|Diploma)\b|本科|硕士|博士|学士|研究生|专科/i.test(
          line,
        );
      if (!currentEdu) {
        currentEdu = { school: line, major: '', degree: '', period: '', desc: [] };
      } else if (looksLikeDegree && !currentEdu.degree) {
        const parts = line.split(/[,，·]/).map((s) => s.trim()).filter(Boolean);
        currentEdu.degree = parts[0] || line;
        currentEdu.major = parts.slice(1).join(', ');
      } else if (currentEdu.period) {
        // After a period line, a new school name starts the next education entry
        flushEdu();
        currentEdu = { school: line, major: '', degree: '', period: '', desc: [] };
      } else {
        currentEdu.desc.push(line);
      }
    }
    flushEdu();
  }

  // Parse Skills & Tags
  const skillTokens: string[] = [];
  const seenSkills = new Set<string>();
  for (const line of buckets.skill) {
    const cleaned = line
      .replace(/^[•·\-—*]\s*/, '')
      .replace(/\s*·\s*\d+\s*endorsements?$/i, '')
      .trim();
    if (!cleaned || cleaned.length > 100) continue;
    for (const part of cleaned.split(/[·•,，|、/]+/)) {
      const token = part.trim();
      if (!token || token.length > 40) continue;
      const key = token.toLowerCase();
      if (!seenSkills.has(key)) {
        seenSkills.add(key);
        skillTokens.push(token);
      }
    }
  }

  const data = emptyData();
  data.basic.name = name || (preferEnglish ? 'LinkedIn Candidate' : 'LinkedIn 候选人');
  data.basic.headline = headline;
  data.basic.phone = cnPhoneMatch
    ? cnPhoneMatch[0].replace(/[\s-]/g, '')
    : intlPhoneMatch
      ? intlPhoneMatch[0].trim()
      : '';
  data.basic.email = emailMatch ? emailMatch[0] : '';
  data.basic.location = location;

  if (linkedInUrlMatch) {
    data.basic.extras.push({
      id: nid('ext'),
      label: 'LinkedIn',
      value: linkedInUrlMatch[0].replace(/^https?:\/\/(?:www\.)?/i, ''),
    });
  }

  data.intent.position = experiences[0]?.role || headline.split(/[|·]/)[0]?.trim() || '';
  data.intent.city = location;
  data.experience = experiences;
  data.education = educations;

  if (skillTokens.length > 0) {
    data.skills = [
      {
        id: nid('sk'),
        cat: preferEnglish ? 'Core Skills' : '核心技能',
        items: skillTokens.slice(0, 18).join(' / '),
      },
    ];
    data.tags = skillTokens.slice(0, 6);
  }

  if (buckets.cert.length > 0) {
    data.certs = buckets.cert
      .map((l) => l.replace(/^[•·\-—*]\s*/, '').trim())
      .filter((l) => l.length >= 2 && !/^Issued\s+/i.test(l) && !/^Credential ID/i.test(l))
      .slice(0, 8);
  }

  if (buckets.about.length > 0) {
    data.evals = [
      {
        id: nid('ev'),
        title: preferEnglish ? 'Profile Summary' : '个人简介',
        body: buckets.about.join(' ').slice(0, 420),
      },
    ];
  }

  // Fallback if the user pasted unstructured LinkedIn text without section headings
  if (data.experience.length === 0 && data.education.length === 0 && data.evals.length === 0) {
    const fallback = parsePlainTextResumeLocal(rawText);
    fallback.name = `${fallback.data.basic.name} · LinkedIn 导入版`;
    return fallback;
  }

  const meta = normalizeMeta({ template: 'single-column', theme: 'navy-blue' });
  if (preferEnglish) {
    applySectionLanguage(meta, 'en');
  }

  return {
    id: nid('resume'),
    name: `${data.basic.name} · LinkedIn 导入版`,
    meta,
    data,
  };
}



