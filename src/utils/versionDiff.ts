import { TEMPLATE_OPTIONS, THEMES } from '../data/themes';
import type {
  CaseItem,
  CustomModule,
  DiffFieldEntry,
  DiffSectionReport,
  DiffSegment,
  DiffStatus,
  EducationItem,
  EvalItem,
  ExperienceItem,
  ResumeDoc,
  SkillGroup,
  TitledItem,
  VersionDiffReport,
} from '../types/resume';
import { countResumeChars, expKpisOf, secTitle, stripBold } from './resumeLogic';

const TOKEN_PATTERN = /[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*[%+]?|\s+|./gu;
const QUANT_PATTERN =
  /(?:[+-]?\d+(?:\.\d+)?(?:\s*(?:%|倍|万|亿|千|百|余|家|项|个|人|次|份|场|篇|套|台|条|天|小时|分钟|年|个月|周|K|k|M|W|w|\+)))/g;

function cleanText(raw: string | undefined | null): string {
  return stripBold((raw || '').trim()).replace(/\r\n/g, '\n');
}

function countVisibleChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

export function countQuantifiedMetrics(doc: ResumeDoc): number {
  const parts: string[] = [
    cleanText(doc.data.basic.headline),
    ...doc.data.experience.flatMap((e) => [
      cleanText(e.subtitle),
      ...expKpisOf(e.kpis).map((k) => `${k.num} ${k.label}`),
      ...e.bullets.map(cleanText),
    ]),
    ...doc.data.evals.map((e) => cleanText(e.body)),
  ];
  const combined = parts.join(' ');
  const matches = combined.match(QUANT_PATTERN);
  return matches ? matches.length : 0;
}

export function tokenizeDiffText(text: string): string[] {
  if (!text) return [];
  return text.match(TOKEN_PATTERN) || [];
}

function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === seg.kind) {
      prev.text += seg.text;
    } else {
      merged.push({ kind: seg.kind, text: seg.text });
    }
  }
  return merged;
}

function runLcsDiff(a: string[], b: string[]): DiffSegment[] {
  const m = a.length;
  const n = b.length;
  const cols = n + 1;
  const dp = new Uint32Array((m + 1) * cols);

  for (let i = m - 1; i >= 0; i--) {
    const rowOffset = i * cols;
    const nextRowOffset = (i + 1) * cols;
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[rowOffset + j] = dp[nextRowOffset + j + 1] + 1;
      } else {
        const down = dp[nextRowOffset + j];
        const right = dp[rowOffset + j + 1];
        dp[rowOffset + j] = down >= right ? down : right;
      }
    }
  }

  const out: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ kind: 'equal', text: a[i] });
      i++;
      j++;
    } else if (dp[(i + 1) * cols + j] >= dp[i * cols + j + 1]) {
      out.push({ kind: 'removed', text: a[i] });
      i++;
    } else {
      out.push({ kind: 'added', text: b[j] });
      j++;
    }
  }
  while (i < m) {
    out.push({ kind: 'removed', text: a[i++] });
  }
  while (j < n) {
    out.push({ kind: 'added', text: b[j++] });
  }
  return mergeSegments(out);
}

/**
 * Computes token-level inline diff segments between two strings.
 * Splits English words/numbers cleanly and CJK text by character for crisp inline highlights.
 */
export function diffTextSegments(baseText: string, targetText: string): DiffSegment[] {
  const aStr = baseText || '';
  const bStr = targetText || '';

  if (aStr === bStr) {
    return aStr ? [{ kind: 'equal', text: aStr }] : [];
  }
  if (!aStr) {
    return [{ kind: 'added', text: bStr }];
  }
  if (!bStr) {
    return [{ kind: 'removed', text: aStr }];
  }

  const aTokens = tokenizeDiffText(aStr);
  const bTokens = tokenizeDiffText(bStr);

  // Trim shared prefix and suffix before running LCS to keep DP tiny & fast
  let start = 0;
  while (start < aTokens.length && start < bTokens.length && aTokens[start] === bTokens[start]) {
    start++;
  }

  let endA = aTokens.length - 1;
  let endB = bTokens.length - 1;
  while (endA >= start && endB >= start && aTokens[endA] === bTokens[endB]) {
    endA--;
    endB--;
  }

  const prefixText = start > 0 ? aTokens.slice(0, start).join('') : '';
  const suffixText = endA < aTokens.length - 1 ? aTokens.slice(endA + 1).join('') : '';

  const midA = aTokens.slice(start, endA + 1);
  const midB = bTokens.slice(start, endB + 1);

  const segments: DiffSegment[] = [];
  if (prefixText) segments.push({ kind: 'equal', text: prefixText });

  if (midA.length === 0 && midB.length > 0) {
    segments.push({ kind: 'added', text: midB.join('') });
  } else if (midB.length === 0 && midA.length > 0) {
    segments.push({ kind: 'removed', text: midA.join('') });
  } else if (midA.length * midB.length > 160_000) {
    // Fallback to clause-level tokens for unusually huge passages so UI stays 60fps
    const clauseRe = /[^，。；！？、\n]+[，。；！？、\n]?/gu;
    const midAStr = midA.join('');
    const midBStr = midB.join('');
    const clausesA = midAStr.match(clauseRe) || [midAStr];
    const clausesB = midBStr.match(clauseRe) || [midBStr];
    if (clausesA.length * clausesB.length <= 160_000) {
      segments.push(...runLcsDiff(clausesA, clausesB));
    } else {
      segments.push({ kind: 'removed', text: midAStr });
      segments.push({ kind: 'added', text: midBStr });
    }
  } else {
    segments.push(...runLcsDiff(midA, midB));
  }

  if (suffixText) segments.push({ kind: 'equal', text: suffixText });

  return mergeSegments(segments);
}

function buildFieldEntry(
  id: string,
  label: string,
  baseRaw: string,
  targetRaw: string
): DiffFieldEntry | null {
  const a = cleanText(baseRaw);
  const b = cleanText(targetRaw);
  if (!a && !b) return null;

  const segments = diffTextSegments(a, b);
  let addedChars = 0;
  let removedChars = 0;
  for (const seg of segments) {
    if (seg.kind === 'added') addedChars += countVisibleChars(seg.text);
    else if (seg.kind === 'removed') removedChars += countVisibleChars(seg.text);
  }

  let status: DiffStatus = 'unchanged';
  if (!a && b) status = 'added';
  else if (a && !b) status = 'removed';
  else if (addedChars > 0 || removedChars > 0) status = 'modified';

  return {
    id,
    label,
    status,
    segments,
    addedChars,
    removedChars,
  };
}

function finalizeSection(
  moduleKey: string,
  title: string,
  fields: Array<DiffFieldEntry | null>
): DiffSectionReport {
  const validFields = fields.filter((f): f is DiffFieldEntry => f !== null);
  let addedChars = 0;
  let removedChars = 0;
  let changedFieldsCount = 0;
  let allAdded = validFields.length > 0;
  let allRemoved = validFields.length > 0;

  for (const f of validFields) {
    addedChars += f.addedChars;
    removedChars += f.removedChars;
    if (f.status !== 'unchanged') changedFieldsCount++;
    if (f.status !== 'added') allAdded = false;
    if (f.status !== 'removed') allRemoved = false;
  }

  let status: DiffStatus = 'unchanged';
  if (changedFieldsCount > 0) {
    if (allAdded) status = 'added';
    else if (allRemoved) status = 'removed';
    else status = 'modified';
  }

  return {
    moduleKey,
    title,
    status,
    addedChars,
    removedChars,
    changedFieldsCount,
    fields: validFields,
  };
}

function pairByKey<T>(
  baseList: T[],
  targetList: T[],
  getPrimaryKey: (item: T) => string,
  getSecondaryKey: (item: T) => string
): Array<{ base?: T; target?: T }> {
  const pairs: Array<{ base?: T; target?: T }> = [];
  const usedTarget = new Set<number>();

  // First pass: exact primary key (e.g. id)
  const targetByPrimary = new Map<string, number>();
  targetList.forEach((item, idx) => {
    const k = getPrimaryKey(item);
    if (k && !targetByPrimary.has(k)) targetByPrimary.set(k, idx);
  });

  const matchedBaseToTarget = new Map<number, number>();
  baseList.forEach((item, bIdx) => {
    const k = getPrimaryKey(item);
    const tIdx = k ? targetByPrimary.get(k) : undefined;
    if (tIdx !== undefined && !usedTarget.has(tIdx)) {
      matchedBaseToTarget.set(bIdx, tIdx);
      usedTarget.add(tIdx);
    }
  });

  // Second pass: secondary semantic key (e.g. company+role or school or skill category)
  baseList.forEach((item, bIdx) => {
    if (matchedBaseToTarget.has(bIdx)) return;
    const sk = getSecondaryKey(item);
    if (!sk) return;
    const tIdx = targetList.findIndex(
      (tItem, idx) => !usedTarget.has(idx) && getSecondaryKey(tItem) === sk
    );
    if (tIdx !== -1) {
      matchedBaseToTarget.set(bIdx, tIdx);
      usedTarget.add(tIdx);
    }
  });

  // Third pass: fallback index pairing when both sides have unmatched items (e.g. comparing two distinct templates)
  const remainingTargetIndices: number[] = [];
  targetList.forEach((_, idx) => {
    if (!usedTarget.has(idx)) remainingTargetIndices.push(idx);
  });
  let remCursor = 0;

  baseList.forEach((item, bIdx) => {
    const matchedIdx = matchedBaseToTarget.get(bIdx);
    if (matchedIdx !== undefined) {
      pairs.push({ base: item, target: targetList[matchedIdx] });
    } else if (
      getPrimaryKey(item) &&
      remCursor < remainingTargetIndices.length &&
      baseList.length === targetList.length &&
      matchedBaseToTarget.size === 0
    ) {
      const tIdx = remainingTargetIndices[remCursor++];
      usedTarget.add(tIdx);
      pairs.push({ base: item, target: targetList[tIdx] });
    } else {
      pairs.push({ base: item, target: undefined });
    }
  });

  targetList.forEach((item, idx) => {
    if (!usedTarget.has(idx)) {
      pairs.push({ base: undefined, target: item });
    }
  });

  return pairs;
}

function formatExperienceHeader(exp?: ExperienceItem): string {
  if (!exp) return '';
  return [exp.company, exp.role, exp.period ? `(${exp.period})` : '']
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
}

function formatKpiLine(exp?: ExperienceItem): string {
  if (!exp) return '';
  return expKpisOf(exp.kpis)
    .map((k) => `${k.num} ${k.label}`.trim())
    .filter(Boolean)
    .join(' ｜ ');
}

function serializeCustomModuleLines(cm?: CustomModule): string[] {
  if (!cm || !Array.isArray(cm.items)) return [];
  if (cm.kind === 'tags') {
    const tags = (cm.items as string[]).map(cleanText).filter(Boolean);
    return tags.length > 0 ? [tags.join(' / ')] : [];
  }
  if (cm.kind === 'bullets' || cm.kind === 'text') {
    return (cm.items as string[]).map(cleanText).filter(Boolean);
  }
  if (cm.kind === 'titled') {
    return (cm.items as TitledItem[])
      .map((item) => [cleanText(item?.title), cleanText(item?.body)].filter(Boolean).join('：'))
      .filter(Boolean);
  }
  if (cm.kind === 'cases') {
    return (cm.items as CaseItem[])
      .map((item) =>
        [
          cleanText(item?.title),
          item?.bg ? `背景：${cleanText(item.bg)}` : '',
          item?.action ? `行动：${cleanText(item.action)}` : '',
          item?.result ? `成果：${cleanText(item.result)}` : '',
          item?.evidence ? `佐证：${cleanText(item.evidence)}` : '',
        ]
          .filter(Boolean)
          .join(' | ')
      )
      .filter(Boolean);
  }
  return [];
}

function diffStyleMeta(baseDoc: ResumeDoc, targetDoc: ResumeDoc): string[] {
  const changes: string[] = [];
  if (baseDoc.meta.template !== targetDoc.meta.template) {
    const aName = TEMPLATE_OPTIONS.find((t) => t.id === baseDoc.meta.template)?.name || baseDoc.meta.template;
    const bName = TEMPLATE_OPTIONS.find((t) => t.id === targetDoc.meta.template)?.name || targetDoc.meta.template;
    changes.push(`版式：${aName} → ${bName}`);
  }
  if (baseDoc.meta.theme !== targetDoc.meta.theme) {
    const aTheme = THEMES[baseDoc.meta.theme]?.name || baseDoc.meta.theme;
    const bTheme = THEMES[targetDoc.meta.theme]?.name || targetDoc.meta.theme;
    changes.push(`主题色：${aTheme} → ${bTheme}`);
  }
  if (baseDoc.meta.fontStyle !== targetDoc.meta.fontStyle) {
    const map = { sans: '现代黑体', serif: '人文衬线', classic: '经典混合' };
    changes.push(`字体：${map[baseDoc.meta.fontStyle]} → ${map[targetDoc.meta.fontStyle]}`);
  }
  if (Math.abs(baseDoc.meta.fs - targetDoc.meta.fs) >= 0.1) {
    changes.push(`正文字号：${baseDoc.meta.fs}px → ${targetDoc.meta.fs}px`);
  }
  const baseFw = baseDoc.meta.fw ?? 400;
  const targetFw = targetDoc.meta.fw ?? 400;
  if (baseFw !== targetFw) {
    changes.push(`整体字重：${baseFw} → ${targetFw}`);
  }
  if (Math.abs(baseDoc.meta.lh - targetDoc.meta.lh) >= 0.01) {
    changes.push(`行高与纵向间距：${baseDoc.meta.lh.toFixed(2)}× → ${targetDoc.meta.lh.toFixed(2)}×`);
  }
  return changes;
}

export function compareResumeVersions(baseDoc: ResumeDoc, targetDoc: ResumeDoc): VersionDiffReport {
  const sameDoc = baseDoc.id === targetDoc.id;
  const sections: DiffSectionReport[] = [];

  // 1. Basic Info
  const basicFields: Array<DiffFieldEntry | null> = [
    buildFieldEntry('basic-name', '姓名', baseDoc.data.basic.name, targetDoc.data.basic.name),
    buildFieldEntry('basic-headline', '一句话定位', baseDoc.data.basic.headline, targetDoc.data.basic.headline),
    buildFieldEntry('basic-phone', '电话', baseDoc.data.basic.phone, targetDoc.data.basic.phone),
    buildFieldEntry('basic-email', '邮箱', baseDoc.data.basic.email, targetDoc.data.basic.email),
    buildFieldEntry('basic-location', '现居城市', baseDoc.data.basic.location, targetDoc.data.basic.location),
    buildFieldEntry('basic-age', '年龄', baseDoc.data.basic.age, targetDoc.data.basic.age),
  ];
  const extraPairs = pairByKey(
    baseDoc.data.basic.extras,
    targetDoc.data.basic.extras,
    (x) => x.id,
    (x) => x.label.trim().toLowerCase()
  );
  extraPairs.forEach((pair, idx) => {
    const label = pair.target?.label || pair.base?.label || `附加信息 ${idx + 1}`;
    const aText = pair.base ? `${pair.base.label ? `${pair.base.label}：` : ''}${pair.base.value}` : '';
    const bText = pair.target ? `${pair.target.label ? `${pair.target.label}：` : ''}${pair.target.value}` : '';
    basicFields.push(buildFieldEntry(`basic-extra-${idx}`, `眉首附加 · ${label}`, aText, bText));
  });
  sections.push(finalizeSection('basic', '基本信息', basicFields));

  // 2. Intent
  const intentFields: Array<DiffFieldEntry | null> = [
    buildFieldEntry('intent-pos', '目标岗位', baseDoc.data.intent.position, targetDoc.data.intent.position),
    buildFieldEntry('intent-city', '意向城市', baseDoc.data.intent.city, targetDoc.data.intent.city),
    buildFieldEntry('intent-salary', '期望薪资', baseDoc.data.intent.salary, targetDoc.data.intent.salary),
    buildFieldEntry(
      'intent-avail',
      '到岗时间',
      baseDoc.data.intent.availability,
      targetDoc.data.intent.availability
    ),
  ];
  sections.push(finalizeSection('intent', secTitle(targetDoc.meta, 'intent'), intentFields));

  // 3. Experience
  const expFields: Array<DiffFieldEntry | null> = [];
  const expPairs = pairByKey<ExperienceItem>(
    baseDoc.data.experience,
    targetDoc.data.experience,
    (e) => e.id,
    (e) => `${e.company.trim().toLowerCase()}|${e.role.trim().toLowerCase()}`
  );
  expPairs.forEach((pair, idx) => {
    const tagName =
      pair.target?.company || pair.base?.company || pair.target?.role || pair.base?.role || `经历 ${idx + 1}`;
    expFields.push(
      buildFieldEntry(
        `exp-${idx}-head`,
        `经历 ${idx + 1} · ${tagName}`,
        formatExperienceHeader(pair.base),
        formatExperienceHeader(pair.target)
      )
    );
    expFields.push(
      buildFieldEntry(
        `exp-${idx}-sub`,
        `经历 ${idx + 1} · 概述`,
        pair.base?.subtitle || '',
        pair.target?.subtitle || ''
      )
    );
    expFields.push(
      buildFieldEntry(
        `exp-${idx}-kpi`,
        `经历 ${idx + 1} · 量化指标`,
        formatKpiLine(pair.base),
        formatKpiLine(pair.target)
      )
    );
    const baseBullets = (pair.base?.bullets || []).map(cleanText).filter(Boolean);
    const targetBullets = (pair.target?.bullets || []).map(cleanText).filter(Boolean);
    const maxBullets = Math.max(baseBullets.length, targetBullets.length);
    for (let bIdx = 0; bIdx < maxBullets; bIdx++) {
      expFields.push(
        buildFieldEntry(
          `exp-${idx}-b-${bIdx}`,
          `经历 ${idx + 1} · 要点 ${bIdx + 1}`,
          baseBullets[bIdx] || '',
          targetBullets[bIdx] || ''
        )
      );
    }
  });
  sections.push(finalizeSection('experience', secTitle(targetDoc.meta, 'experience'), expFields));

  // 4. Skills
  const skillFields: Array<DiffFieldEntry | null> = [];
  const skillPairs = pairByKey<SkillGroup>(
    baseDoc.data.skills,
    targetDoc.data.skills,
    (s) => s.id,
    (s) => s.cat.trim().toLowerCase()
  );
  skillPairs.forEach((pair, idx) => {
    const label = pair.target?.cat || pair.base?.cat || `技能组 ${idx + 1}`;
    const aText = pair.base ? `${pair.base.cat ? `${pair.base.cat}：` : ''}${pair.base.items}` : '';
    const bText = pair.target ? `${pair.target.cat ? `${pair.target.cat}：` : ''}${pair.target.items}` : '';
    skillFields.push(buildFieldEntry(`skill-${idx}`, label, aText, bText));
  });
  sections.push(finalizeSection('skills', secTitle(targetDoc.meta, 'skills'), skillFields));

  // 5. Education
  const eduFields: Array<DiffFieldEntry | null> = [];
  const eduPairs = pairByKey<EducationItem>(
    baseDoc.data.education,
    targetDoc.data.education,
    (e) => e.id,
    (e) => e.school.trim().toLowerCase()
  );
  eduPairs.forEach((pair, idx) => {
    const label = pair.target?.school || pair.base?.school || `教育 ${idx + 1}`;
    const fmt = (e?: EducationItem) =>
      e
        ? [e.school, e.major, e.degree, e.period ? `(${e.period})` : '', e.desc]
            .map((s) => s.trim())
            .filter(Boolean)
            .join(' · ')
        : '';
    eduFields.push(buildFieldEntry(`edu-${idx}`, label, fmt(pair.base), fmt(pair.target)));
  });
  sections.push(finalizeSection('education', secTitle(targetDoc.meta, 'education'), eduFields));

  // 6. Certs
  const baseCerts = baseDoc.data.certs.map(cleanText).filter(Boolean);
  const targetCerts = targetDoc.data.certs.map(cleanText).filter(Boolean);
  const certFields: Array<DiffFieldEntry | null> = [];
  const baseCertSet = new Set(baseCerts);
  const targetCertSet = new Set(targetCerts);
  const allCerts = Array.from(new Set([...baseCerts, ...targetCerts]));
  allCerts.forEach((cert, idx) => {
    certFields.push(
      buildFieldEntry(
        `cert-${idx}`,
        `证书 ${idx + 1}`,
        baseCertSet.has(cert) ? cert : '',
        targetCertSet.has(cert) ? cert : ''
      )
    );
  });
  sections.push(finalizeSection('certs', secTitle(targetDoc.meta, 'certs'), certFields));

  // 7. Tags (diff discrete tag items cleanly so shared CJK characters across distinct tags don't collide)
  const baseTags = baseDoc.data.tags.map(cleanText).filter(Boolean);
  const targetTags = targetDoc.data.tags.map(cleanText).filter(Boolean);
  const tagFields: Array<DiffFieldEntry | null> = [];
  if (baseTags.length > 0 || targetTags.length > 0) {
    const segments: DiffSegment[] = [];
    let addedChars = 0;
    let removedChars = 0;

    // Emit each tag token separated by '、' while preserving exact added/removed spans
    const expanded: Array<{ kind: DiffSegment['kind']; tag: string }> = [];
    const m = baseTags.length;
    const n = targetTags.length;
    const cols = n + 1;
    const dp = new Uint32Array((m + 1) * cols);
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        dp[i * cols + j] =
          baseTags[i] === targetTags[j]
            ? dp[(i + 1) * cols + (j + 1)] + 1
            : Math.max(dp[(i + 1) * cols + j], dp[i * cols + (j + 1)]);
      }
    }
    let ti = 0;
    let tj = 0;
    while (ti < m && tj < n) {
      if (baseTags[ti] === targetTags[tj]) {
        expanded.push({ kind: 'equal', tag: baseTags[ti] });
        ti++;
        tj++;
      } else if (dp[(ti + 1) * cols + tj] >= dp[ti * cols + (tj + 1)]) {
        expanded.push({ kind: 'removed', tag: baseTags[ti++] });
      } else {
        expanded.push({ kind: 'added', tag: targetTags[tj++] });
      }
    }
    while (ti < m) expanded.push({ kind: 'removed', tag: baseTags[ti++] });
    while (tj < n) expanded.push({ kind: 'added', tag: targetTags[tj++] });

    expanded.forEach((item, idx) => {
      if (idx > 0) {
        segments.push({ kind: 'equal', text: '、' });
      }
      segments.push({ kind: item.kind, text: item.tag });
      if (item.kind === 'added') addedChars += countVisibleChars(item.tag);
      else if (item.kind === 'removed') removedChars += countVisibleChars(item.tag);
    });

    const tagStatus: DiffStatus =
      baseTags.length === 0
        ? 'added'
        : targetTags.length === 0
          ? 'removed'
          : addedChars > 0 || removedChars > 0
            ? 'modified'
            : 'unchanged';

    tagFields.push({
      id: 'tags-all',
      label: '标签列表',
      status: tagStatus,
      segments,
      addedChars,
      removedChars,
    });
  }
  sections.push(finalizeSection('tags', secTitle(targetDoc.meta, 'tags'), tagFields));

  // 8. Evals
  const evalFields: Array<DiffFieldEntry | null> = [];
  const evalPairs = pairByKey<EvalItem>(
    baseDoc.data.evals,
    targetDoc.data.evals,
    (e) => e.id,
    (e) => e.title.trim().toLowerCase()
  );
  evalPairs.forEach((pair, idx) => {
    const label = pair.target?.title || pair.base?.title || `评价 ${idx + 1}`;
    const fmt = (e?: EvalItem) => (e ? `${e.title ? `${e.title}：` : ''}${e.body}` : '');
    evalFields.push(buildFieldEntry(`eval-${idx}`, label, fmt(pair.base), fmt(pair.target)));
  });
  sections.push(finalizeSection('evals', secTitle(targetDoc.meta, 'evals'), evalFields));

  // 9. Custom Modules
  const customPairs = pairByKey<CustomModule>(
    baseDoc.data.custom,
    targetDoc.data.custom,
    (c) => c.id,
    (c) => c.title.trim().toLowerCase()
  );
  customPairs.forEach((pair, idx) => {
    const modKey = pair.target?.id || pair.base?.id || `custom-${idx}`;
    const modTitle = pair.target?.title || pair.base?.title || `自定义模块 ${idx + 1}`;
    const aLines = serializeCustomModuleLines(pair.base);
    const bLines = serializeCustomModuleLines(pair.target);
    const maxLen = Math.max(aLines.length, bLines.length);
    const cFields: Array<DiffFieldEntry | null> = [];
    for (let i = 0; i < maxLen; i++) {
      cFields.push(buildFieldEntry(`cm-${modKey}-${i}`, `条目 ${i + 1}`, aLines[i] || '', bLines[i] || ''));
    }
    if (cFields.some(Boolean)) {
      sections.push(finalizeSection(modKey, modTitle, cFields));
    }
  });

  const baseCharCount = countResumeChars(baseDoc);
  const targetCharCount = countResumeChars(targetDoc);
  const addedChars = sections.reduce((sum, s) => sum + s.addedChars, 0);
  const removedChars = sections.reduce((sum, s) => sum + s.removedChars, 0);
  const changedSectionsCount = sections.filter((s) => s.status !== 'unchanged').length;
  const styleChanges = diffStyleMeta(baseDoc, targetDoc);

  return {
    baseId: baseDoc.id,
    baseName: baseDoc.name,
    targetId: targetDoc.id,
    targetName: targetDoc.name,
    sameDoc,
    hasChanges: changedSectionsCount > 0 || styleChanges.length > 0,
    baseCharCount,
    targetCharCount,
    charDelta: targetCharCount - baseCharCount,
    addedChars,
    removedChars,
    baseQuantCount: countQuantifiedMetrics(baseDoc),
    targetQuantCount: countQuantifiedMetrics(targetDoc),
    changedSectionsCount,
    totalSectionsCount: sections.length,
    styleChanges,
    sections,
  };
}
