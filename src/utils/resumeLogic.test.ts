import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RESUMES } from '../data/defaultResumes';
import { TEMPLATE_LIBRARY } from '../data/templateLibrary';
import {
  analyzeJdMatchLocal,
  applySectionLanguage,
  applyTailorProposal,
  applyTemplateStyleOnly,
  assembleAuditPrompt,
  buildAiEndpointPreview,
  buildAiRequestDefaults,
  buildExpandExperiencePrompt,
  buildJdExtractPrompt,
  buildJdSemanticScoringPrompt,
  buildPdfTitle,
  classifyAiNetworkError,
  clearPlaceholderContent,
  cloneResumeDoc,
  computeWeightedSemanticScore,
  countResumeChars,
  createCustomRoleDoc,
  deriveTargetedResumeVersion,
  detectWeakBulletOpener,
  emptyData,
  evaluateJdSkillsAgainstResume,
  extractLocalJdSkills,
  extractResumePositionLabel,
  flattenStructuredJdSkills,
  fmtRange,
  formatFontWeightLabel,
  formatLineHeightLabel,
  formatMarkdown,
  formatPlainText,
  formatWordHtml,
  getAllHelperMemos,
  getContactList,
  hasQuantifiedDescription,
  highlightJdSegments,
  isCustomAiReady,
  maskEmail,
  maskPhone,
  mergeImportedResumes,
  normalizeJdKeyword,
  normalizeJdSemanticMatchReport,
  normalizeMeta,
  normalizeStarSuggestions,
  normalizeStoredResumePayload,
  parseExternalAuditJson,
  parseExternalExpandExperienceJson,
  parseExternalJdExtractJson,
  parseExternalJdSemanticJson,
  parseExternalTailorJson,
  parseLinkedInProfileText,
  parsePlainTextResumeLocal,
  parseRange,
  preprocessJdText,
  resolveBaseFontWeight,
  resolveLineHeight,
  resolvePalette,
  resolvePortableSyncDecision,
  richSegs,
  runLocalAudit,
  runPdfExportPreflight,
  scoreJdSemanticRelevanceWithLlm,
  searchTemplates,
  summarizeAiConfigErrors,
  validateCustomAiConfig,
  validateExpandExperienceInput,
  wrapTextWithBold,
} from './resumeLogic';

test('richSegs parses bold markdown spans accurately', () => {
  const segs = richSegs('使用 **Python** 与 **Excel** 提升效率');
  assert.deepEqual(segs, [
    { text: '使用 ', bold: false },
    { text: 'Python', bold: true },
    { text: ' 与 ', bold: false },
    { text: 'Excel', bold: true },
    { text: ' 提升效率', bold: false },
  ]);
});

test('parseRange and fmtRange round-trip dates including ongoing', () => {
  const closed = parseRange('2022.07 - 2025.12');
  assert.equal(closed.parsed, true);
  assert.equal(closed.ongoing, false);
  assert.equal(
    fmtRange(closed.startYear, closed.startMonth, closed.endYear, closed.endMonth, closed.ongoing),
    '2022.07 - 2025.12',
  );

  const ongoing = parseRange('2023.4 - 至今');
  assert.equal(ongoing.parsed, true);
  assert.equal(ongoing.ongoing, true);
  assert.equal(
    fmtRange(ongoing.startYear, ongoing.startMonth, ongoing.endYear, ongoing.endMonth, ongoing.ongoing),
    '2023.04 - 至今',
  );
});

test('getContactList merges core fields and non-empty extras in order', () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const contacts = getContactList(doc.data);
  assert.equal(contacts[0].label, '电话');
  assert.equal(contacts[1].label, '邮箱');
  assert.ok(contacts.some((c) => c.label === '学历'));
});

test('runLocalAudit detects missing critical fields and page overflow', () => {
  const blankDoc = {
    id: 'blank',
    name: '空白',
    meta: normalizeMeta({ autofit: false }),
    data: emptyData(),
  };
  const checks = runLocalAudit(blankDoc, 2);
  const ids = checks.map((c) => c.id);
  assert.ok(ids.includes('no-name'));
  assert.ok(ids.includes('no-contact'));
  assert.ok(ids.includes('no-exp'));
  assert.ok(ids.includes('over-page'));
});

test('formatPlainText strips bold markers and omits hidden modules', () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  doc.meta.hidden.skills = true;
  const plain = formatPlainText(doc);
  assert.ok(plain.includes(doc.data.basic.name));
  assert.ok(!plain.includes('**'));
  assert.ok(!plain.includes('【技术工具与方法论】'));
});

test('normalizeMeta validates all 8 layouts, 10 themes, sectionStyle, and customColor', () => {
  const m1 = normalizeMeta({
    template: 'timeline',
    theme: 'steel-blue',
    sectionStyle: 'pill',
    customColor: '#1d4ed8',
  });
  assert.equal(m1.template, 'timeline');
  assert.equal(m1.theme, 'steel-blue');
  assert.equal(m1.sectionStyle, 'pill');
  assert.equal(m1.customColor, '#1d4ed8');

  const m2 = normalizeMeta({
    template: 'top-banner-split',
    theme: 'forest-green',
    sectionStyle: 'minimal',
    customColor: 'not-a-hex',
  });
  assert.equal(m2.template, 'top-banner-split');
  assert.equal(m2.theme, 'forest-green');
  assert.equal(m2.sectionStyle, 'minimal');
  assert.equal(m2.customColor, undefined);

  const pal = resolvePalette('navy-blue', '#1d4ed8');
  assert.equal(pal.accent, '#1d4ed8');
  assert.ok(pal.soft.startsWith('#'));
  assert.ok(pal.primary.startsWith('#'));
});

test('resolveBaseFontWeight, formatFontWeightLabel, and normalizeMeta handle --r-fw-base cleanly', () => {
  assert.equal(resolveBaseFontWeight(undefined), 400);
  assert.equal(resolveBaseFontWeight(Number.NaN), 400);
  assert.equal(resolveBaseFontWeight(150), 300);
  assert.equal(resolveBaseFontWeight(950), 700);
  assert.equal(resolveBaseFontWeight(550), 550);

  assert.equal(formatFontWeightLabel(300), '纤细');
  assert.equal(formatFontWeightLabel(350), '轻盈');
  assert.equal(formatFontWeightLabel(400), '标准');
  assert.equal(formatFontWeightLabel(500), '稳重');
  assert.equal(formatFontWeightLabel(600), '半粗');
  assert.equal(formatFontWeightLabel(700), '粗体');

  const valid = normalizeMeta({ fw: 550 });
  assert.equal(valid.fw, 550);

  const outOfRange = normalizeMeta({ fw: 999 });
  assert.equal(outOfRange.fw, 400);

  const omitted = normalizeMeta({});
  assert.equal(omitted.fw, 400);
});

test('resolveLineHeight, formatLineHeightLabel, and normalizeMeta handle --r-lh cleanly', () => {
  assert.equal(resolveLineHeight(undefined), 1.52);
  assert.equal(resolveLineHeight(Number.NaN), 1.52);
  assert.equal(resolveLineHeight(0.9), 1.2);
  assert.equal(resolveLineHeight(2.8), 2.0);
  assert.equal(resolveLineHeight(1.634), 1.63);

  assert.equal(formatLineHeightLabel(1.24), '超紧凑');
  assert.equal(formatLineHeightLabel(1.4), '紧凑');
  assert.equal(formatLineHeightLabel(1.52), '标准');
  assert.equal(formatLineHeightLabel(1.68), '舒展');
  assert.equal(formatLineHeightLabel(1.9), '宽松');

  const valid = normalizeMeta({ lh: 1.73 });
  assert.equal(valid.lh, 1.73);

  const lowBound = normalizeMeta({ lh: 1.2 });
  assert.equal(lowBound.lh, 1.2);

  const outOfRange = normalizeMeta({ lh: 3.1 });
  assert.equal(outOfRange.lh, 1.52);
});

test('searchTemplates finds Automation/PLC, Game, Finance, Nursing, and Sales templates', () => {
  assert.ok(TEMPLATE_LIBRARY.length >= 12);

  const autoHits = searchTemplates(TEMPLATE_LIBRARY, '自动化', 'all');
  assert.ok(autoHits.some((e) => e.id === 'tpl-automation-plc'));

  const plcHits = searchTemplates(TEMPLATE_LIBRARY, 'PLC', 'all');
  assert.ok(plcHits.some((e) => e.id === 'tpl-automation-plc'));

  const gameHits = searchTemplates(TEMPLATE_LIBRARY, '游戏', 'all');
  assert.ok(gameHits.some((e) => e.id === 'tpl-game-designer'));

  const financeHits = searchTemplates(TEMPLATE_LIBRARY, '会计', 'all');
  assert.ok(financeHits.some((e) => e.id === 'tpl-finance-audit'));

  const nursingHits = searchTemplates(TEMPLATE_LIBRARY, '护理', 'all');
  assert.ok(nursingHits.some((e) => e.id === 'tpl-medical-nursing'));

  const salesHits = searchTemplates(TEMPLATE_LIBRARY, '外贸', 'all');
  assert.ok(salesHits.some((e) => e.id === 'tpl-sales-trade'));

  // Ensure every eval/experience/skill item in all 12 templates has a non-empty unique id
  for (const entry of TEMPLATE_LIBRARY) {
    for (const ev of entry.doc.data.evals) assert.ok(ev.id, `${entry.id} eval missing id`);
    for (const exp of entry.doc.data.experience) assert.ok(exp.id, `${entry.id} exp missing id`);
    for (const sk of entry.doc.data.skills) assert.ok(sk.id, `${entry.id} skill missing id`);
  }
});

test('createCustomRoleDoc picks smart layouts for niche roles', () => {
  const autoDoc = createCustomRoleDoc('非标自动化视觉调试');
  assert.equal(autoDoc.meta.template, 'timeline');
  assert.equal(autoDoc.meta.theme, 'steel-blue');
  assert.equal(autoDoc.data.intent.position, '非标自动化视觉调试');

  const gameDoc = createCustomRoleDoc('独立游戏关卡策划');
  assert.equal(gameDoc.meta.template, 'top-banner-split');
  assert.equal(gameDoc.meta.theme, 'purple');

  const lawDoc = createCustomRoleDoc('知识产权法务专员');
  assert.equal(lawDoc.meta.template, 'centered-classic');
});

test('analyzeJdMatchLocal scores matched and missing JD keywords completely offline', () => {
  const autoEntry = TEMPLATE_LIBRARY.find((e) => e.id === 'tpl-automation-plc')!;
  const jd = '任职要求：熟悉西门子 S7-1500 与 TIA Portal 编程，掌握 PROFINET、EPLAN 绘图及 EtherCAT 总线，具备 Beckhoff TwinCAT 或 LabVIEW 经验优先。';
  const result = analyzeJdMatchLocal(autoEntry.doc, jd);

  assert.ok(result.totalKeywords >= 5);
  assert.ok(result.matched.some((k) => k.toLowerCase().includes('eplan')));
  assert.ok(result.matched.some((k) => k.toLowerCase().includes('profinet')));
  assert.ok(result.matched.includes('TIA Portal'));
  assert.ok(!result.matched.includes('Portal') && !result.missing.includes('Portal'));
  assert.ok(result.missing.some((k) => k.toLowerCase().includes('labview') || k.toLowerCase().includes('twincat')));
  assert.ok(result.scorePct > 0 && result.scorePct < 100);
});

test('preprocessJdText cleans mojibake, HTML, zero-width chars, emojis, full-width ASCII, and splits slashes safely', () => {
  const noisy =
    '\uFEFF<p>🔥 1、**熟练使用** Ｊａｖａ&nbsp;/&nbsp;Ｐｙｔｈｏｎ\u200B\uFFFD，熟悉 C/C++ 与 CI/CD 流程！</p>\n• 掌握 SQL/Tableau';
  const { cleaned, noiseRemovedCount } = preprocessJdText(noisy);

  assert.ok(noiseRemovedCount >= 5);
  assert.ok(!cleaned.includes('<p>') && !cleaned.includes('&nbsp;'));
  assert.ok(!cleaned.includes('\u200B') && !cleaned.includes('\uFFFD') && !cleaned.includes('\uFEFF'));
  assert.ok(!cleaned.includes('🔥') && !cleaned.includes('**'));
  assert.ok(cleaned.includes('Java, Python'));
  assert.ok(cleaned.includes('SQL, Tableau'));
  assert.ok(cleaned.includes('C/C++'), 'should preserve protected C/C++ token');
  assert.ok(cleaned.includes('CI/CD'), 'should preserve protected CI/CD token');
});

test('normalizeJdKeyword collapses proficiency variants and synonym aliases while filtering HR buzzwords', () => {
  const a = normalizeJdKeyword('熟练使用 Java');
  const b = normalizeJdKeyword('熟悉 Java');
  const c = normalizeJdKeyword('精通 Java 开发经验');
  assert.equal(a?.canonical, 'Java');
  assert.equal(b?.canonical, 'Java');
  assert.equal(c?.canonical, 'Java');
  assert.equal(a?.key, b?.key);

  assert.equal(normalizeJdKeyword('熟悉 K8s')?.canonical, 'Kubernetes');
  assert.equal(normalizeJdKeyword('熟练掌握 PowerBI')?.canonical, 'Power BI');
  assert.equal(normalizeJdKeyword('熟悉西门子博途')?.canonical, 'TIA Portal');
  assert.equal(normalizeJdKeyword('抗压能力'), null);
  assert.equal(normalizeJdKeyword('核心抓手'), null);
  assert.equal(normalizeJdKeyword('业务闭环'), null);
});

test('analyzeJdMatchLocal applies synonym lexicon, word boundaries, fuzzy Chinese matching, and core-first weighting', () => {
  const data = emptyData();
  data.basic.name = '测试候选人';
  data.skills = [
    { id: 's1', cat: '后端与数据', items: '熟悉 Java、MySQL、MongoDB、Kubernetes 容器编排、PowerBI 看板' },
  ];
  data.experience = [
    {
      id: 'e1',
      company: '星图零售科技',
      role: '后端与数据工程师',
      period: '2022.06 - 至今',
      subtitle: '负责核心业务数据与零售门店分析',
      kpis: [],
      bullets: [
        '主导华南区零售进销存数据治理与异常盘点自动化，周报耗时缩短 80%。',
        '构建 RFM 会员分层与促活运营策略，推动 30 日复购率提升 14%。',
      ],
    },
  ];
  const doc = {
    id: 'jd-match-test',
    name: '测试简历',
    meta: normalizeMeta({}),
    data,
  };

  const jd = `
    <p>1. 精通 Ｊａｖａ 开发，熟练使用 Java 与 SQL 查询\uFFFD；</p>
    2. 熟悉 K8s 与 Power BI 报表搭建，具备商业智能分析能力；
    3. 负责零售进销存管理与会员分层运营，抗压能力强、有大局观与核心抓手；
    4. 精通 Go 语言高并发服务端架构；
    5. 了解 Rust 或 Scala 者优先。
  `;

  const result = analyzeJdMatchLocal(doc, jd);

  // Deduplication: "精通 Java" and "熟练使用 Java" collapse to a single canonical "Java"
  assert.equal(result.matched.filter((k) => k === 'Java').length, 1);
  assert.equal(result.missing.filter((k) => k === 'Java').length, 0);

  // Synonym & one-way entailment hits: SQL <- MySQL, Kubernetes <- K8s, Power BI <- PowerBI, BI 看板 <- PowerBI
  assert.ok(result.matched.includes('SQL'));
  assert.ok(result.matched.includes('Kubernetes'));
  assert.ok(result.matched.includes('Power BI'));
  assert.ok((result.synonymMatchedCount || 0) >= 2);
  assert.ok(result.matchedDetails?.some((d) => d.keyword === 'SQL' && d.matchType === 'synonym'));

  // Word-boundary protection: "Go" must NOT falsely match "MongoDB"
  assert.ok(result.missing.includes('Go'), 'Go must not falsely match MongoDB');

  // Fuzzy semantic match for ambiguous Chinese descriptions
  assert.ok(
    result.matchedDetails?.some((d) => d.matchType === 'fuzzy'),
    'should fuzzy-match ambiguous Chinese domain descriptions',
  );
  assert.ok((result.fuzzyMatchedCount || 0) >= 1);

  // Vague HR buzzwords and orphan trailing verbs (e.g. "查询" from "SQL 查询") must not pollute missing keywords
  assert.ok(!result.missing.some((k) => /抗压|大局观|核心抓手|^查询$/.test(k)));

  // Weighted ordering: core missing skill ("Go") must rank ahead of bonus missing skills ("Rust"/"Scala")
  const goIdx = result.missing.indexOf('Go');
  const rustIdx = result.missing.indexOf('Rust');
  assert.ok(goIdx !== -1 && rustIdx !== -1 && goIdx < rustIdx);
  const goDetail = result.missingDetails?.find((d) => d.keyword === 'Go');
  const rustDetail = result.missingDetails?.find((d) => d.keyword === 'Rust');
  assert.equal(goDetail?.tier, 'core');
  assert.equal(rustDetail?.tier, 'bonus');
});

test('dual-engine LLM JD extractor builds HR/tech prompt, parses structured & flat JSON, supports manual edits and highlights', () => {
  const prompt = buildJdExtractPrompt('精通 React，了解 Rust 优先，要求抗压能力强、有责任心', '高级前端工程师');
  assert.ok(prompt.includes('资深的 HR 和技术专家'));
  assert.ok(prompt.includes('忽略所有软性要求'));
  assert.ok(prompt.includes('高级前端工程师'));

  // 1. Parse canonical categories JSON wrapped in DeepSeek-R1 <think> + markdown fence
  const structuredRaw = `<think>Extracting hard skills { "draft": 1 }...</think>
\`\`\`json
{
  "categories": [
    { "name": "前端", "items": [{ "keyword": "React", "tier": "core" }, { "keyword": "TypeScript", "tier": "standard" }] },
    { "name": "数据库", "items": [{ "keyword": "SQL", "tier": "core" }] },
    { "name": "加分项", "items": [{ "keyword": "Rust", "tier": "bonus" }, { "keyword": "有责任心", "tier": "core" }] }
  ],
  "ignoredSoftSkills": ["抗压能力强", "有责任心"]
}
\`\`\``;
  const parsedStructured = parseExternalJdExtractJson(structuredRaw);
  assert.equal(parsedStructured.categories.length, 3);
  assert.deepEqual(parsedStructured.ignoredSoftSkills, ['抗压能力强', '有责任心']);
  // HR fluff accidentally returned by LLM is still filtered defensively
  assert.ok(!parsedStructured.categories[2].items.some((i) => i.keyword.includes('责任心')));

  // 2. Parse flexible flat category JSON (e.g. from ChatGPT/Kimi) with proficiency levels
  const flatRaw = JSON.stringify({
    前端: ['精通 Vue', '熟悉 TypeScript'],
    后端: { 精通: ['Python'], 了解: ['Go'] },
    加分项: ['Kubernetes'],
  });
  const parsedFlat = parseExternalJdExtractJson(flatRaw);
  const flatSkills = flattenStructuredJdSkills(parsedFlat);
  assert.equal(flatSkills.find((s) => s.keyword === 'Vue')?.tier, 'core');
  assert.equal(flatSkills.find((s) => s.keyword === 'Python')?.tier, 'core');
  assert.equal(flatSkills.find((s) => s.keyword === 'Go')?.tier, 'bonus');
  assert.equal(flatSkills.find((s) => s.keyword === 'Kubernetes')?.category, '加分项');

  // 3. Human-in-the-loop [x] removal & manual addition recalculate score live
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const baseSkills = extractLocalJdSkills('精通 Python、SQL，熟悉 Java，了解 Rust 优先').skills;
  const before = evaluateJdSkillsAgainstResume(doc, baseSkills);
  assert.ok(before.missing.includes('Java'));

  // Remove "Java" via [x] -> score goes up and Java disappears
  const afterRemove = evaluateJdSkillsAgainstResume(
    doc,
    baseSkills.filter((s) => s.keyword !== 'Java'),
  );
  assert.ok(!afterRemove.missing.includes('Java'));
  assert.ok(afterRemove.scorePct > before.scorePct);

  // Manually add "Tableau" (matched in starter doc) and "Docker" (missing)
  const afterAdd = evaluateJdSkillsAgainstResume(doc, [
    ...baseSkills.filter((s) => s.keyword !== 'Java'),
    { keyword: 'Tableau', tier: 'core', source: 'manual' },
    { keyword: 'Docker', tier: 'core', source: 'manual' },
  ]);
  assert.ok(afterAdd.matchedDetails?.some((d) => d.keyword === 'Tableau' && d.source === 'manual'));
  assert.ok(afterAdd.missingDetails?.some((d) => d.keyword === 'Docker' && d.source === 'manual'));

  // 4. In-context JD highlighter tags matched & missing segments cleanly
  const segments = highlightJdSegments(
    '精通 Python 与 SQL，了解 Docker 优先',
    [...(afterAdd.matchedDetails || []), ...(afterAdd.missingDetails || [])],
  );
  assert.ok(segments.some((s) => s.text.toLowerCase() === 'python' && s.detail?.matchType === 'exact'));
  assert.ok(segments.some((s) => s.text.toLowerCase() === 'docker' && s.detail?.matchType === 'missing'));
});

test('applyTailorProposal creates non-destructive new version preserving real company & dates', () => {
  const base = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const originalCompany = base.data.experience[0].company;
  const originalPeriod = base.data.experience[0].period;
  const proposal = {
    versionName: 'AI 定制 · 产品运营专员',
    strategySummary: '突出数据分析与看板运营能力',
    fitAssessment: '高度适配',
    recommendedTemplate: 'card-grid' as const,
    recommendedTheme: 'teal-orange' as const,
    headline: '产品运营专员 | 擅长数据监控与活动复盘',
    intent: {
      position: '产品运营专员',
      city: '深圳',
      salary: '12K-16K',
      availability: '随时到岗',
    },
    experienceUpdates: [
      {
        id: base.data.experience[0].id,
        role: '产品数据运营',
        subtitle: '负责用户增长监控与复盘看板',
        bullets: ['**漏斗归因**：定位转化流失节点并推动策略优化。'],
      },
    ],
    skills: [{ cat: '数据分析', items: 'SQL / Excel / Python' }],
    tags: ['产品运营', '增长分析'],
    evals: [{ title: '结果导向', body: '注重数据验证与落地。' }],
    helper: {
      keywords: ['产品运营', '增长运营'],
      greeting: '您好，具备 3 年数据归因与自动化看板经验。',
      redFlags: ['警惕纯客服包装岗位'],
      memos: [{ title: '面试重点', items: ['准备增长案例'] }],
    },
  };

  const created = applyTailorProposal(base, proposal, 'new-version');
  assert.notEqual(created.id, base.id);
  assert.equal(created.name, 'AI 定制 · 产品运营专员');
  assert.equal(created.meta.template, 'card-grid');
  assert.equal(created.data.experience[0].company, originalCompany);
  assert.equal(created.data.experience[0].period, originalPeriod);
  assert.equal(created.data.experience[0].role, '产品数据运营');
  assert.deepEqual(created.data.helper.keywords, ['产品运营', '增长运营']);
});

test('getAllHelperMemos merges structured helper memos and hidden custom bullet modules', () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  doc.data.custom.push({
    id: 'hidden-memo',
    title: '隐藏面试话术',
    kind: 'bullets',
    show: false,
    items: ['问题 A 应对思路'],
  });
  const memos = getAllHelperMemos(doc.data);
  assert.ok(memos.some((m) => m.title === '隐藏面试话术' && m.source === 'custom'));
  assert.ok(memos.some((m) => m.source === 'helper'));
});

test('buildPdfTitle and assembleAuditPrompt format outputs cleanly', () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const title = buildPdfTitle(doc);
  assert.ok(title.includes(doc.data.basic.name));

  const prompt = assembleAuditPrompt('请用 HR 视角审查', '简历内容A', '岗位JD内容B');
  assert.ok(prompt.includes('请用 HR 视角审查'));
  assert.ok(prompt.includes('岗位JD内容B'));
  assert.ok(prompt.includes('简历内容A'));
});

test('maskPhone and maskEmail redact sensitive contact info cleanly', () => {
  assert.equal(maskPhone('13800001234'), '138****1234');
  assert.equal(maskEmail('linzhixia@example.com'), 'li***@example.com');
  assert.equal(maskPhone(''), '');
});

test('wrapTextWithBold toggles markdown bold on selected span', () => {
  const bolded = wrapTextWithBold('完成月度对账零差错', 2, 6);
  assert.equal(bolded, '完成**月度对账**零差错');
  const unbolded = wrapTextWithBold('完成**月度对账**零差错', 2, 10);
  assert.equal(unbolded, '完成月度对账零差错');
});

test('external AI bridge parses markdown-fenced JSON from DeepSeek/Claude/Ollama', () => {
  const tailorRaw =
    '```json\n{"versionName":"DeepSeek 定制版","headline":"语文教研专员","intent":{"position":"教研"},"experienceUpdates":[],"skills":[],"tags":["教研"],"evals":[],"helper":{"keywords":["语文教研"],"greeting":"您好","redFlags":[],"memos":[]}}\n```';
  const parsedTailor = parseExternalTailorJson(tailorRaw);
  assert.equal(parsedTailor.versionName, 'DeepSeek 定制版');
  assert.equal(parsedTailor.headline, '语文教研专员');

  const auditRaw =
    'Here is the audit:\n```json\n{"overallVerdict":"结构清晰","readinessLevel":"可直接投递","strengths":["教学案例扎实"],"findings":[{"severity":"high","module":"experience","title":"突出代表课例","issue":"细节偏简略","suggestion":"补充具体教研课题名称","rewriteExample":"主导校本散文读本编写"}]}\n```';
  const parsedAudit = parseExternalAuditJson(auditRaw);
  assert.equal(parsedAudit.findings.length, 1);
  assert.equal(parsedAudit.findings[0].module, 'experience');
});

test('commercial exports (Markdown & Word HTML) and style-only switching preserve user content', () => {
  const humanitiesDoc = cloneResumeDoc(TEMPLATE_LIBRARY.find((e) => e.id === 'tpl-humanities-edu')!.doc);
  const creativeDoc = cloneResumeDoc(TEMPLATE_LIBRARY.find((e) => e.id === 'tpl-creative-brand')!.doc);

  const md = formatMarkdown(humanitiesDoc);
  assert.ok(md.includes('# 林知夏'));
  assert.ok(md.includes('## 代表作品与教研成果'));

  const wordHtml = formatWordHtml(humanitiesDoc);
  assert.ok(wordHtml.includes('urn:schemas-microsoft-com:office:word'));
  assert.ok(wordHtml.includes('林知夏'));

  const restyled = applyTemplateStyleOnly(humanitiesDoc, creativeDoc);
  assert.equal(restyled.data.basic.name, '林知夏');
  assert.equal(restyled.meta.template, 'two-column');
  assert.equal(restyled.meta.sidebarStyle, 'dark');
  assert.equal(restyled.meta.sectionStyle, 'pill');

  const cleared = clearPlaceholderContent(humanitiesDoc);
  assert.equal(cleared.data.basic.name, '你的姓名');
  assert.equal(cleared.meta.template, humanitiesDoc.meta.template);
});

test('isCustomAiReady validates remote API keys and allows keyless local Ollama', () => {
  assert.equal(
    isCustomAiReady({
      enabled: true,
      protocol: 'openai',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test-123',
      model: 'deepseek-chat',
      fetchedModels: [],
    }),
    true,
  );
  assert.equal(
    isCustomAiReady({
      enabled: true,
      protocol: 'openai',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      fetchedModels: [],
    }),
    false,
  );
  assert.equal(
    isCustomAiReady({
      enabled: true,
      protocol: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'qwen2.5:14b',
      fetchedModels: [],
    }),
    true,
  );
});

test('countResumeChars, detectWeakBulletOpener, and applySectionLanguage work reliably', () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  assert.ok(countResumeChars(doc) > 200);

  assert.ok(detectWeakBulletOpener('负责公司PLC设备日常调试与产线巡检工作')?.includes('负责'));
  assert.equal(detectWeakBulletOpener('主导西门子 S7-1500 产线架构设计与调试'), null);

  applySectionLanguage(doc.meta, 'en');
  assert.equal(doc.meta.titles.experience, 'EXPERIENCE');
  assert.equal(doc.meta.titles.skills, 'SKILLS');

  applySectionLanguage(doc.meta, 'zh');
  assert.equal(doc.meta.titles.experience, undefined);
});

test('parsePlainTextResumeLocal extracts structured fields from pasted raw resume text', () => {
  const sample = `
周明远
13912345678 | zhoumingyuan@example.com | 苏州 | 27岁
求职意向：PLC 电气自动化工程师

教育背景
南京工业大学 自动化 本科 2017.09 - 2021.06

工作经历
某智能装备有限公司 2021.07 - 至今
• 主导西门子 S7-1500 产线程序设计与 EPLAN 电气绘图
• 完成 8 条非标装配线现场调试与 SAT 验收

专业技能
PLC 编程：西门子 TIA Portal、汇川 H5U、三菱 FX5U
通信协议：PROFINET、EtherCAT、Modbus-TCP
`;
  const parsed = parsePlainTextResumeLocal(sample);
  assert.equal(parsed.data.basic.name, '周明远');
  assert.equal(parsed.data.basic.phone, '13912345678');
  assert.equal(parsed.data.basic.email, 'zhoumingyuan@example.com');
  assert.equal(parsed.data.basic.location, '苏州');
  assert.equal(parsed.data.education[0].school, '南京工业大学');
  assert.equal(parsed.data.experience[0].bullets.length, 2);
  assert.equal(parsed.data.skills.length, 2);
});

test('external AI JSON parsers strip DeepSeek-R1 <think> traces containing braces', () => {
  const reasoningOutput = `<think>
Let me inspect the candidate data { "debug": true } and check metrics { "score": 90 }.
</think>
{"overallVerdict":"重点明确","readinessLevel":"可直接投递","strengths":["项目结构清晰"],"findings":[{"severity":"low","module":"skills","title":"补充版本","issue":"略","suggestion":"补充版本号","rewriteExample":"React 19"}]}`;
  const audit = parseExternalAuditJson(reasoningOutput);
  assert.equal(audit.overallVerdict, '重点明确');
  assert.equal(audit.findings.length, 1);

  const tailorWithThink = `<think>Considering { "draft": 1 }...</think>
{"versionName":"推理模型定制版","headline":"自动化系统工程师","intent":{"position":"自动化工程师"},"experienceUpdates":[],"skills":[],"tags":["PLC"],"evals":[],"helper":{"keywords":["PLC"],"greeting":"您好","redFlags":[],"memos":[]}}`;
  const tailor = parseExternalTailorJson(tailorWithThink);
  assert.equal(tailor.versionName, '推理模型定制版');
});

test('mergeImportedResumes appends single-doc JSON without wiping existing resumes', () => {
  const existing = DEFAULT_RESUMES.map(cloneResumeDoc);
  const singleIncoming = [cloneResumeDoc(existing[0])];

  const singleRes = mergeImportedResumes(existing, singleIncoming);
  assert.equal(singleRes.mode, 'append-single');
  assert.equal(singleRes.resumes.length, existing.length + 1);
  assert.notEqual(singleRes.activeId, existing[0].id);
  assert.equal(singleRes.resumes[singleRes.resumes.length - 1].id, singleRes.activeId);

  const backupIncoming = [cloneResumeDoc(existing[0]), cloneResumeDoc(existing[1])];
  const backupRes = mergeImportedResumes(existing, backupIncoming);
  assert.equal(backupRes.mode, 'restore-backup');
  assert.equal(backupRes.resumes.length, 2);
  assert.equal(backupRes.activeId, backupRes.resumes[0].id);
});

test('validateCustomAiConfig enforces Base URL, API Key, Model ID and trims cleanly', () => {
  const validRemote = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: '  https://api.deepseek.com/v1///  ',
    apiKey: '  sk-valid-key-123  ',
    model: '  deepseek-reasoner  ',
    fetchedModels: ['deepseek-chat', 'deepseek-reasoner'],
  });
  assert.equal(validRemote.valid, true);
  assert.equal(validRemote.normalized.baseUrl, 'https://api.deepseek.com/v1');
  assert.equal(validRemote.normalized.apiKey, 'sk-valid-key-123');
  assert.equal(validRemote.normalized.model, 'deepseek-reasoner');
  assert.ok(validRemote.normalized.savedModels?.includes('deepseek-reasoner'));

  const validOllama = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    model: 'qwen2.5:14b',
  });
  assert.equal(validOllama.valid, true);
  assert.equal(validOllama.isLocal, true);

  const invalidUrl = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'not-a-valid-url',
    apiKey: 'sk-123456',
    model: 'gpt-4o-mini',
  });
  assert.equal(invalidUrl.valid, false);
  assert.ok(invalidUrl.errors.baseUrl);

  const ssrfBlocked = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'http://169.254.169.254/latest/meta-data',
    apiKey: 'sk-123456',
    model: 'gpt-4o-mini',
  });
  assert.equal(ssrfBlocked.valid, false);
  assert.ok(ssrfBlocked.errors.baseUrl?.includes('元数据'));

  const missingKeyAndModel = validateCustomAiConfig({
    enabled: true,
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'sk bad key',
    model: '   ',
  });
  assert.equal(missingKeyAndModel.valid, false);
  assert.ok(missingKeyAndModel.errors.apiKey);
  assert.ok(missingKeyAndModel.errors.model);

  assert.equal(
    buildAiEndpointPreview('openai', 'https://api.deepseek.com/v1/'),
    'https://api.deepseek.com/v1/chat/completions',
  );
  assert.equal(
    buildAiEndpointPreview('anthropic', 'https://api.anthropic.com'),
    'https://api.anthropic.com/v1/messages',
  );

  const defaultsValid = buildAiRequestDefaults(validRemote.normalized, 'auto');
  assert.equal(defaultsValid.customConfig?.model, 'deepseek-reasoner');
  const defaultsInvalid = buildAiRequestDefaults(invalidUrl.normalized, 'openai');
  assert.equal(defaultsInvalid.customConfig, undefined);
});

test('validateCustomAiConfig rejects malformed URLs, bad API Key formats, and empty/invalid Model IDs with concrete reasons', () => {
  // Missing http:// or https:// protocol
  const missingProto = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'api.deepseek.com/v1',
    apiKey: 'sk-valid-key-9999',
    model: 'deepseek-chat',
  });
  assert.equal(missingProto.valid, false);
  assert.ok(missingProto.errors.baseUrl?.includes('https://'));

  // Unsupported ftp:// protocol
  const ftpProto = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'ftp://api.deepseek.com/v1',
    apiKey: 'sk-valid-key-9999',
    model: 'deepseek-chat',
  });
  assert.equal(ftpProto.valid, false);
  assert.ok(ftpProto.errors.baseUrl?.includes('https://'));

  // Incomplete remote hostname without valid domain dot
  const badDomain = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'https://abc',
    apiKey: 'sk-valid-key-9999',
    model: 'deepseek-chat',
  });
  assert.equal(badDomain.valid, false);
  assert.ok(badDomain.errors.baseUrl?.includes('域名'));

  // API Key with Bearer prefix, placeholder, or Chinese characters
  const bearerKey = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'Bearer sk-12345678',
    model: 'deepseek-chat',
  });
  assert.equal(bearerKey.valid, false);
  assert.ok(bearerKey.errors.apiKey?.includes('Bearer'));

  const placeholderKey = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-...',
    model: 'deepseek-chat',
  });
  assert.equal(placeholderKey.valid, false);
  assert.ok(placeholderKey.errors.apiKey?.includes('格式错误'));

  // Empty / invisible zero-width Model ID & Chinese Model ID
  const zeroWidthModel = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-valid-key-9999',
    model: ' \u200B  ',
  });
  assert.equal(zeroWidthModel.valid, false);
  assert.ok(zeroWidthModel.errors.model?.includes('Model ID 不能为空'));

  const chineseModel = validateCustomAiConfig({
    enabled: true,
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-valid-key-9999',
    model: '深度求索模型',
  });
  assert.equal(chineseModel.valid, false);
  assert.ok(chineseModel.errors.model?.includes('Model ID 格式错误'));

  // Concrete error summary & network error classification
  const summary = summarizeAiConfigErrors({
    baseUrl: missingProto.errors.baseUrl,
    apiKey: bearerKey.errors.apiKey,
    model: zeroWidthModel.errors.model,
  });
  assert.ok(summary.includes('3 项错误'));
  assert.ok(summary.includes('https://'));
  assert.ok(summary.includes('Bearer'));
  assert.ok(summary.includes('Model ID 不能为空'));

  assert.ok(classifyAiNetworkError('getaddrinfo ENOTFOUND bad.invalid').includes('网络不可达'));
  assert.ok(classifyAiNetworkError('connect ECONNREFUSED 127.0.0.1:11434').includes('连接被拒绝'));
  assert.ok(classifyAiNetworkError('HTTP 401: invalid_api_key', 401).includes('API Key 鉴权失败'));
  assert.ok(classifyAiNetworkError('Request aborted timeout', 504).includes('超时'));
});

test('runPdfExportPreflight detects required gaps, short content, placeholder residue, and duplicates', () => {
  // 1. Clean resume with real contact passes all 4 pillars
  const cleanDoc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  cleanDoc.data.basic.phone = '13812345678';
  cleanDoc.data.basic.email = 'chenyu.jiang@gmail.com';
  const readyReport = runPdfExportPreflight(cleanDoc, 1, 88);
  assert.equal(readyReport.status, 'ready');
  assert.equal(readyReport.issues.length, 0);
  assert.equal(readyReport.passedCount, 4);

  // 2. Starter template with @example.com & 13900008812 catches placeholder contact before export
  const templateReport = runPdfExportPreflight(DEFAULT_RESUMES[0], 1, 90);
  assert.equal(templateReport.status, 'blocked');
  assert.ok(templateReport.issues.some((i) => i.category === 'placeholder'));

  // 3. Cleared / overly short resume catches required + too-short + placeholder simultaneously
  const clearedDoc = clearPlaceholderContent(cleanDoc);
  const clearedReport = runPdfExportPreflight(clearedDoc, 1, 25);
  assert.equal(clearedReport.status, 'blocked');
  assert.ok(clearedReport.issues.some((i) => i.category === 'required'));
  assert.ok(clearedReport.issues.some((i) => i.category === 'length'));
  assert.ok(clearedReport.issues.some((i) => i.category === 'placeholder'));

  // 4. Duplicated bullets, repeated tags, and XXX placeholders are flagged with samples
  const dupDoc = cloneResumeDoc(cleanDoc);
  dupDoc.data.experience[0].bullets = [
    '主导华南区 40 家门店进销存台账清洗与自动化周报搭建，周报耗时压缩 85%。',
    '主导华南区 40 家门店进销存台账清洗与自动化周报搭建，周报耗时压缩 85%。',
    '负责 XXX 项目',
  ];
  dupDoc.data.tags = ['SQL/Python', 'SQL/Python'];
  const dupReport = runPdfExportPreflight(dupDoc, 1, 75);
  assert.equal(dupReport.status, 'blocked');
  const dupIssue = dupReport.issues.find((i) => i.category === 'duplicate');
  assert.ok(dupIssue);
  assert.ok((dupIssue?.samples?.length || 0) >= 2);
  const shortBulletIssue = dupReport.issues.find((i) => i.id === 'pf-short-bullets');
  assert.ok(shortBulletIssue);
  const phIssue = dupReport.issues.find((i) => i.category === 'placeholder');
  assert.ok(phIssue?.samples?.some((s) => s.includes('XXX')));
});

test('hasQuantifiedDescription distinguishes percentages, currencies, numbers, and bare dates', () => {
  assert.deepEqual(hasQuantifiedDescription('推动季度复购率提升 14.5%'), {
    hasAny: true,
    hasPercent: true,
    hasCurrency: false,
    hasNumber: false,
  });
  assert.equal(hasQuantifiedDescription('主导大客户开拓，年度回款达 ¥320 万元').hasCurrency, true);
  assert.equal(hasQuantifiedDescription('统筹 40+ 门店与 12 个省份台账核对').hasNumber, true);
  assert.equal(hasQuantifiedDescription('2023.05 负责团队日常运营协同与流程梳理').hasAny, false);
  assert.equal(hasQuantifiedDescription('负责销售数据分析并推动团队效率提升').hasAny, false);
});

test('runLocalAudit detects missing percentages/numbers/amounts and generates context-aware enhancement suggestions', () => {
  // 1. Starter doc 0 has quantified bullets across all entries -> no metrics warning
  const richChecks = runLocalAudit(DEFAULT_RESUMES[0], 1);
  assert.equal(
    richChecks.some((c) => c.id === 'no-metrics' || c.id === 'low-metrics'),
    false
  );

  // 2. Resume with zero quantification triggers warn-level no-metrics with tailored suggestions
  const unquantDoc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  unquantDoc.data.experience[0].bullets = [
    '负责大客户销售拓展和签约回款跟进工作。',
    '使用脚本优化自动化周报流程，提升团队日常处理效率。',
    '协调供应商采购并优化运营成本控制方案。',
  ];
  unquantDoc.data.experience[1].bullets = ['协助整理行业分析文档与日常会议纪要。'];

  const noMetricChecks = runLocalAudit(unquantDoc, 1);
  const noMetrics = noMetricChecks.find((c) => c.id === 'no-metrics');
  assert.ok(noMetrics, 'should emit no-metrics check when zero bullets are quantified');
  assert.equal(noMetrics?.lv, 'warn');
  assert.equal(noMetrics?.enhancements?.length, 4);
  assert.ok(noMetrics?.enhancements?.[0].suggestedText.includes('万元'));
  assert.ok(noMetrics?.enhancements?.[1].suggestedText.includes('效率提升'));
  assert.ok(noMetrics?.enhancements?.[2].suggestedText.includes('成本降低'));

  // 3. Resume with mixed bullets (1 quantified + 2 unquantified) triggers tip-level low-metrics targeting only unquantified bullets
  const partialDoc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  partialDoc.data.experience[0].bullets = [
    '通过自动化脚本将周报耗时缩短 85%。',
    '负责区域客户渠道开拓与大客户回款推进。',
    '负责线上活动策划与团队协作统筹。',
  ];
  const partialChecks = runLocalAudit(partialDoc, 1);
  const lowMetrics = partialChecks.find((c) => c.id === 'low-metrics');
  assert.ok(lowMetrics, 'should emit low-metrics check when key bullets lack quantification');
  assert.equal(lowMetrics?.lv, 'tip');
  assert.equal(lowMetrics?.enhancements?.length, 2);
  assert.equal(lowMetrics?.enhancements?.[0].bulletIndex, 1);
  assert.equal(lowMetrics?.enhancements?.[1].bulletIndex, 2);
});

test('deriveTargetedResumeVersion clones resume, auto-tags parent position, avoids name collisions, and persists on import', () => {
  const source = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const pos = extractResumePositionLabel(source);
  assert.equal(pos, source.data.intent.position);

  // Quick derive without explicit target role
  const derived1 = deriveTargetedResumeVersion(source, { existingNames: [source.name] });
  assert.notEqual(derived1.id, source.id);
  assert.ok(derived1.name.includes('针对性优化版'));
  assert.equal(derived1.lineage?.parentId, source.id);
  assert.equal(derived1.lineage?.parentName, source.name);
  assert.equal(derived1.lineage?.parentPosition, pos);

  // Repeat derive avoids duplicate naming
  const derived2 = deriveTargetedResumeVersion(source, {
    existingNames: [source.name, derived1.name],
  });
  assert.notEqual(derived2.name, derived1.name);
  assert.ok(derived2.name.endsWith('#2'));

  // Targeted role derive updates intent.position on child without mutating parent
  const derived3 = deriveTargetedResumeVersion(source, {
    targetRole: '字节跳动 · 商业分析',
    existingNames: [source.name],
  });
  assert.equal(derived3.name, '字节跳动 · 商业分析（针对性优化版）');
  assert.equal(derived3.data.intent.position, '字节跳动 · 商业分析');
  assert.equal(derived3.lineage?.parentPosition, pos);
  assert.equal(source.data.intent.position, pos);

  // Lineage survives single-doc JSON merge import
  const merged = mergeImportedResumes([source], [derived3]);
  const imported = merged.resumes.find((r) => r.name === derived3.name);
  assert.equal(imported?.lineage?.parentPosition, pos);
  assert.equal(imported?.lineage?.parentId, source.id);
});

test('experience STAR expansion helpers validate inputs, normalize up to 3 STAR items, build prompt, and parse external JSON', () => {
  // 1. Reject blank / default placeholder experience
  const blankRes = validateExpandExperienceInput({ company: '', role: '', subtitle: '' });
  assert.equal(blankRes.ok, false);
  assert.ok(blankRes.error?.includes('公司'));

  const placeholderRes = validateExpandExperienceInput({
    company: '新公司名称',
    role: '职位名称',
    subtitle: '   ',
  });
  assert.equal(placeholderRes.ok, false);

  const validRes = validateExpandExperienceInput({
    company: '星图零售科技有限公司',
    role: '高级数据分析师',
    subtitle: '负责华南区零售进销存分析与经营复盘',
  });
  assert.equal(validRes.ok, true);

  // 2. normalizeStarSuggestions deduplicates, synthesizes missing bullet from S/A/R, and caps at 3
  const normalized = normalizeStarSuggestions({
    suggestions: [
      {
        focus: '流程提效',
        situation: '多门店周报口径分散',
        action: '搭建 Python 自动化校验脚本与看板',
        result: '周报产出耗时压缩约 XX%',
        bullet: '针对多门店周报口径分散痛点，**搭建 Python 自动化校验脚本**，将周报产出耗时压缩约 XX%。',
      },
      {
        focus: '重复项过滤',
        bullet: '针对多门店周报口径分散痛点，搭建 Python 自动化校验脚本，将周报产出耗时压缩约 XX%。',
      },
      {
        focus: '跨团队协同',
        situation: '大促备货存在区域断货风险',
        action: '联动采购与运营建立动态安全库存预警模型',
        result: '缺货率下降约 XX%，周转效率提升',
      },
      {
        focus: '业务增长',
        situation: '高价值会员复购率放缓',
        action: '构建 RFM 分层触达策略并推进 A/B 实验',
        result: '推动核心客群 30 日复购率提升约 XX%',
        bullet: '**主导 RFM 会员分层与 A/B 促活实验**，定位流失高潜客群，推动核心客群 30 日复购率提升约 XX%。',
      },
      {
        focus: '第4条应被截断',
        bullet: '额外条目不应超过 3 条上限。',
      },
    ],
  });
  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].focus, '流程提效');
  assert.ok(normalized[1].bullet.includes('动态安全库存预警模型'));
  assert.equal(normalized[2].focus, '业务增长');

  // 3. buildExpandExperiencePrompt includes company, role, responsibilities, and avoids repeating existing bullets
  const prompt = buildExpandExperiencePrompt({
    company: '星图零售科技',
    role: '数据分析师',
    subtitle: '门店经营分析',
    existingBullets: ['**搭建 BI 看板**：追踪 40 家门店核心指标。'],
    industryLabel: '商科/运营',
  });
  assert.ok(prompt.includes('星图零售科技'));
  assert.ok(prompt.includes('数据分析师'));
  assert.ok(prompt.includes('门店经营分析'));
  assert.ok(prompt.includes('搭建 BI 看板'));
  assert.ok(prompt.includes('STAR'));

  // 4. parseExternalExpandExperienceJson strips DeepSeek-R1 <think> traces & markdown fences, supports array & object
  const externalRaw = `<think>Thinking about { "role": "analyst" }...</think>
\`\`\`json
{
  "suggestions": [
    {
      "focus": "经营预警",
      "situation": "区域毛利波动滞后发现",
      "action": "设计日级异常波动监控规则",
      "result": "问题定位时效提升至 1 小时内",
      "bullet": "**构建区域毛利日级异常监控体系**，打通异常自动预警闭环，将经营偏差定位时效缩短至 1 小时内。"
    }
  ]
}
\`\`\``;
  const parsedObj = parseExternalExpandExperienceJson(externalRaw);
  assert.equal(parsedObj.length, 1);
  assert.equal(parsedObj[0].focus, '经营预警');

  const parsedArr = parseExternalExpandExperienceJson('[{"focus":"专项交付","bullet":"**主导专项复盘**，梳理标准化 SOP 模板并推广至 X 个大区。"}]');
  assert.equal(parsedArr.length, 1);
  assert.equal(parsedArr[0].focus, '专项交付');

  assert.throws(() => parseExternalExpandExperienceJson('not valid json'), /合法 JSON/);
  assert.throws(() => parseExternalExpandExperienceJson('{"suggestions":[]}'), /未找到有效/);
});

test('LLM JD semantic relevance scoring helpers build prompt, normalize/parse JSON, compute weighted score, and invoke API cleanly', async () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const skills = [
    { keyword: 'Python', tier: 'core' as const, category: '数据与工程', source: 'llm' as const },
    { keyword: 'SQL', tier: 'core' as const, category: '数据库', source: 'llm' as const },
    { keyword: 'Kubernetes', tier: 'bonus' as const, category: '加分项', source: 'llm' as const },
  ];
  const jdText = '岗位职责：负责零售业务数据建模与自动化报表；精通 Python 与 SQL，了解 Kubernetes 优先。';

  // 1. Prompt builder includes JD, skill tiers, resume experiences, and JSON contract
  const prompt = buildJdSemanticScoringPrompt(doc, jdText, skills);
  assert.ok(prompt.includes('深层语义分析'));
  assert.ok(prompt.includes('Python（核心/精通/数据与工程）'));
  assert.ok(prompt.includes('Kubernetes（加分/了解/加分项）'));
  assert.ok(prompt.includes(doc.data.basic.name));
  assert.ok(prompt.includes('"skillScores"'));

  // 2. External JSON parser strips <think> traces, clamps scores, backfills omitted skills, and enforces weighted overall score
  const rawExternal = `<think>Evaluating { "internal": true }...</think>
\`\`\`json
{
  "overallScore": 99,
  "roleAlignment": "数据分析经历高度契合，云原生经验待补齐",
  "summary": "核心数据技能实战扎实",
  "skillScores": [
    { "keyword": "Python", "relevanceScore": 120, "evidence": "用 Python 搭建门店自动化清洗流水线，周报提效 85%" },
    { "keyword": "SQL", "relevanceScore": 65, "evidence": "在多门店台账分析中使用 SQL 聚合查询", "gapAdvice": "补充复杂窗口函数与慢查询调优案例" }
  ]
}
\`\`\``;
  const parsed = parseExternalJdSemanticJson(rawExternal, skills);
  assert.equal(parsed.source, 'external-json');
  assert.equal(parsed.skillScores.length, 3, 'should backfill omitted Kubernetes skill');

  const py = parsed.skillScores.find((s) => s.keyword === 'Python')!;
  const sql = parsed.skillScores.find((s) => s.keyword === 'SQL')!;
  const k8s = parsed.skillScores.find((s) => s.keyword === 'Kubernetes')!;
  assert.equal(py.relevanceScore, 100);
  assert.equal(py.status, 'strong');
  assert.equal(py.category, '数据与工程');
  assert.equal(sql.relevanceScore, 65);
  assert.equal(sql.status, 'partial');
  assert.ok(sql.gapAdvice?.includes('窗口函数'));
  assert.equal(k8s.relevanceScore, 0);
  assert.equal(k8s.status, 'missing');

  // Weighted score: (100*3 + 65*3 + 0*1) / (3+3+1) = 495 / 7 = 71 (far from inflated 99 -> recomputed)
  assert.equal(computeWeightedSemanticScore(parsed.skillScores), 71);
  assert.equal(parsed.overallScore, 71);

  // Removing the missing Kubernetes skill recalculates weighted score upward: (300 + 195) / 6 = 83
  assert.equal(
    computeWeightedSemanticScore(parsed.skillScores.filter((s) => s.keyword !== 'Kubernetes')),
    83,
  );

  // 3. normalizeJdSemanticMatchReport rejects invalid shapes
  assert.throws(() => normalizeJdSemanticMatchReport(null), /合法 JSON 对象/);
  assert.throws(() => normalizeJdSemanticMatchReport({ skillScores: [] }), /未找到有效/);

  // 4. Async scoreJdSemanticRelevanceWithLlm sends cleaned JD + resumeText + skills to /api/ai/semantic-match
  let capturedUrl = '';
  let capturedBody: Record<string, unknown> = {};
  const mockFetcher: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        report: {
          overallScore: 84,
          roleAlignment: '岗位背景高度契合',
          summary: '工作经历与 Python/SQL 硬性要求深度吻合',
          skillScores: [
            {
              keyword: 'Python',
              tier: 'core',
              relevanceScore: 95,
              status: 'strong',
              evidence: '在星云智选主导 Python 自动化脚本，周报耗时下降 85%',
            },
            {
              keyword: 'SQL',
              tier: 'core',
              relevanceScore: 88,
              status: 'strong',
              evidence: '支撑 40 家门店进销存 SQL 分析与复盘看板',
            },
            {
              keyword: 'Kubernetes',
              tier: 'bonus',
              relevanceScore: 20,
              status: 'missing',
              evidence: '简历未涉及容器编排实践',
              gapAdvice: '加分项，可按需补充 Docker/K8s 部署经验',
            },
          ],
        },
        meta: { provider: 'custom', model: 'deepseek-chat' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const apiReport = await scoreJdSemanticRelevanceWithLlm({
    doc,
    jdText: `<p>${jdText}</p>`,
    skills,
    customConfig: {
      enabled: true,
      protocol: 'openai',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test-valid-123456',
      model: 'deepseek-chat',
      fetchedModels: [],
    },
    fetcher: mockFetcher,
  });

  assert.equal(capturedUrl, '/api/ai/semantic-match');
  assert.equal(typeof capturedBody.resumeText, 'string');
  assert.ok(!(capturedBody.jdText as string).includes('<p>'), 'should send cleaned JD text');
  assert.equal((capturedBody.skills as unknown[]).length, 3);
  assert.equal(apiReport.source, 'api');
  assert.equal(apiReport.usedModel, 'deepseek-chat');
  assert.equal(apiReport.usedProvider, 'custom');
  assert.equal(apiReport.overallScore, 84);
  assert.equal(apiReport.skillScores[0].keyword, 'Python');
  assert.equal(apiReport.skillScores[0].relevanceScore, 95);

  // 5. Rejects too-short JD and propagates server error cleanly
  await assert.rejects(
    () => scoreJdSemanticRelevanceWithLlm({ doc, jdText: '短JD', fetcher: mockFetcher }),
    /至少 8 个字/,
  );

  const errorFetcher: typeof fetch = async () =>
    new Response(JSON.stringify({ error: 'API Key 无效' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  await assert.rejects(
    () => scoreJdSemanticRelevanceWithLlm({ doc, jdText, skills, fetcher: errorFetcher }),
    /API Key 无效/,
  );
});

test('normalizeStoredResumePayload and resolvePortableSyncDecision validate portable disk hydration safely', () => {
  // 1. Reject null, primitives, empty arrays, and malformed payloads
  assert.equal(normalizeStoredResumePayload(null), null);
  assert.equal(normalizeStoredResumePayload('corrupted'), null);
  assert.equal(normalizeStoredResumePayload({ resumes: [] }), null);
  assert.equal(normalizeStoredResumePayload({ resumes: [null, 'bad'] }), null);

  // 2. Normalize valid stored payload and fall back activeId to first doc if stale
  const sample = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const normalized = normalizeStoredResumePayload({
    resumes: [sample],
    activeId: 'deleted-doc-id',
  });
  assert.ok(normalized);
  assert.equal(normalized!.resumes.length, 1);
  assert.equal(normalized!.activeId, sample.id);
  assert.equal(normalized!.resumes[0].data.basic.name, sample.data.basic.name);

  // 3. Respect explicit valid activeId
  const second = cloneResumeDoc(DEFAULT_RESUMES[1]);
  const multi = normalizeStoredResumePayload({
    resumes: [sample, second],
    activeId: second.id,
  });
  assert.equal(multi?.activeId, second.id);

  // 4. Sync decision prefers disk payload when present, seeds disk from local when disk is empty
  assert.ok(multi);
  const hydrateDecision = resolvePortableSyncDecision({
    localPayload: normalized!,
    diskPayload: multi!,
  });
  assert.equal(hydrateDecision.action, 'hydrate-from-disk');
  assert.equal(hydrateDecision.payload.activeId, second.id);

  const seedDecision = resolvePortableSyncDecision({
    localPayload: normalized!,
    diskPayload: null,
  });
  assert.equal(seedDecision.action, 'seed-disk-from-local');
  assert.equal(seedDecision.payload.activeId, sample.id);
});

test('parseLinkedInProfileText extracts English and Chinese LinkedIn profiles while stripping page noise', () => {
  const enProfile = `
Alex Chen
Senior Full-Stack Engineer | React & Distributed Systems
San Francisco, California, United States
Contact info
500+ connections
alex.chen@example.com
https://www.linkedin.com/in/alex-chen-dev

About
Full-stack engineer with 6+ years building developer platforms.

Experience
Senior Software Engineer
CloudScale Labs · Full-time
Mar 2022 - Present · 3 yrs
San Francisco, California · Hybrid
• Architected a real-time collaborative workspace in React 19 serving 120K+ MAU.
• Reduced initial bundle size by 64%.

Software Engineer
Northstar Commerce · Full-time
Jul 2019 - Feb 2022 · 2 yrs 8 mos
• Built Node.js order microservices processing $45M+ annual GMV.

Education
University of California, Berkeley
Bachelor of Science, Computer Science
2015 - 2019

Licenses & certifications
AWS Certified Solutions Architect – Associate
Issued Jan 2023

Skills
TypeScript · React · Node.js · PostgreSQL · Docker
Endorsed by 15 colleagues
`;

  const enDoc = parseLinkedInProfileText(enProfile);
  assert.equal(enDoc.name, 'Alex Chen · LinkedIn 导入版');
  assert.equal(enDoc.data.basic.name, 'Alex Chen');
  assert.equal(enDoc.data.basic.email, 'alex.chen@example.com');
  assert.ok(enDoc.data.basic.location.includes('San Francisco'));
  assert.ok(
    enDoc.data.basic.extras.some((e) => e.label === 'LinkedIn' && e.value === 'linkedin.com/in/alex-chen-dev'),
  );
  assert.equal(enDoc.data.experience.length, 2);
  assert.equal(enDoc.data.experience[0].company, 'CloudScale Labs');
  assert.equal(enDoc.data.experience[0].role, 'Senior Software Engineer');
  assert.equal(enDoc.data.experience[0].period, '2022.03 - Present');
  assert.equal(enDoc.data.experience[0].bullets.length, 2);
  assert.equal(enDoc.data.experience[1].company, 'Northstar Commerce');
  assert.equal(enDoc.data.experience[1].period, '2019.07 - 2022.02');
  assert.equal(enDoc.data.education.length, 1);
  assert.equal(enDoc.data.education[0].school, 'University of California, Berkeley');
  assert.equal(enDoc.data.education[0].degree, 'Bachelor of Science');
  assert.equal(enDoc.data.education[0].major, 'Computer Science');
  assert.equal(enDoc.data.education[0].period, '2015 - 2019');
  assert.ok(enDoc.data.certs.includes('AWS Certified Solutions Architect – Associate'));
  assert.ok(!enDoc.data.certs.some((c) => c.startsWith('Issued')));
  assert.ok(enDoc.data.tags.includes('TypeScript'));
  assert.equal(enDoc.meta.titles.experience, 'EXPERIENCE');

  const zhProfile = `
陈宇航
高级数据产品经理 | 商业智能与增长分析
上海，中国
13812345678
chenyuhang@example.com
linkedin.com/in/chen-yuhang

个人简介
5 年零售与互联网数据产品经验，擅长指标体系与商业分析落地。

工作经历
高级数据产品经理
星海数科 · 全职
2021年6月 - 至今
• 主导经营看板与自助 BI 平台建设，月活业务方突破 2000+。

教育背景
复旦大学
本科，信息管理与信息系统
2015.09 - 2019.06

技能
SQL · Python · Tableau · 产品规划
`;

  const zhDoc = parseLinkedInProfileText(zhProfile);
  assert.equal(zhDoc.data.basic.name, '陈宇航');
  assert.equal(zhDoc.data.basic.phone, '13812345678');
  assert.equal(zhDoc.data.experience.length, 1);
  assert.equal(zhDoc.data.experience[0].company, '星海数科');
  assert.equal(zhDoc.data.experience[0].role, '高级数据产品经理');
  assert.equal(zhDoc.data.experience[0].period, '2021.06 - 至今');
  assert.equal(zhDoc.data.education[0].school, '复旦大学');
  assert.ok(zhDoc.data.tags.includes('SQL'));
  assert.equal(zhDoc.meta.titles.experience, undefined);
});



