import type {
  CaseItem,
  ResumeBilingualInfo,
  ResumeDoc,
  ResumeKeyContentSummary,
  TitledItem,
  TranslatedResumePayload,
} from '../types/resume';
import {
  applySectionLanguage,
  cloneResumeDoc,
  customHasContent,
  expKpisOf,
  nid,
  stripBold,
} from './resumeLogic';

export function normalizeBilingual(raw: unknown): ResumeBilingualInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<ResumeBilingualInfo>;
  if ((r.lang !== 'zh' && r.lang !== 'en') || typeof r.pairedId !== 'string' || !r.pairedId.trim()) {
    return undefined;
  }
  return {
    lang: r.lang,
    pairedId: r.pairedId.trim(),
    pairedName: typeof r.pairedName === 'string' ? r.pairedName.trim() : '',
    translatedAt: typeof r.translatedAt === 'string' ? r.translatedAt : '',
    glossaryNotes: Array.isArray(r.glossaryNotes)
      ? r.glossaryNotes.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).slice(0, 6)
      : undefined,
    modelUsed: typeof r.modelUsed === 'string' && r.modelUsed.trim() ? r.modelUsed.trim() : undefined,
  };
}

function normalizeEnPeriod(period: string): string {
  return period
    .replace(/至今|现在/g, 'Present')
    .replace(/\s*至\s*/g, ' - ')
    .trim();
}

export function extractResumeKeyContent(doc: ResumeDoc): {
  payload: Record<string, unknown>;
  summary: ResumeKeyContentSummary;
} {
  const { data } = doc;
  const visibleCustom = data.custom.filter((c) => c.show && customHasContent(c));

  const bulletCount = data.experience.reduce(
    (acc, exp) => acc + exp.bullets.filter((b) => b.trim()).length,
    0,
  );
  const expCount = data.experience.filter(
    (e) => e.company.trim() || e.role.trim() || e.bullets.some((b) => b.trim()),
  ).length;
  const skillGroupCount = data.skills.filter((s) => s.cat.trim() || s.items.trim()).length;
  const eduCount = data.education.filter((e) => e.school.trim() || e.major.trim()).length;
  const certCount = data.certs.filter((c) => c.trim()).length;

  // Auto-detect representative domain / role / skill key terms for transparent preview
  const termCandidates: string[] = [];
  if (data.intent.position.trim()) {
    data.intent.position
      .split(/[\/|｜、,，]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
      .slice(0, 2)
      .forEach((t) => termCandidates.push(t));
  }
  for (const tag of data.tags) {
    if (tag.trim()) termCandidates.push(tag.trim());
  }
  for (const sk of data.skills) {
    if (sk.cat.trim()) termCandidates.push(sk.cat.trim());
  }
  for (const exp of data.experience) {
    if (exp.role.trim()) termCandidates.push(exp.role.trim());
  }
  const keyTerms = Array.from(new Set(termCandidates)).slice(0, 6);

  const hasContent = Boolean(
    data.basic.headline.trim() ||
      data.intent.position.trim() ||
      expCount > 0 ||
      skillGroupCount > 0 ||
      eduCount > 0 ||
      visibleCustom.length > 0,
  );

  const payload = {
    basic: {
      name: data.basic.name,
      headline: data.basic.headline,
      location: data.basic.location,
      age: data.basic.age,
      extras: data.basic.extras
        .filter((ex) => ex.label.trim() || ex.value.trim())
        .map((ex) => ({ id: ex.id, label: ex.label, value: ex.value })),
    },
    intent: { ...data.intent },
    experience: data.experience.map((exp) => ({
      id: exp.id,
      company: exp.company,
      role: exp.role,
      period: exp.period,
      subtitle: exp.subtitle,
      kpis: expKpisOf(exp.kpis),
      bullets: exp.bullets.filter((b) => b.trim()),
    })),
    skills: data.skills
      .filter((s) => s.cat.trim() || s.items.trim())
      .map((s) => ({ id: s.id, cat: s.cat, items: s.items })),
    education: data.education
      .filter((e) => e.school.trim() || e.major.trim())
      .map((e) => ({
        id: e.id,
        school: e.school,
        major: e.major,
        degree: e.degree,
        period: e.period,
        desc: e.desc,
      })),
    certs: data.certs.filter((c) => c.trim()),
    tags: data.tags.filter((t) => t.trim()),
    evals: data.evals
      .filter((ev) => ev.title.trim() || ev.body.trim())
      .map((ev) => ({ id: ev.id, title: ev.title, body: ev.body })),
    custom: visibleCustom.map((cm) => ({
      id: cm.id,
      title: cm.title,
      kind: cm.kind,
      items: cm.items,
    })),
  };

  return {
    payload,
    summary: {
      expCount,
      bulletCount,
      skillGroupCount,
      eduCount,
      certCount,
      customCount: visibleCustom.length,
      keyTerms,
      hasContent,
    },
  };
}

export function findBilingualPair(
  resumes: ResumeDoc[],
  activeDoc: ResumeDoc,
): { sibling: ResumeDoc | null; direction: 'to-en' | 'to-zh' } {
  if (activeDoc.bilingual?.lang === 'en') {
    const zhOriginal = resumes.find((r) => r.id === activeDoc.bilingual?.pairedId) || null;
    return { sibling: zhOriginal, direction: 'to-zh' };
  }
  const enSibling =
    resumes.find(
      (r) => r.bilingual?.lang === 'en' && r.bilingual.pairedId === activeDoc.id,
    ) || null;
  return { sibling: enSibling, direction: 'to-en' };
}

export function applyEnglishTranslation(
  sourceZhDoc: ResumeDoc,
  translated: TranslatedResumePayload,
  options?: {
    existingNames?: string[];
    existingEnId?: string;
    modelUsed?: string;
  },
): ResumeDoc {
  const next = cloneResumeDoc(sourceZhDoc);
  next.id = options?.existingEnId || nid('resume');

  // Clean English version naming (avoiding duplicate suffixes & collisions)
  const cleanBase = sourceZhDoc.name
    .replace(/（English\s*专业版(?:\s*#\d+)?）/g, '')
    .replace(/\(English(?:\s*#\d+)?\)/gi, '')
    .trim();
  const desiredBase =
    translated.versionName?.trim() || `${cleanBase || 'Resume'}（English 专业版）`;
  const existingSet = new Set(
    (options?.existingNames || []).filter((n) => n !== desiredBase || !options?.existingEnId),
  );
  let finalName = desiredBase;
  if (!options?.existingEnId && existingSet.has(finalName)) {
    let seq = 2;
    while (existingSet.has(`${desiredBase} #${seq}`)) seq += 1;
    finalName = `${desiredBase} #${seq}`;
  }
  next.name = finalName;

  // Switch section headings cleanly to idiomatic English
  applySectionLanguage(next.meta, 'en');

  // Basic info (preserve photo, phone, email verbatim!)
  if (translated.basic && typeof translated.basic === 'object') {
    if (translated.basic.name?.trim()) next.data.basic.name = translated.basic.name.trim();
    if (translated.basic.headline?.trim()) next.data.basic.headline = translated.basic.headline.trim();
    if (translated.basic.location?.trim()) next.data.basic.location = translated.basic.location.trim();
    if (translated.basic.age?.trim()) next.data.basic.age = translated.basic.age.trim();
    if (Array.isArray(translated.basic.extras) && translated.basic.extras.length > 0) {
      const byId = new Map(
        translated.basic.extras.filter((e) => e?.id).map((e) => [e.id!, e]),
      );
      next.data.basic.extras = next.data.basic.extras.map((orig, idx) => {
        const hit = byId.get(orig.id) || translated.basic!.extras![idx];
        if (!hit) return orig;
        return {
          ...orig,
          label: hit.label?.trim() || orig.label,
          value: hit.value?.trim() || orig.value,
        };
      });
    }
  }

  // Intent
  if (translated.intent && typeof translated.intent === 'object') {
    next.data.intent = {
      position: translated.intent.position?.trim() || next.data.intent.position,
      city: translated.intent.city?.trim() || next.data.intent.city,
      salary: translated.intent.salary?.trim() || next.data.intent.salary,
      availability: translated.intent.availability?.trim() || next.data.intent.availability,
    };
  }

  // Experience
  if (Array.isArray(translated.experience) && translated.experience.length > 0) {
    const byId = new Map(
      translated.experience.filter((e) => e?.id).map((e) => [e.id!, e]),
    );
    next.data.experience = next.data.experience.map((orig, idx) => {
      const hit = byId.get(orig.id) || translated.experience![idx];
      if (!hit) {
        return { ...orig, period: normalizeEnPeriod(orig.period) };
      }
      const nextKpis =
        Array.isArray(hit.kpis) && hit.kpis.length > 0
          ? hit.kpis.map((k, kIdx) => ({
              num: k.num?.trim() || orig.kpis?.[kIdx]?.num || '',
              label: k.label?.trim() || orig.kpis?.[kIdx]?.label || '',
            }))
          : orig.kpis;
      return {
        ...orig,
        company: hit.company?.trim() || orig.company,
        role: hit.role?.trim() || orig.role,
        period: normalizeEnPeriod(hit.period?.trim() || orig.period),
        subtitle: hit.subtitle?.trim() || orig.subtitle,
        kpis: nextKpis,
        bullets:
          Array.isArray(hit.bullets) && hit.bullets.length > 0
            ? hit.bullets.filter((b): b is string => typeof b === 'string' && Boolean(b.trim()))
            : orig.bullets,
      };
    });
  } else {
    next.data.experience = next.data.experience.map((e) => ({
      ...e,
      period: normalizeEnPeriod(e.period),
    }));
  }

  // Skills
  if (Array.isArray(translated.skills) && translated.skills.length > 0) {
    const byId = new Map(translated.skills.filter((s) => s?.id).map((s) => [s.id!, s]));
    next.data.skills = next.data.skills.map((orig, idx) => {
      const hit = byId.get(orig.id) || translated.skills![idx];
      if (!hit) return orig;
      return {
        ...orig,
        cat: hit.cat?.trim() || orig.cat,
        items: hit.items?.trim() || orig.items,
      };
    });
  }

  // Education
  if (Array.isArray(translated.education) && translated.education.length > 0) {
    const byId = new Map(translated.education.filter((e) => e?.id).map((e) => [e.id!, e]));
    next.data.education = next.data.education.map((orig, idx) => {
      const hit = byId.get(orig.id) || translated.education![idx];
      if (!hit) return { ...orig, period: normalizeEnPeriod(orig.period) };
      return {
        ...orig,
        school: hit.school?.trim() || orig.school,
        major: hit.major?.trim() || orig.major,
        degree: hit.degree?.trim() || orig.degree,
        period: normalizeEnPeriod(hit.period?.trim() || orig.period),
        desc: hit.desc?.trim() || orig.desc,
      };
    });
  }

  // Certs & Tags & Evals
  if (Array.isArray(translated.certs) && translated.certs.length > 0) {
    next.data.certs = translated.certs.filter((c): c is string => typeof c === 'string' && Boolean(c.trim()));
  }
  if (Array.isArray(translated.tags) && translated.tags.length > 0) {
    next.data.tags = translated.tags.filter((t): t is string => typeof t === 'string' && Boolean(t.trim()));
  }
  if (Array.isArray(translated.evals) && translated.evals.length > 0) {
    const byId = new Map(translated.evals.filter((e) => e?.id).map((e) => [e.id!, e]));
    next.data.evals = next.data.evals.map((orig, idx) => {
      const hit = byId.get(orig.id) || translated.evals![idx];
      if (!hit) return orig;
      return {
        ...orig,
        title: hit.title?.trim() || orig.title,
        body: hit.body?.trim() || orig.body,
      };
    });
  }

  // Custom modules
  if (Array.isArray(translated.custom) && translated.custom.length > 0) {
    const byId = new Map(translated.custom.filter((c) => c?.id).map((c) => [c.id!, c]));
    next.data.custom = next.data.custom.map((orig, idx) => {
      const hit = byId.get(orig.id) || translated.custom![idx];
      if (!hit) return orig;
      let nextItems = orig.items;
      if (Array.isArray(hit.items) && hit.items.length > 0) {
        if (orig.kind === 'tags' || orig.kind === 'bullets' || orig.kind === 'text') {
          const validStrings = hit.items.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()));
          if (validStrings.length > 0) nextItems = validStrings;
        } else if (orig.kind === 'titled') {
          const validTitled = hit.items.filter(
            (x): x is TitledItem => Boolean(x && typeof x === 'object' && ('title' in x || 'body' in x)),
          );
          if (validTitled.length > 0) nextItems = validTitled;
        } else if (orig.kind === 'cases') {
          const validCases = hit.items.filter(
            (x): x is CaseItem => Boolean(x && typeof x === 'object' && ('title' in x || 'action' in x)),
          );
          if (validCases.length > 0) nextItems = validCases;
        }
      }
      return {
        ...orig,
        title: hit.title?.trim() || orig.title,
        items: nextItems,
      };
    });
  }

  const glossaryNotes = Array.isArray(translated.glossaryNotes)
    ? translated.glossaryNotes
        .filter((n): n is string => typeof n === 'string' && Boolean(stripBold(n).trim()))
        .map((n) => n.trim())
        .slice(0, 6)
    : undefined;

  next.bilingual = {
    lang: 'en',
    pairedId: sourceZhDoc.id,
    pairedName: sourceZhDoc.name,
    translatedAt: new Date().toISOString(),
    ...(glossaryNotes && glossaryNotes.length > 0 ? { glossaryNotes } : {}),
    ...(options?.modelUsed ? { modelUsed: options.modelUsed } : {}),
  };

  return next;
}

export function buildTranslateResumePrompt(doc: ResumeDoc): string {
  const { payload } = extractResumeKeyContent(doc);
  return [
    'You are an executive bilingual resume strategist specializing in international / Fortune 500 English resumes.',
    'Translate and polish the Chinese resume key content below into idiomatic, high-impact professional English.',
    'Strict rules:',
    '1) Use authentic industry terminology and strong resume action verbs (Spearheaded, Architected, Automated, Streamlined, Drove, Delivered) instead of literal translation.',
    '2) NEVER fabricate metrics, companies, dates, or credentials. Keep all real numbers intact and convert "至今" to "Present".',
    '3) Preserve **double-asterisk** bold emphasis around 1-2 key actions/metrics in experience bullets.',
    '4) Preserve all original "id" fields so the resume studio can map items accurately.',
    '5) Include 3-5 concise terminology upgrade highlights in "glossaryNotes" (e.g., "进销存数据治理 → Inventory & Sales Data Governance").',
    `[Source Resume Key Content JSON]\n${JSON.stringify(payload, null, 2)}`,
    'Output STRICT JSON only matching this contract:\n```json\n{\n  "basic": { "name": "Pinyin / English Name", "headline": "...", "location": "...", "age": "", "extras": [{ "id": "...", "label": "...", "value": "..." }] },\n  "intent": { "position": "...", "city": "...", "salary": "...", "availability": "..." },\n  "experience": [{ "id": "...", "company": "...", "role": "...", "period": "2022.07 - Present", "subtitle": "...", "kpis": [{ "num": "85%", "label": "..." }], "bullets": ["**Action**: ..."] }],\n  "skills": [{ "id": "...", "cat": "...", "items": "..." }],\n  "education": [{ "id": "...", "school": "...", "major": "...", "degree": "...", "period": "...", "desc": "..." }],\n  "certs": ["..."],\n  "tags": ["..."],\n  "evals": [{ "id": "...", "title": "...", "body": "..." }],\n  "custom": [{ "id": "...", "title": "...", "items": [] }],\n  "glossaryNotes": ["中文术语 → Idiomatic English Term"]\n}\n```',
  ].join('\n\n');
}

export function parseExternalTranslateResumeJson(raw: string): TranslatedResumePayload {
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced && fenced[1] ? fenced[1].trim() : stripped;
  if (!fenced) {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end > start) candidate = stripped.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error('未能解析出合法 JSON，请确认完整复制了外部 AI 返回的英文简历 JSON。');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON 根节点需为对象格式，请使用「复制中译英专业 Prompt」获取标准 JSON。');
  }

  const obj = parsed as TranslatedResumePayload;
  const hasAnySection = Boolean(
    obj.basic?.headline ||
      obj.basic?.name ||
      obj.intent?.position ||
      (Array.isArray(obj.experience) && obj.experience.length > 0) ||
      (Array.isArray(obj.skills) && obj.skills.length > 0) ||
      (Array.isArray(obj.education) && obj.education.length > 0),
  );
  if (!hasAnySection) {
    throw new Error('JSON 中缺少英文简历核心字段（如 basic / experience / skills），请检查返回内容。');
  }

  return obj;
}
