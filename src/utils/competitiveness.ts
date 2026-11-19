import type {
  RadarDimensionScore,
  ResumeCompetitivenessReport,
  ResumeDoc,
} from '../types/resume';
import {
  countResumeChars,
  customHasContent,
  detectWeakBulletOpener,
  expKpisOf,
  hasQuantifiedDescription,
  parseRange,
  stripBold,
} from './resumeLogic';

const clampScore = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function scoreLevel(score: number): RadarDimensionScore['level'] {
  if (score >= 82) return '优秀';
  if (score >= 65) return '良好';
  if (score >= 45) return '待提升';
  return '薄弱';
}

function tierForOverall(score: number): string {
  if (score >= 85) return '极具竞争力';
  if (score >= 70) return '表现扎实';
  if (score >= 50) return '具备潜力';
  return '亟待充实';
}

const STOP_WORDS = new Set([
  '岗位',
  '职位',
  '方向',
  '相关',
  '工作',
  '负责',
  '具备',
  '擅长',
  '熟悉',
  '经验',
  '能力',
  '专员',
  '助理',
  '实习',
  '实习生',
  '工程师',
  '分析师',
  '经理',
  '本科',
  '硕士',
  '全日制',
]);

function extractDomainTokens(text: string): string[] {
  const clean = stripBold(text || '').toLowerCase();
  const tokens = new Set<string>();

  // Extract English/alphanumeric domain tokens (e.g. sql, python, bi, plc, react, rfm, b2b)
  const latinMatches = clean.match(/[a-z][a-z0-9+#.-]{1,16}/g) || [];
  for (const m of latinMatches) {
    if (m.length >= 2) tokens.add(m);
  }

  // Extract 2-4 char Chinese segments split by punctuation / connectors
  const cjkChunks = clean
    .replace(/[a-z0-9+#.-]+/g, ' ')
    .split(/[\s/|｜、，,。；;：:（）()【】\[\]·\-—~]+/)
    .map((s) => s.trim())
    .filter((s) => /^[\u4e00-\u9fa5]{2,}$/.test(s));

  for (const chunk of cjkChunks) {
    if (chunk.length <= 4) {
      if (!STOP_WORDS.has(chunk)) tokens.add(chunk);
    } else {
      // Slice 2-char bigrams for longer Chinese phrases so "商业数据分析" matches "数据分析" / "商业分析"
      for (let i = 0; i <= chunk.length - 2; i += 2) {
        const sub = chunk.slice(i, i + 2);
        if (sub.length === 2 && !STOP_WORDS.has(sub)) tokens.add(sub);
      }
      const tail = chunk.slice(-2);
      if (tail.length === 2 && !STOP_WORDS.has(tail)) tokens.add(tail);
    }
  }

  return Array.from(tokens);
}

function estimateExperienceMonths(doc: ResumeDoc): number {
  const now = new Date();
  const nowTotal = now.getFullYear() * 12 + (now.getMonth() + 1);
  let totalMonths = 0;

  for (const exp of doc.data.experience) {
    if (!exp.period?.trim()) continue;
    const parsed = parseRange(exp.period);
    let sy = Number(parsed.startYear);
    let sm = Number(parsed.startMonth) || 1;
    let ey = Number(parsed.endYear);
    let em = Number(parsed.endMonth) || 12;
    let ongoing = parsed.ongoing;

    // Fallback for year-only periods like "2021 - 2024" or "2022 - 至今"
    if (!parsed.parsed) {
      const ym = exp.period
        .trim()
        .match(/^(\d{4})\s*[-–~至到]+\s*(至今|现在|Present|(\d{4}))$/i);
      if (!ym) continue;
      sy = Number(ym[1]);
      sm = 1;
      ongoing = !ym[3];
      ey = ym[3] ? Number(ym[3]) : 0;
      em = 12;
    }

    if (!sy || sy < 1980 || sy > now.getFullYear() + 1) continue;

    const startTotal = sy * 12 + Math.max(1, Math.min(12, sm));
    let endTotal = nowTotal;
    if (!ongoing) {
      if (ey && ey >= sy) {
        endTotal = ey * 12 + Math.max(1, Math.min(12, em));
      } else {
        continue;
      }
    }
    const diff = Math.max(1, Math.min(180, endTotal - startTotal + 1));
    totalMonths += diff;
  }

  // Fallback cue from basic extras or headline (e.g. "3年经验", "5 年")
  if (totalMonths === 0) {
    const metaText = [
      doc.data.basic.headline,
      ...doc.data.basic.extras.map((e) => `${e.label} ${e.value}`),
    ].join(' ');
    const yearMatch = metaText.match(/(\d{1,2})\s*\+?\s*年/);
    if (yearMatch) {
      totalMonths = Math.min(240, Number(yearMatch[1]) * 12);
    }
  }

  return totalMonths;
}

const DELIVERABLE_RE =
  /系统|平台|看板|模型|方案|报告|架构|项目|活动|课程|作品|产品|流程|流水线|工具|脚本|手册|SOP|体系|指标|转化|增长|验收|上线|交付/i;

const SENIORITY_CUE_RE =
  /高级|资深|主管|负责人|总监|架构|专家|核心|主导|牵头|统筹|搭建|从\s*0\s*到\s*1|senior|lead|owner/i;

const PLACEHOLDER_RE =
  /待补充|待填写|请填写|示例|占位|example\.com|13900008812|XXX|新公司名称|职位名称/i;

const PROJECT_MODULE_TITLE_RE = /项目|作品|案例|科研|论文|课题|实践|专利|技术栈|成果/i;

/**
 * Pure deterministic analyzer that scores activeDoc across 4 dimensions:
 * 1. 行业契合度 (industryFit)
 * 2. 资历深度 (seniorityDepth)
 * 3. 项目丰富度 (projectRichness)
 * 4. 描述专业度 (writingCraft)
 */
export function evaluateResumeCompetitiveness(doc: ResumeDoc): ResumeCompetitivenessReport {
  const { data } = doc;
  const allBullets = data.experience
    .flatMap((e) => e.bullets)
    .map((b) => b.trim())
    .filter(Boolean);
  const substantiveBullets = allBullets.filter((b) => stripBold(b).trim().length >= 16);

  const visibleCustom = data.custom.filter((c) => c.show && customHasContent(c));
  const totalChars = countResumeChars(doc);

  // =========================================================================
  // 1. 行业契合度 (industryFit: 0-100)
  // =========================================================================
  const hasPosition = Boolean(data.intent.position.trim());
  const hasHeadline = Boolean(data.basic.headline.trim());
  const hasCityOrSalary = Boolean(data.intent.city.trim() || data.intent.salary.trim());
  const intentBasePts = (hasPosition ? 14 : 0) + (hasHeadline ? 10 : 0) + (hasCityOrSalary ? 4 : 0);

  const targetAnchorText = [data.intent.position, data.basic.headline, ...data.tags].join(' ');
  const targetTokens = extractDomainTokens(targetAnchorText);

  const evidenceCorpus = stripBold(
    [
      ...data.experience.map((e) => `${e.company} ${e.role} ${e.subtitle} ${e.bullets.join(' ')}`),
      ...data.skills.map((s) => `${s.cat} ${s.items}`),
      ...data.certs,
      ...data.evals.map((ev) => `${ev.title} ${ev.body}`),
      ...visibleCustom.map((c) => `${c.title} ${JSON.stringify(c.items)}`),
    ].join(' '),
  ).toLowerCase();

  let matchedTokenCount = 0;
  for (const tok of targetTokens) {
    if (evidenceCorpus.includes(tok)) matchedTokenCount += 1;
  }
  const alignmentRatio = targetTokens.length > 0 ? matchedTokenCount / targetTokens.length : 0;
  const alignmentPts =
    targetTokens.length === 0 ? 0 : Math.min(44, Math.round(alignmentRatio * 48));

  const filledSkills = data.skills.filter((s) => s.cat.trim() || s.items.trim()).length;
  const filledTags = data.tags.filter((t) => t.trim()).length;
  const filledCerts = data.certs.filter((c) => c.trim()).length;
  const backingPts =
    Math.min(16, filledSkills * 8) +
    Math.min(8, filledTags * 2) +
    Math.min(4, filledCerts * 2);

  const industryFitScore = clampScore(intentBasePts + alignmentPts + backingPts);
  const industryFitSummary = !hasPosition
    ? '尚未填写目标求职岗位，无法建立明确行业锚点'
    : targetTokens.length > 0
      ? `定位词与经历/技能命中率 ${Math.round(alignmentRatio * 100)}%（${matchedTokenCount}/${targetTokens.length}），${filledSkills} 组技能支撑`
      : `已明确目标岗位「${data.intent.position.slice(0, 14)}」，建议补充专业技能词`;
  const industryFitTip = !hasPosition
    ? '前往「求职意向」明确 1-2 个细分目标岗位名称'
    : alignmentRatio < 0.6
      ? '在工作经历与专业技能中自然融入目标岗位的核心工具与业务关键词'
      : filledSkills < 2
        ? '在「专业技能」补充 2 组以上与目标行业直接相关的工具/方法论'
        : '行业定位与技能证据链一致，投递不同细分岗时可用「克隆并衍生」微调关键词';

  // =========================================================================
  // 2. 资历深度 (seniorityDepth: 0-100)
  // =========================================================================
  const totalExpMonths = estimateExperienceMonths(doc);
  const totalYears = totalExpMonths / 12;

  let tenurePts = 0;
  if (totalExpMonths >= 60) tenurePts = 40;
  else if (totalExpMonths >= 36) tenurePts = 33 + Math.round(((totalExpMonths - 36) / 24) * 7);
  else if (totalExpMonths >= 18) tenurePts = 23 + Math.round(((totalExpMonths - 18) / 18) * 10);
  else if (totalExpMonths >= 6) tenurePts = 13 + Math.round(((totalExpMonths - 6) / 12) * 10);
  else if (totalExpMonths > 0) tenurePts = 8;

  const validExps = data.experience.filter(
    (e) => e.company.trim() && !/^(新公司名称|公司名称|未命名)$/.test(e.company.trim()),
  );
  const expBreadthPts = validExps.length >= 3 ? 14 : validExps.length === 2 ? 12 : validExps.length === 1 ? 7 : 0;

  const hasSeniorCues = data.experience.some((e) =>
    SENIORITY_CUE_RE.test(`${e.role} ${e.subtitle} ${e.bullets.join(' ')}`),
  );
  const kpiCount = data.experience.reduce((acc, e) => acc + expKpisOf(e.kpis).length, 0);
  const ownershipPts = (hasSeniorCues ? 8 : 0) + Math.min(7, kpiCount * 3);

  const validEdu = data.education.filter((ed) => ed.school.trim() || ed.major.trim());
  const hasAdvancedEdu = validEdu.some((ed) => /硕士|博士|研究生|MBA|985|211|双一流/i.test(`${ed.degree} ${ed.desc}`));
  const eduPts = validEdu.length > 0 ? 14 + (validEdu[0].desc.trim() ? 3 : 0) + (hasAdvancedEdu ? 3 : 0) : 0;

  const certPts = Math.min(11, filledCerts * 5 + (visibleCustom.some((c) => /荣誉|奖项|专利|论文/.test(c.title)) ? 4 : 0));

  const seniorityDepthScore = clampScore(tenurePts + expBreadthPts + ownershipPts + eduPts + certPts);
  const yearsLabel =
    totalExpMonths === 0
      ? '暂未识别到有效在职时长'
      : totalYears >= 1
        ? `累计约 ${totalYears.toFixed(1)} 年经历`
        : `累计约 ${totalExpMonths} 个月实践`;
  const seniorityDepthSummary = `${yearsLabel} · ${validExps.length} 段经历 · ${validEdu.length} 段教育 · ${filledCerts} 项资质`;
  const seniorityDepthTip =
    validExps.length === 0
      ? '在「工作 / 实践经历」补充真实在职或实习段与起止时间'
      : totalExpMonths < 12
        ? '若为应届或转型期，可补充校园项目、竞赛或高含金量证书强化资历厚度'
        : kpiCount === 0
          ? '为重点经历补充 2-3 项亮点成果指标条，突出个人主导深度'
          : '资历脉络完整，建议重点突出近期主导负责的核心职责边界';

  // =========================================================================
  // 3. 项目丰富度 (projectRichness: 0-100)
  // =========================================================================
  const bulletsPts = Math.min(42, substantiveBullets.length * 9);
  const subtitleCount = data.experience.filter((e) => e.subtitle.trim().length >= 10).length;
  const subtitlePts = Math.min(12, subtitleCount * 6);

  const deliverableHits = allBullets.filter((b) => DELIVERABLE_RE.test(b)).length;
  const deliverablePts = Math.min(18, deliverableHits * 5 + Math.min(6, kpiCount * 2));

  const projectCustomModules = visibleCustom.filter(
    (c) => c.kind === 'cases' || PROJECT_MODULE_TITLE_RE.test(c.title),
  );
  const customOrMultiPts =
    projectCustomModules.length > 0
      ? Math.min(28, 16 + projectCustomModules.length * 8 + (visibleCustom.length > projectCustomModules.length ? 4 : 0))
      : visibleCustom.length > 0
        ? 14
        : validExps.length >= 2 && substantiveBullets.length >= 4
          ? 16
          : validExps.length >= 1 && substantiveBullets.length >= 3
            ? 10
            : 0;

  const projectRichnessScore = clampScore(bulletsPts + subtitlePts + deliverablePts + customOrMultiPts);
  const projectRichnessSummary = `${substantiveBullets.length} 条详实要点 · ${kpiCount} 项成果指标 · ${projectCustomModules.length} 个专项项目/案例模块`;
  const projectRichnessTip =
    substantiveBullets.length < 4
      ? '使用工作经历中的「经历扩充」按 STAR 原则补充核心项目与交付细节'
      : projectCustomModules.length === 0
        ? '可按需添加「代表项目经历」或「STAR 案例卡片」模块，进一步拉高项目立体度'
        : '项目与交付物覆盖度良好，确保每条都指向可验证的具体成果';

  // =========================================================================
  // 4. 描述专业度 (writingCraft: 0-100)
  // =========================================================================
  const quantCount = allBullets.filter((b) => hasQuantifiedDescription(b).hasAny).length;
  const quantifiedRatioPct = allBullets.length > 0 ? Math.round((quantCount / allBullets.length) * 100) : 0;
  const quantPts = allBullets.length > 0 ? Math.round((quantCount / allBullets.length) * 36) : 0;

  const weakCount = allBullets.filter((b) => Boolean(detectWeakBulletOpener(b))).length;
  const strongVerbRatio = allBullets.length > 0 ? (allBullets.length - weakCount) / allBullets.length : 0;
  const verbPts = allBullets.length > 0 ? Math.round(strongVerbRatio * 24) : 0;

  const boldCount = allBullets.filter((b) => /\*\*[^*]+\*\*/.test(b)).length;
  const boldPts = allBullets.length > 0 ? Math.min(10, Math.round((boldCount / allBullets.length) * 12)) : 0;

  const avgBulletLen =
    allBullets.length > 0
      ? allBullets.reduce((acc, b) => acc + stripBold(b).trim().length, 0) / allBullets.length
      : 0;
  const lenPts =
    allBullets.length === 0
      ? 0
      : avgBulletLen >= 26 && avgBulletLen <= 78
        ? 10
        : avgBulletLen >= 16 && avgBulletLen <= 96
          ? 6
          : 3;

  // Cleanliness: penalize placeholders, duplicate bullets, or overly thin text
  const rawFullText = [
    data.basic.name,
    data.basic.phone,
    data.basic.email,
    ...data.experience.map((e) => `${e.company} ${e.role} ${e.bullets.join(' ')}`),
  ].join(' ');
  const hasPlaceholders = PLACEHOLDER_RE.test(rawFullText);

  const normalizedSet = new Set(allBullets.map((b) => stripBold(b).replace(/\s+/g, '')));
  const hasDuplicates = allBullets.length > normalizedSet.size;

  let polishPts = 20;
  if (totalChars < 200) polishPts -= 10;
  else if (totalChars < 350) polishPts -= 4;
  if (hasPlaceholders) polishPts -= 6;
  if (hasDuplicates) polishPts -= 6;
  polishPts = Math.max(0, polishPts);

  const writingCraftScore = clampScore(quantPts + verbPts + boldPts + lenPts + polishPts);
  const writingCraftSummary =
    allBullets.length === 0
      ? '暂无工作经历要点可评估'
      : `量化率 ${quantifiedRatioPct}% · 弱动词 ${weakCount} 处 · 重点加粗 ${boldCount}/${allBullets.length}${hasPlaceholders ? ' · 含示例占位' : ''}`;
  const writingCraftTip =
    allBullets.length === 0
      ? '先在「工作 / 实践经历」撰写 3-5 条 STAR 要点'
      : quantifiedRatioPct < 60
        ? '在经历要点中补充百分比、规模或金额等量化指标，可用「简历体检」一键增强'
        : weakCount > 0
          ? '将“负责/协助/参与”等开头替换为“主导/搭建/推动”等强动词'
          : hasPlaceholders
            ? '将默认示例联系方式或占位符替换为你的真实信息'
            : '句式凝练、量化与重点加粗比例优秀，具备直接投递水准';

  const dimensions: RadarDimensionScore[] = [
    {
      key: 'industryFit',
      label: '行业契合度',
      shortLabel: '行业契合',
      score: industryFitScore,
      level: scoreLevel(industryFitScore),
      summary: industryFitSummary,
      tip: industryFitTip,
      jumpModule: hasPosition ? 'skills' : 'intent',
    },
    {
      key: 'seniorityDepth',
      label: '资历深度',
      shortLabel: '资历深度',
      score: seniorityDepthScore,
      level: scoreLevel(seniorityDepthScore),
      summary: seniorityDepthSummary,
      tip: seniorityDepthTip,
      jumpModule: validEdu.length === 0 ? 'education' : 'experience',
    },
    {
      key: 'projectRichness',
      label: '项目丰富度',
      shortLabel: '项目丰富',
      score: projectRichnessScore,
      level: scoreLevel(projectRichnessScore),
      summary: projectRichnessSummary,
      tip: projectRichnessTip,
      jumpModule: 'experience',
    },
    {
      key: 'writingCraft',
      label: '描述专业度',
      shortLabel: '描述专业',
      score: writingCraftScore,
      level: scoreLevel(writingCraftScore),
      summary: writingCraftSummary,
      tip: writingCraftTip,
      jumpModule: hasPlaceholders && quantifiedRatioPct >= 60 && weakCount === 0 ? 'basic' : 'experience',
    },
  ];

  const overallScore = clampScore(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );

  const sortedAsc = [...dimensions].sort((a, b) => a.score - b.score);
  const weakest = sortedAsc[0];
  const strongest = sortedAsc[sortedAsc.length - 1];

  return {
    overallScore,
    tierLabel: tierForOverall(overallScore),
    dimensions,
    weakest,
    strongest,
    totalExpMonths,
    quantifiedRatioPct,
  };
}
