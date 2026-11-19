export type TemplateId =
  | 'single-column'
  | 'centered-classic'
  | 'timeline'
  | 'card-grid'
  | 'two-column'
  | 'two-column-reverse'
  | 'magazine'
  | 'top-banner-split';

export type ThemeId =
  | 'navy-blue'
  | 'steel-blue'
  | 'teal-orange'
  | 'forest-green'
  | 'warm-amber'
  | 'ocean-cyan'
  | 'charcoal'
  | 'mono'
  | 'rose'
  | 'purple';

export type CustomModuleKind = 'tags' | 'bullets' | 'titled' | 'cases' | 'text';

export type WorkbenchTab = 'content' | 'design' | 'audit' | 'helper' | 'compare';

export type SidebarStyle = 'light' | 'dark';

export type KpiStyle = 'divider' | 'card' | 'accent' | 'inline';

export type FontStyle = 'sans' | 'serif' | 'classic';

export type HeaderStyle = 'clean' | 'tinted' | 'banner';

export type SectionStyle = 'bar' | 'underline' | 'pill' | 'minimal';

export type WritingIndustry =
  | 'general'
  | 'engineering'
  | 'humanities'
  | 'creative'
  | 'business'
  | 'medical';

export type IndustryCategory =
  | 'all'
  | 'hardware-auto'
  | 'game-acg'
  | 'tech-it'
  | 'sales-trade'
  | 'finance-law'
  | 'humanities-edu'
  | 'admin-gov'
  | 'creative-media'
  | 'medical-bio'
  | 'supply-civil'
  | 'fresh-general';

export type AiProviderId = 'auto' | 'openai' | 'anthropic';

export type CustomAiProtocol = 'openai' | 'anthropic';

export interface CustomAiConfig {
  enabled: boolean;
  protocol: CustomAiProtocol;
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchedModels: string[];
  savedModels?: string[];
  lastVerifiedAt?: string;
}

export interface AiConfigValidationErrors {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface AiConfigValidationResult {
  valid: boolean;
  isLocal: boolean;
  errors: AiConfigValidationErrors;
  normalized: CustomAiConfig;
}

export interface AiConfigSaveResult {
  ok: boolean;
  validation: AiConfigValidationResult;
}

export interface CustomAiRequestPayload {
  protocol: CustomAiProtocol;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export interface AiProviderInfo {
  id: 'openai' | 'anthropic';
  label: string;
  desc: string;
  configured: boolean;
  defaultModel: string;
  baseUrlHint?: string;
}

export interface BasicExtraField {
  id: string;
  label: string;
  value: string;
}

export interface BasicInfo {
  name: string;
  headline: string;
  phone: string;
  email: string;
  location: string;
  age: string;
  photo: string;
  extras: BasicExtraField[];
}

export interface IntentInfo {
  position: string;
  city: string;
  salary: string;
  availability: string;
}

export interface EducationItem {
  id: string;
  school: string;
  major: string;
  degree: string;
  period: string;
  desc: string;
}

export interface ExpKpi {
  num: string;
  label: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  subtitle: string;
  bullets: string[];
  kpis?: ExpKpi[];
}

export interface SkillGroup {
  id: string;
  cat: string;
  items: string;
}

export interface EvalItem {
  id: string;
  title: string;
  body: string;
}

export interface TitledItem {
  title: string;
  body: string;
}

export interface CaseItem {
  title: string;
  bg: string;
  action: string;
  result: string;
  evidence: string;
}

export interface CustomModule {
  id: string;
  title: string;
  kind: CustomModuleKind;
  show: boolean;
  items: unknown[];
}

export interface HelperMemoGroup {
  id: string;
  title: string;
  items: string[];
}

export interface DeliveryHelper {
  keywords: string[];
  greeting: string;
  redFlags: string[];
  memos: HelperMemoGroup[];
}

export interface ResumeData {
  basic: BasicInfo;
  intent: IntentInfo;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: SkillGroup[];
  certs: string[];
  tags: string[];
  evals: EvalItem[];
  custom: CustomModule[];
  helper: DeliveryHelper;
}

export interface ResumeMeta {
  template: TemplateId;
  theme: ThemeId;
  customColor?: string;
  fs: number;
  fw?: number;
  lh: number;
  pad: number;
  autofit: boolean;
  showPhotoSlot: boolean;
  sidebarStyle: SidebarStyle;
  kpiStyle: KpiStyle;
  fontStyle: FontStyle;
  headerStyle: HeaderStyle;
  sectionStyle: SectionStyle;
  printSafe: boolean;
  order: string[];
  hidden: Record<string, boolean>;
  titles: Record<string, string>;
}

export interface ResumeVersionLineage {
  parentId: string;
  parentName: string;
  parentPosition: string;
  targetRole?: string;
  createdAt: string;
}

export interface ResumeBilingualInfo {
  lang: 'zh' | 'en';
  pairedId: string;
  pairedName: string;
  translatedAt: string;
  glossaryNotes?: string[];
  modelUsed?: string;
}

export interface ResumeDoc {
  id: string;
  name: string;
  meta: ResumeMeta;
  data: ResumeData;
  lineage?: ResumeVersionLineage;
  bilingual?: ResumeBilingualInfo;
}

export interface LocalAuditEnhancement {
  id: string;
  expId: string;
  bulletIndex: number;
  location: string;
  original: string;
  missingDimensions: string[];
  suggestedText: string;
  tip: string;
}

export interface LocalCheckItem {
  id: string;
  lv: 'err' | 'warn' | 'tip';
  msg: string;
  sub: string;
  go: string;
  enhancements?: LocalAuditEnhancement[];
}

export type PdfPreflightCategory = 'required' | 'length' | 'placeholder' | 'duplicate' | 'layout';

export interface PdfPreflightIssue {
  id: string;
  category: PdfPreflightCategory;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  guide: string;
  moduleKey: string;
  actionLabel: string;
  samples?: string[];
}

export interface PdfPreflightReport {
  status: 'ready' | 'warn' | 'blocked';
  charCount: number;
  pageCount: number;
  fillPct: number;
  errorCount: number;
  warningCount: number;
  passedCount: number;
  totalChecks: number;
  issues: PdfPreflightIssue[];
  checklist: Array<{
    id: string;
    label: string;
    passed: boolean;
    summary: string;
  }>;
}

export type DiffSegmentKind = 'equal' | 'added' | 'removed';

export interface DiffSegment {
  kind: DiffSegmentKind;
  text: string;
}

export type DiffStatus = 'unchanged' | 'modified' | 'added' | 'removed';

export interface DiffFieldEntry {
  id: string;
  label: string;
  status: DiffStatus;
  segments: DiffSegment[];
  addedChars: number;
  removedChars: number;
}

export interface DiffSectionReport {
  moduleKey: string;
  title: string;
  status: DiffStatus;
  addedChars: number;
  removedChars: number;
  changedFieldsCount: number;
  fields: DiffFieldEntry[];
}

export interface VersionDiffReport {
  baseId: string;
  baseName: string;
  targetId: string;
  targetName: string;
  sameDoc: boolean;
  hasChanges: boolean;
  baseCharCount: number;
  targetCharCount: number;
  charDelta: number;
  addedChars: number;
  removedChars: number;
  baseQuantCount: number;
  targetQuantCount: number;
  changedSectionsCount: number;
  totalSectionsCount: number;
  styleChanges: string[];
  sections: DiffSectionReport[];
}

export type JdKeywordTier = 'core' | 'standard' | 'bonus';
export type JdKeywordMatchType = 'exact' | 'synonym' | 'fuzzy' | 'missing';
export type JdScanEngine = 'local' | 'llm';
export type JdKeywordSource = 'local' | 'llm' | 'manual';

export interface JdStructuredSkillItem {
  keyword: string;
  tier: JdKeywordTier;
  category?: string;
  source?: JdKeywordSource;
  weight?: number;
  count?: number;
  surfaceTerms?: string[];
}

export interface JdStructuredExtractResult {
  categories: Array<{
    name: string;
    items: Array<{
      keyword: string;
      tier: JdKeywordTier;
    }>;
  }>;
  ignoredSoftSkills?: string[];
}

export interface LocalJdKeywordDetail {
  keyword: string;
  weight: number;
  tier: JdKeywordTier;
  matchType: JdKeywordMatchType;
  matchedVia?: string;
  similarity?: number;
  category?: string;
  source?: JdKeywordSource;
}

export interface LocalJdMatchResult {
  totalKeywords: number;
  matched: string[];
  missing: string[];
  scorePct: number;
  cleanedJd?: string;
  noiseRemovedCount?: number;
  synonymMatchedCount?: number;
  fuzzyMatchedCount?: number;
  matchedDetails?: LocalJdKeywordDetail[];
  missingDetails?: LocalJdKeywordDetail[];
}

export type JdSemanticStatus = 'strong' | 'partial' | 'missing';

export interface JdSemanticSkillScore {
  keyword: string;
  tier: JdKeywordTier;
  category?: string;
  /** Semantic relevance score (0-100) comparing resume experiences & skills against this JD requirement */
  relevanceScore: number;
  status: JdSemanticStatus;
  /** Specific experience or skill evidence cited from the user's resume */
  evidence: string;
  /** Actionable gap advice when status is partial or missing */
  gapAdvice?: string;
}

export interface JdSemanticMatchReport {
  overallScore: number;
  summary: string;
  roleAlignment?: string;
  skillScores: JdSemanticSkillScore[];
  usedModel?: string;
  usedProvider?: string;
  source: 'api' | 'external-json';
}

export interface AuditPromptPreset {
  id: string;
  name: string;
  tag: string;
  summary: string;
  prompt: string;
  isCustom?: boolean;
}

export interface AiAuditFinding {
  severity: 'high' | 'medium' | 'low';
  module: string;
  title: string;
  issue: string;
  suggestion: string;
  rewriteExample: string;
}

export interface AiAuditReport {
  overallVerdict: string;
  readinessLevel: string;
  strengths: string[];
  findings: AiAuditFinding[];
}

export interface TailorExperienceUpdate {
  id: string;
  role: string;
  subtitle: string;
  bullets: string[];
}

export interface TailorProposal {
  versionName: string;
  strategySummary: string;
  fitAssessment: string;
  recommendedTemplate: TemplateId;
  recommendedTheme: ThemeId;
  headline: string;
  intent: IntentInfo;
  experienceUpdates: TailorExperienceUpdate[];
  skills: Array<{ cat: string; items: string }>;
  tags: string[];
  evals: Array<{ title: string; body: string }>;
  helper: {
    keywords: string[];
    greeting: string;
    redFlags: string[];
    memos: Array<{ title: string; items: string[] }>;
  };
}

export interface ExperienceStarSuggestion {
  id: string;
  focus: string;
  situation: string;
  action: string;
  result: string;
  bullet: string;
}

export type RadarDimensionKey =
  | 'industryFit'
  | 'seniorityDepth'
  | 'projectRichness'
  | 'writingCraft';

export interface RadarDimensionScore {
  key: RadarDimensionKey;
  label: string;
  shortLabel: string;
  score: number;
  level: '优秀' | '良好' | '待提升' | '薄弱';
  summary: string;
  tip: string;
  jumpModule: string;
}

export interface ResumeCompetitivenessReport {
  overallScore: number;
  tierLabel: string;
  dimensions: RadarDimensionScore[];
  weakest: RadarDimensionScore;
  strongest: RadarDimensionScore;
  totalExpMonths: number;
  quantifiedRatioPct: number;
}

export interface ResumeKeyContentSummary {
  expCount: number;
  bulletCount: number;
  skillGroupCount: number;
  eduCount: number;
  certCount: number;
  customCount: number;
  keyTerms: string[];
  hasContent: boolean;
}

export interface TranslatedResumePayload {
  versionName?: string;
  basic?: {
    name?: string;
    headline?: string;
    location?: string;
    age?: string;
    extras?: Array<{ id?: string; label: string; value: string }>;
  };
  intent?: {
    position?: string;
    city?: string;
    salary?: string;
    availability?: string;
  };
  experience?: Array<{
    id?: string;
    company?: string;
    role?: string;
    period?: string;
    subtitle?: string;
    bullets?: string[];
    kpis?: Array<{ num: string; label: string }>;
  }>;
  skills?: Array<{ id?: string; cat: string; items: string }>;
  education?: Array<{
    id?: string;
    school?: string;
    major?: string;
    degree?: string;
    period?: string;
    desc?: string;
  }>;
  certs?: string[];
  tags?: string[];
  evals?: Array<{ id?: string; title: string; body: string }>;
  custom?: Array<{
    id?: string;
    title?: string;
    items?: unknown[];
  }>;
  glossaryNotes?: string[];
}



