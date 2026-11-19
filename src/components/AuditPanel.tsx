import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BookmarkPlus,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  FileJson2,
  Highlighter,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { BUILTIN_AUDIT_PROMPTS, FIXED_MODULE_LABELS } from '../data/themes';
import type {
  AiAuditReport,
  AiConfigSaveResult,
  AiProviderId,
  AiProviderInfo,
  AuditPromptPreset,
  CustomAiConfig,
  JdKeywordTier,
  JdScanEngine,
  JdSemanticMatchReport,
  JdStructuredExtractResult,
  JdStructuredSkillItem,
  LocalCheckItem,
  LocalJdKeywordDetail,
  ResumeDoc,
} from '../types/resume';
import {
  assembleAuditPrompt,
  buildAiRequestDefaults,
  buildJdExtractPrompt,
  buildJdSemanticScoringPrompt,
  computeWeightedSemanticScore,
  evaluateJdSkillsAgainstResume,
  extractLocalJdSkills,
  flattenStructuredJdSkills,
  formatPlainText,
  highlightJdSegments,
  isCustomAiReady,
  nid,
  normalizeStructuredJdExtract,
  parseExternalAuditJson,
  parseExternalJdExtractJson,
  parseExternalJdSemanticJson,
  scoreJdSemanticRelevanceWithLlm,
} from '../utils/resumeLogic';
import { AiProviderSelector } from './AiProviderSelector';

const CUSTOM_PROMPTS_KEY = 'resume_studio_custom_audit_prompts_v1';

interface AuditPanelProps {
  doc: ResumeDoc;
  localChecks: LocalCheckItem[];
  providers: AiProviderInfo[];
  selectedProvider: AiProviderId;
  onSelectProvider: (provider: AiProviderId) => void;
  customConfig: CustomAiConfig;
  onSaveCustomConfig: (draft: CustomAiConfig) => AiConfigSaveResult;
  onClearCustomConfig: () => void;
  onOpenSettings: () => void;
  onMutate: (mutator: (draft: ResumeDoc) => void, recordHistory?: boolean) => void;
  onJumpToModule: (moduleKey: string) => void;
  onNotify: (msg: string) => void;
}

function loadCustomPrompts(): AuditPromptPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PROMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AuditPanel({
  doc,
  localChecks,
  providers,
  selectedProvider,
  onSelectProvider,
  customConfig,
  onSaveCustomConfig,
  onClearCustomConfig,
  onOpenSettings,
  onMutate,
  onJumpToModule,
  onNotify,
}: AuditPanelProps) {
  const anyAiReady = isCustomAiReady(customConfig) || providers.some((p) => p.configured);

  const [subView, setSubView] = useState<'local' | 'ai'>('local');
  const [customPrompts, setCustomPrompts] = useState<AuditPromptPreset[]>(() =>
    loadCustomPrompts(),
  );
  const [selectedPromptId, setSelectedPromptId] = useState<string>(BUILTIN_AUDIT_PROMPTS[0].id);
  const [promptText, setPromptText] = useState<string>(BUILTIN_AUDIT_PROMPTS[0].prompt);
  const [targetJd, setTargetJd] = useState<string>('');
  const [savingPromptName, setSavingPromptName] = useState<string>('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<AiAuditReport | null>(null);

  // External AI JSON report import (open by default when no API is configured yet)
  const [showImportJson, setShowImportJson] = useState(!anyAiReady);
  const [externalAuditJson, setExternalAuditJson] = useState('');
  const [externalAuditError, setExternalAuditError] = useState<string | null>(null);

  useEffect(() => {
    if (anyAiReady) {
      setShowImportJson(false);
    }
  }, [anyAiReady]);

  const allPresets = [...BUILTIN_AUDIT_PROMPTS, ...customPrompts];

  // Dual-engine JD Scanner state (Local Offline vs LLM Enhanced + Human-in-the-loop edits)
  const [jdEngine, setJdEngine] = useState<JdScanEngine>('local');
  const [removedJdKeys, setRemovedJdKeys] = useState<string[]>([]);
  const [manualJdSkills, setManualJdSkills] = useState<JdStructuredSkillItem[]>([]);
  const [manualKwInput, setManualKwInput] = useState('');
  const [manualKwTier, setManualKwTier] = useState<JdKeywordTier>('core');
  const [showJdHighlight, setShowJdHighlight] = useState(false);

  const [llmExtracted, setLlmExtracted] = useState<JdStructuredExtractResult | null>(null);
  const [llmExtractLoading, setLlmExtractLoading] = useState(false);
  const [llmExtractError, setLlmExtractError] = useState<string | null>(null);
  const [llmExtractMeta, setLlmExtractMeta] = useState<string | null>(null);
  const [semanticReport, setSemanticReport] = useState<JdSemanticMatchReport | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [showLlmPasteJson, setShowLlmPasteJson] = useState(false);
  const [externalJdJson, setExternalJdJson] = useState('');
  const [externalJdJsonError, setExternalJdJsonError] = useState<string | null>(null);

  // Step 1: Extract base JD skills from local offline engine
  const localExtracted = useMemo(() => extractLocalJdSkills(targetJd), [targetJd]);

  // Step 2: Merge active engine's skills with user manual additions & [x] removals, then score live
  const activeJdSkills = useMemo(() => {
    const baseSkills: JdStructuredSkillItem[] =
      jdEngine === 'llm' && llmExtracted
        ? flattenStructuredJdSkills(llmExtracted)
        : localExtracted.skills;
    const removedSet = new Set(removedJdKeys.map((k) => k.toLowerCase()));
    const filteredBase = baseSkills.filter((item) => !removedSet.has(item.keyword.toLowerCase()));
    const filteredManual = manualJdSkills.filter(
      (item) => !removedSet.has(item.keyword.toLowerCase()),
    );
    return [...filteredBase, ...filteredManual];
  }, [jdEngine, llmExtracted, localExtracted.skills, removedJdKeys, manualJdSkills]);

  const jdMatch = useMemo(
    () =>
      evaluateJdSkillsAgainstResume(doc, activeJdSkills, {
        cleanedJd: localExtracted.cleanedJd,
        noiseRemovedCount: localExtracted.noiseRemovedCount,
      }),
    [doc, activeJdSkills, localExtracted.cleanedJd, localExtracted.noiseRemovedCount],
  );

  const allJdDetails = useMemo(
    () => [...(jdMatch.matchedDetails || []), ...(jdMatch.missingDetails || [])],
    [jdMatch.matchedDetails, jdMatch.missingDetails],
  );

  const groupedLlmCategories = useMemo(() => {
    if (jdEngine !== 'llm' || !llmExtracted) return [];
    const map = new Map<string, LocalJdKeywordDetail[]>();
    for (const d of allJdDetails) {
      const cat = d.category || (d.source === 'manual' ? '手动补充' : '其他要求');
      const arr = map.get(cat) || [];
      arr.push(d);
      map.set(cat, arr);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [jdEngine, llmExtracted, allJdDetails]);

  const highlightedJdSegments = useMemo(
    () => (showJdHighlight ? highlightJdSegments(localExtracted.cleanedJd, allJdDetails) : []),
    [showJdHighlight, localExtracted.cleanedJd, allJdDetails],
  );

  // Live-filtered LLM semantic relevance report (recalculates weighted score when user clicks [x])
  const visibleSemanticReport = useMemo<JdSemanticMatchReport | null>(() => {
    if (!semanticReport) return null;
    const removedSet = new Set(removedJdKeys.map((k) => k.toLowerCase()));
    const filteredScores = semanticReport.skillScores.filter(
      (item) => !removedSet.has(item.keyword.toLowerCase()),
    );
    const overallScore =
      filteredScores.length === semanticReport.skillScores.length
        ? semanticReport.overallScore
        : computeWeightedSemanticScore(filteredScores);
    return {
      ...semanticReport,
      skillScores: filteredScores,
      overallScore,
    };
  }, [semanticReport, removedJdKeys]);

  const handleRemoveJdKeyword = (keyword: string) => {
    const key = keyword.toLowerCase();
    setRemovedJdKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setManualJdSkills((prev) => prev.filter((item) => item.keyword.toLowerCase() !== key));
  };

  const handleAddManualJdKeyword = () => {
    const raw = manualKwInput.trim();
    if (!raw) return;
    const parts = raw
      .split(/[,，、;；]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const addedKeys = new Set(parts.map((p) => p.toLowerCase()));
    setRemovedJdKeys((prev) => prev.filter((k) => !addedKeys.has(k)));
    setManualJdSkills((prev) => {
      const next = [...prev];
      for (const kw of parts) {
        const existsIdx = next.findIndex((x) => x.keyword.toLowerCase() === kw.toLowerCase());
        const entry: JdStructuredSkillItem = {
          keyword: kw,
          tier: manualKwTier,
          category: jdEngine === 'llm' ? '手动补充' : undefined,
          source: 'manual',
          surfaceTerms: [kw],
        };
        if (existsIdx >= 0) {
          next[existsIdx] = entry;
        } else {
          next.push(entry);
        }
      }
      return next;
    });
    setManualKwInput('');
  };

  const handleResetManualJdEdits = () => {
    setRemovedJdKeys([]);
    setManualJdSkills([]);
    onNotify('已恢复当前引擎提取的默认关键词列表');
  };

  const handleCopyJdExtractPrompt = async () => {
    if (!targetJd.trim()) {
      onNotify('请先在上方粘贴目标岗位 JD 原文');
      return;
    }
    const prompt = buildJdExtractPrompt(targetJd, doc.data.intent.position || doc.name);
    try {
      await navigator.clipboard.writeText(prompt);
      onNotify('已复制 JD 结构化提取 Prompt，可发给任意大模型后把 JSON 贴回');
    } catch {
      onNotify('复制失败，请检查剪贴板权限');
    }
  };

  const handleCopyJdSemanticPrompt = async () => {
    if (targetJd.trim().length < 8) {
      onNotify('请先在上方粘贴目标岗位 JD 原文（至少 8 个字）');
      return;
    }
    const prompt = buildJdSemanticScoringPrompt(doc, targetJd, activeJdSkills);
    try {
      await navigator.clipboard.writeText(prompt);
      onNotify('已复制 LLM 语义相关性打分 Prompt，可发给任意大模型后把 JSON 贴回');
    } catch {
      onNotify('复制失败，请检查剪贴板权限');
    }
  };

  const handleImportExternalJdJson = () => {
    if (!externalJdJson.trim()) {
      setExternalJdJsonError('请先粘贴大模型返回的结构化提取或语义打分 JSON。');
      return;
    }
    // Auto-detect semantic relevance scoring JSON (contains skillScores / relevanceScore)
    const strippedPreview = externalJdJson.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const looksLikeSemantic =
      /"skillScores"\s*:/.test(strippedPreview) || /"relevanceScore"\s*:/.test(strippedPreview);

    if (looksLikeSemantic) {
      try {
        const parsedSemantic = parseExternalJdSemanticJson(
          externalJdJson,
          llmExtracted ? activeJdSkills : [],
        );
        setSemanticReport(parsedSemantic);
        setLlmExtractError(null);
        setExternalJdJsonError(null);
        setExternalJdJson('');
        setShowLlmPasteJson(false);
        setRemovedJdKeys([]);
        onNotify(
          `已导入 ${parsedSemantic.skillScores.length} 项技能语义相关性打分（综合 ${parsedSemantic.overallScore}%）`,
        );
        return;
      } catch (err: unknown) {
        setExternalJdJsonError(err instanceof Error ? err.message : '语义打分 JSON 解析失败');
        return;
      }
    }

    try {
      const parsed = parseExternalJdExtractJson(externalJdJson);
      setLlmExtracted(parsed);
      setLlmExtractMeta('外部 AI 导入');
      setLlmExtractError(null);
      setExternalJdJsonError(null);
      setExternalJdJson('');
      setShowLlmPasteJson(false);
      setRemovedJdKeys([]);
      onNotify(`已导入 ${parsed.categories.length} 个分类的硬性技能词并完成匹配`);
    } catch (err: unknown) {
      setExternalJdJsonError(err instanceof Error ? err.message : 'JSON 解析失败');
    }
  };

  const handleRunLlmJdExtract = async () => {
    if (targetJd.trim().length < 8) {
      setLlmExtractError('请先粘贴目标岗位 JD 原文（至少 8 个字）再提取。');
      return;
    }
    if (!anyAiReady) {
      setShowLlmPasteJson(true);
      setLlmExtractError('尚未配置直连 AI Key：可在右上角「设置」填入 API，或点「复制提取 Prompt」免费配合外部大模型后粘贴 JSON。');
      return;
    }
    setLlmExtractLoading(true);
    setLlmExtractError(null);
    try {
      const res = await fetch('/api/ai/extract-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildAiRequestDefaults(customConfig, selectedProvider),
          jdText: targetJd,
          roleHint: doc.data.intent.position || doc.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLlmExtractError(data.error || `提取失败 (${res.status})`);
        return;
      }
      const normalized = normalizeStructuredJdExtract(data.extracted);
      setLlmExtracted(normalized);
      setLlmExtractMeta(data.meta?.model ? String(data.meta.model) : 'LLM');
      setRemovedJdKeys([]);
      onNotify(`LLM 结构化提取完成（${normalized.categories.length} 个分类）`);
    } catch (err: unknown) {
      setLlmExtractError(err instanceof Error ? `网络异常：${err.message}` : '网络请求失败');
    } finally {
      setLlmExtractLoading(false);
    }
  };

  const handleRunLlmSemanticScore = async () => {
    if (targetJd.trim().length < 8) {
      setLlmExtractError('请先粘贴目标岗位 JD 原文（至少 8 个字）再执行语义相关性打分。');
      return;
    }
    if (!anyAiReady) {
      setShowLlmPasteJson(true);
      setLlmExtractError(
        '尚未配置直连 AI Key：可在右上角「设置」填入 API，或点「复制打分 Prompt」免费配合外部大模型后点击「粘贴 JSON」导入语义评分。',
      );
      return;
    }
    setSemanticLoading(true);
    setLlmExtractError(null);
    try {
      const reportResult = await scoreJdSemanticRelevanceWithLlm({
        doc,
        jdText: targetJd,
        skills: activeJdSkills,
        customConfig,
        selectedProvider,
      });
      setSemanticReport(reportResult);
      setRemovedJdKeys([]);
      onNotify(
        `LLM 语义相关性打分完成（综合 ${reportResult.overallScore}% · ${reportResult.skillScores.length} 项硬性技能）`,
      );
    } catch (err: unknown) {
      setLlmExtractError(err instanceof Error ? err.message : '语义相关性打分失败');
    } finally {
      setSemanticLoading(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(customPrompts));
    } catch {
      // ignore storage quota
    }
  }, [customPrompts]);

  const handleSelectPreset = (preset: AuditPromptPreset) => {
    setSelectedPromptId(preset.id);
    setPromptText(preset.prompt);
  };

  const handleSaveCustomPrompt = () => {
    const name = savingPromptName.trim();
    if (!name || !promptText.trim()) {
      onNotify('请填写自定义 Prompt 名称与指令内容');
      return;
    }
    const created: AuditPromptPreset = {
      id: nid('prompt'),
      name,
      tag: '自定义',
      summary: '用户保存的个人体检模板',
      prompt: promptText.trim(),
      isCustom: true,
    };
    setCustomPrompts((prev) => [...prev, created]);
    setSelectedPromptId(created.id);
    setSavingPromptName('');
    setShowSaveInput(false);
    onNotify(`已保存自定义 Prompt「${name}」`);
  };

  const handleDeleteCustomPrompt = (id: string) => {
    setCustomPrompts((prev) => prev.filter((p) => p.id !== id));
    if (selectedPromptId === id) {
      setSelectedPromptId(BUILTIN_AUDIT_PROMPTS[0].id);
      setPromptText(BUILTIN_AUDIT_PROMPTS[0].prompt);
    }
    onNotify('已删除自定义 Prompt');
  };

  const handleCopyFullPrompt = async () => {
    const full = assembleAuditPrompt(promptText, formatPlainText(doc), targetJd);
    try {
      await navigator.clipboard.writeText(full);
      onNotify('已复制完整 Prompt（含 JSON 格式约定，可粘贴给 DeepSeek / Kimi / Claude / Ollama）');
    } catch {
      onNotify('复制失败，请手动选中复制');
    }
  };

  const handleImportExternalAudit = () => {
    if (!externalAuditJson.trim()) {
      setExternalAuditError('请先粘贴外部 AI 返回的体检 JSON。');
      return;
    }
    try {
      const parsed = parseExternalAuditJson(externalAuditJson);
      setExternalAuditError(null);
      setErrorMsg(null);
      setReport(parsed);
      setExternalAuditJson('');
      onNotify('已导入外部 AI 体检报告并渲染为定位卡片');
    } catch (err: unknown) {
      setExternalAuditError(
        err instanceof Error ? err.message : 'JSON 解析失败，请确认复制完整。',
      );
    }
  };

  const handleRunAiAudit = async () => {
    if (!promptText.trim()) {
      setErrorMsg('请先选择或填写体检 Prompt 指令。');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildAiRequestDefaults(customConfig, selectedProvider),
          resumeText: formatPlainText(doc),
          customPrompt: promptText,
          targetJd,
          roleHint: doc.data.intent.position || doc.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `请求失败 (${res.status})`);
        return;
      }
      setReport(data.report as AiAuditReport);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? `网络异常：${err.message}` : '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const errCount = localChecks.filter((c) => c.lv === 'err').length;
  const warnCount = localChecks.filter((c) => c.lv === 'warn').length;
  const tipCount = localChecks.filter((c) => c.lv === 'tip').length;

  return (
    <div className="space-y-4">
      {/* Dual-Engine Switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setSubView('local')}
          className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            subView === 'local'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          离线体检 & JD 扫描 ({localChecks.length})
        </button>
        <button
          type="button"
          onClick={() => setSubView('ai')}
          className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            subView === 'ai'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          AI 深度体检 & Prompt
        </button>
      </div>

      {/* Engine 1: Local Instant Rule Checks + Pure Offline JD Keyword Gap Scanner */}
      {subView === 'local' && (
        <div className="space-y-4">
          {/* Dual-Engine JD Keyword Gap Scanner (Local Offline + LLM Enhanced + Human-in-the-Loop) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 whitespace-nowrap">
                  <ScanSearch className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>双引擎 JD 扫描</span>
                </div>
                {jdEngine === 'llm' && visibleSemanticReport ? (
                  <span
                    data-testid="jd-match-score"
                    className={`font-mono text-xs font-bold tabular-nums whitespace-nowrap ${
                      visibleSemanticReport.overallScore >= 75
                        ? 'text-emerald-700'
                        : visibleSemanticReport.overallScore >= 40
                          ? 'text-amber-700'
                          : 'text-red-700'
                    }`}
                  >
                    语义匹配 {visibleSemanticReport.overallScore}%
                  </span>
                ) : (
                  jdMatch.totalKeywords > 0 && (
                    <span
                      data-testid="jd-match-score"
                      className={`font-mono text-xs font-bold tabular-nums whitespace-nowrap ${
                        jdMatch.scorePct >= 70
                          ? 'text-emerald-700'
                          : jdMatch.scorePct >= 40
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      命中 {jdMatch.scorePct}%
                    </span>
                  )
                )}
              </div>
              <div
                role="group"
                aria-label="JD 提取引擎切换"
                className="inline-flex shrink-0 rounded-md border border-slate-200 bg-white p-0.5 text-[10.5px]"
              >
                <button
                  type="button"
                  onClick={() => setJdEngine('local')}
                  className={`rounded px-1.5 py-0.5 font-medium whitespace-nowrap transition-colors ${
                    jdEngine === 'local'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  本地离线
                </button>
                <button
                  type="button"
                  onClick={() => setJdEngine('llm')}
                  className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium whitespace-nowrap transition-colors ${
                    jdEngine === 'llm'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="h-2.5 w-2.5 shrink-0" />
                  LLM 增强
                </button>
              </div>
            </div>

            <textarea
              aria-label="离线扫描目标岗位 JD"
              rows={3}
              value={targetJd}
              onChange={(e) => {
                setTargetJd(e.target.value);
                setLlmExtractError(null);
              }}
              placeholder={
                jdEngine === 'llm'
                  ? '粘贴目标岗位 JD 原文，点击下方「AI 结构化提取」或「复制提取 Prompt」让大模型按分类/层级拆分硬性要求并忽略软性套话...'
                  : '粘贴招聘 JD 原文（支持含乱码、HTML、Markdown 或模糊描述），本地实时清洗并按权重+同义词+模糊语义算分...'
              }
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
            />

            {/* LLM Enhanced Engine Action Bar */}
            {jdEngine === 'llm' && (
              <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={semanticLoading || llmExtractLoading}
                    onClick={handleRunLlmSemanticScore}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {semanticLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <BrainCircuit className="h-3 w-3" />
                    )}
                    {semanticLoading ? '语义打分中...' : '语义相关性打分'}
                  </button>
                  <button
                    type="button"
                    disabled={llmExtractLoading || semanticLoading}
                    onClick={handleRunLlmJdExtract}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                  >
                    {llmExtractLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {llmExtractLoading ? '提取中...' : 'AI 结构化提取'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJdSemanticPrompt}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ClipboardCopy className="h-3 w-3" />
                    复制打分 Prompt
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJdExtractPrompt}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ClipboardCopy className="h-3 w-3" />
                    复制提取 Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLlmPasteJson((v) => !v);
                      setExternalJdJsonError(null);
                    }}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${
                      showLlmPasteJson
                        ? 'border-blue-300 bg-blue-100/70 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileJson2 className="h-3 w-3" />
                    粘贴 JSON
                  </button>
                  {(llmExtracted || semanticReport) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLlmExtracted(null);
                        setLlmExtractMeta(null);
                        setSemanticReport(null);
                      }}
                      className="ml-auto text-[10.5px] text-slate-500 hover:text-slate-800"
                    >
                      清空 AI 结果
                    </button>
                  )}
                </div>

                {llmExtractError && (
                  <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <div className="space-y-1">
                      <p>{llmExtractError}</p>
                      {!anyAiReady && (
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="font-medium text-blue-700 underline hover:text-blue-800"
                        >
                          前往设置配置 API Key
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {showLlmPasteJson && (
                  <div className="space-y-1.5 rounded-md border border-blue-200 bg-white p-2">
                    <div className="text-[10.5px] text-slate-600">
                      自动识别粘贴内容：支持 <code className="rounded bg-slate-100 px-1">skillScores</code>（语义相关性打分）与 <code className="rounded bg-slate-100 px-1">categories</code>（硬性技能分类提取）两种 JSON：
                    </div>
                    <textarea
                      aria-label="粘贴 LLM 结构化 JD JSON"
                      rows={3}
                      value={externalJdJson}
                      onChange={(e) => setExternalJdJson(e.target.value)}
                      placeholder='{"overallScore":82,"summary":"数据建模经验契合","skillScores":[{"keyword":"Python","tier":"core","relevanceScore":92,"status":"strong","evidence":"用 Python 搭建自动化流水线"}]}'
                      className="w-full rounded border border-slate-200 bg-slate-50 p-1.5 font-mono text-[10.5px] text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                    {externalJdJsonError && (
                      <div className="text-[10.5px] text-red-600">{externalJdJsonError}</div>
                    )}
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowLlmPasteJson(false)}
                        className="rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleImportExternalJdJson}
                        className="rounded bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                      >
                        解析并匹配
                      </button>
                    </div>
                  </div>
                )}

                {visibleSemanticReport ? (
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10.5px] text-blue-800">
                    <span className="font-medium">
                      LLM 语义相关性打分已生效
                      {visibleSemanticReport.usedModel
                        ? `（${visibleSemanticReport.usedModel}）`
                        : visibleSemanticReport.source === 'external-json'
                          ? '（外部 AI 导入）'
                          : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSemanticReport(null)}
                      className="text-[10.5px] text-blue-700 underline hover:text-blue-900"
                    >
                      切回词面匹配
                    </button>
                  </div>
                ) : llmExtracted ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-blue-800">
                    <span className="font-medium">
                      LLM 结构化模式已生效{llmExtractMeta ? `（${llmExtractMeta}）` : ''}
                    </span>
                    {llmExtracted.ignoredSoftSkills && llmExtracted.ignoredSoftSkills.length > 0 && (
                      <span className="text-slate-500">
                        · 已忽略软性词：{llmExtracted.ignoredSoftSkills.slice(0, 5).join('、')}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[10.5px] text-slate-500">
                    点击「语义相关性打分」结合工作经历深度评分（替代字面比对），或点击「复制打分 Prompt」+「粘贴 JSON」零成本配合外部大模型使用。
                  </div>
                )}
              </div>
            )}

            {/* Match Score Bar + Highlight Toggle + Interactive Keyword Chips */}
            {(jdMatch.totalKeywords > 0 ||
              visibleSemanticReport !== null ||
              removedJdKeys.length > 0 ||
              targetJd.trim().length > 0) && (
              <div className="space-y-2 pt-0.5" data-testid="offline-jd-match-result">
                {(jdEngine === 'llm' && visibleSemanticReport
                  ? visibleSemanticReport.skillScores.length > 0
                  : jdMatch.totalKeywords > 0) && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (jdEngine === 'llm' && visibleSemanticReport
                          ? visibleSemanticReport.overallScore
                          : jdMatch.scorePct) >= 70
                          ? 'bg-emerald-600'
                          : (jdEngine === 'llm' && visibleSemanticReport
                                ? visibleSemanticReport.overallScore
                                : jdMatch.scorePct) >= 40
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{
                        width: `${
                          jdEngine === 'llm' && visibleSemanticReport
                            ? visibleSemanticReport.overallScore
                            : jdMatch.scorePct
                        }%`,
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-500">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {(jdMatch.noiseRemovedCount || 0) > 0 && (
                      <span>已清洗 {jdMatch.noiseRemovedCount} 处噪点</span>
                    )}
                    {(jdMatch.synonymMatchedCount || 0) > 0 && (
                      <span className="text-emerald-700">
                        同义命中 {jdMatch.synonymMatchedCount} 项
                      </span>
                    )}
                    {(jdMatch.fuzzyMatchedCount || 0) > 0 && (
                      <span className="text-sky-700">
                        模糊命中 {jdMatch.fuzzyMatchedCount} 项
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {localExtracted.cleanedJd && (
                      <button
                        type="button"
                        onClick={() => setShowJdHighlight((v) => !v)}
                        aria-pressed={showJdHighlight}
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                          showJdHighlight
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <Highlighter className="h-2.5 w-2.5" />
                        原文高亮
                      </button>
                    )}
                    {(removedJdKeys.length > 0 || manualJdSkills.length > 0) && (
                      <button
                        type="button"
                        onClick={handleResetManualJdEdits}
                        className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:text-slate-900"
                        title="恢复自动提取的默认关键词"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        重置修正
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional In-Context Highlighted JD Text */}
                {showJdHighlight && highlightedJdSegments.length > 0 && (
                  <div
                    data-testid="jd-highlight-preview"
                    className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap"
                  >
                    {highlightedJdSegments.map((seg, idx) => {
                      if (!seg.detail) return <span key={idx}>{seg.text}</span>;
                      const d = seg.detail;
                      const cls =
                        d.matchType === 'missing'
                          ? d.tier === 'core'
                            ? 'rounded bg-rose-100 px-0.5 text-rose-900 font-medium'
                            : d.tier === 'bonus'
                              ? 'rounded bg-slate-200/80 px-0.5 text-slate-700'
                              : 'rounded bg-amber-100 px-0.5 text-amber-900'
                          : d.matchType === 'fuzzy'
                            ? 'rounded bg-sky-100 px-0.5 text-sky-900'
                            : 'rounded bg-emerald-100 px-0.5 text-emerald-900 font-medium';
                      return (
                        <mark
                          key={idx}
                          title={`${d.keyword} · ${d.matchType === 'missing' ? '简历未覆盖' : '已命中'}`}
                          className={cls}
                        >
                          {seg.text}
                        </mark>
                      );
                    })}
                  </div>
                )}

                {/* LLM Semantic Relevance Scoring View (replaces literal text comparison when active) */}
                {jdEngine === 'llm' && visibleSemanticReport ? (
                  <div className="space-y-2" data-testid="llm-semantic-score-report">
                    <div className="rounded-lg border border-blue-200/80 bg-white p-2.5 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-900">
                        {visibleSemanticReport.summary}
                      </div>
                      {visibleSemanticReport.roleAlignment && (
                        <div className="text-[10.5px] leading-relaxed text-slate-600">
                          {visibleSemanticReport.roleAlignment}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {visibleSemanticReport.skillScores.map((item) => {
                        const isStrong = item.status === 'strong';
                        const isPartial = item.status === 'partial';
                        const scoreColor = isStrong
                          ? 'text-emerald-700'
                          : isPartial
                            ? 'text-amber-700'
                            : 'text-rose-700';
                        const barColor = isStrong
                          ? 'bg-emerald-500'
                          : isPartial
                            ? 'bg-amber-500'
                            : 'bg-rose-500';
                        const borderColor = isStrong
                          ? 'border-emerald-200/80 bg-emerald-50/30'
                          : isPartial
                            ? 'border-amber-200/80 bg-amber-50/30'
                            : 'border-rose-200/80 bg-rose-50/30';
                        return (
                          <div
                            key={`sem-${item.keyword}`}
                            className={`rounded-lg border p-2 space-y-1 ${borderColor}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1 min-w-0">
                                <span className="text-[11px] font-semibold text-slate-900">
                                  {item.keyword}
                                </span>
                                {item.tier === 'core' && (
                                  <span className="rounded bg-rose-100 px-1 text-[9px] font-semibold text-rose-700">
                                    核心
                                  </span>
                                )}
                                {item.tier === 'bonus' && (
                                  <span className="rounded bg-slate-200/80 px-1 text-[9px] text-slate-600">
                                    加分
                                  </span>
                                )}
                                {item.category && (
                                  <span className="rounded bg-slate-100 px-1 text-[9px] text-slate-600">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`font-mono text-[11px] font-bold tabular-nums ${scoreColor}`}>
                                  {item.relevanceScore}分
                                </span>
                                <button
                                  type="button"
                                  aria-label={`删除关键词 ${item.keyword}`}
                                  onClick={() => handleRemoveJdKeyword(item.keyword)}
                                  className="rounded p-0.5 text-slate-400 hover:bg-black/10 hover:text-slate-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${item.relevanceScore}%` }}
                              />
                            </div>
                            <div className="text-[10.5px] leading-snug text-slate-700">
                              <span className="font-medium text-slate-500">经历佐证：</span>
                              {item.evidence}
                            </div>
                            {item.gapAdvice && (
                              <div className="text-[10.5px] leading-snug text-amber-800">
                                <span className="font-medium">补强建议：</span>
                                {item.gapAdvice}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : jdEngine === 'llm' && groupedLlmCategories.length > 0 ? (
                  <div className="space-y-2" data-testid="llm-categorized-jd-view">
                    {groupedLlmCategories.map((group) => (
                      <div
                        key={group.name}
                        className="rounded-lg border border-slate-200/80 bg-white p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="font-semibold text-slate-800">{group.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            命中 {group.items.filter((i) => i.matchType !== 'missing').length}/
                            {group.items.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.items.map((item) => {
                            const isMissing = item.matchType === 'missing';
                            const isFuzzy = item.matchType === 'fuzzy';
                            const isSynonym = item.matchType === 'synonym';
                            const isCore = item.tier === 'core';
                            const isBonus = item.tier === 'bonus';
                            const chipCls = isMissing
                              ? isCore
                                ? 'border-rose-200 bg-rose-50 text-rose-800 font-medium'
                                : isBonus
                                  ? 'border-slate-200 bg-slate-100/80 text-slate-600'
                                  : 'border-amber-200 bg-amber-50 text-amber-800'
                              : isFuzzy
                                ? 'border-sky-200 bg-sky-50 text-sky-800'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800';
                            const tip = isMissing
                              ? `未命中 · ${isCore ? '核心要求' : isBonus ? '加分项' : '常规要求'}（点 × 可移除误提）`
                              : isSynonym
                                ? `同义命中：简历含「${item.matchedVia}」`
                                : isFuzzy
                                  ? `模糊命中：简历含「${item.matchedVia}」`
                                  : '精准命中';
                            return (
                              <span
                                key={`${group.name}-${item.keyword}`}
                                title={tip}
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] ${chipCls}`}
                              >
                                <span>{item.keyword}</span>
                                {!isMissing && isSynonym && (
                                  <span className="rounded bg-emerald-100 px-1 text-[9px] font-medium text-emerald-700">
                                    同义
                                  </span>
                                )}
                                {!isMissing && isFuzzy && (
                                  <span className="rounded bg-sky-100 px-1 text-[9px] font-medium text-sky-700">
                                    模糊
                                  </span>
                                )}
                                {isMissing && isCore && (
                                  <span className="rounded bg-rose-100 px-1 text-[9px] font-semibold text-rose-700">
                                    核心
                                  </span>
                                )}
                                {isMissing && isBonus && (
                                  <span className="rounded bg-slate-200/80 px-1 text-[9px] text-slate-600">
                                    加分
                                  </span>
                                )}
                                {item.source === 'manual' && (
                                  <span className="rounded bg-blue-100 px-1 text-[9px] text-blue-700">
                                    手动
                                  </span>
                                )}
                                <button
                                  type="button"
                                  aria-label={`删除关键词 ${item.keyword}`}
                                  onClick={() => handleRemoveJdKeyword(item.keyword)}
                                  className="ml-0.5 rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {jdMatch.matched.length > 0 && (
                      <div>
                        <div className="text-[10.5px] font-medium text-emerald-700 mb-1">
                          简历已命中（{jdMatch.matched.length} · 点 × 可剔除误提）
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(jdMatch.matchedDetails && jdMatch.matchedDetails.length > 0
                            ? jdMatch.matchedDetails
                            : jdMatch.matched.map(
                                (kw): LocalJdKeywordDetail => ({
                                  keyword: kw,
                                  weight: 2,
                                  tier: 'standard',
                                  matchType: 'exact',
                                  source: 'local',
                                }),
                              )
                          ).map((item) => {
                            const isFuzzy = item.matchType === 'fuzzy';
                            const isSynonym = item.matchType === 'synonym';
                            const tip = isSynonym
                              ? `同义词库映射命中：简历含「${item.matchedVia}」`
                              : isFuzzy
                                ? `模糊匹配：简历片段「${item.matchedVia}」（相似度 ${Math.round((item.similarity || 0) * 100)}%）`
                                : `精准命中（权重 ${item.weight}）`;
                            return (
                              <span
                                key={item.keyword}
                                title={tip}
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] ${
                                  isFuzzy
                                    ? 'border-sky-200 bg-sky-50 text-sky-800'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                <span>{item.keyword}</span>
                                {isSynonym && (
                                  <span className="rounded bg-emerald-100 px-1 text-[9px] font-medium text-emerald-700">
                                    同义
                                  </span>
                                )}
                                {isFuzzy && (
                                  <span className="rounded bg-sky-100 px-1 text-[9px] font-medium text-sky-700">
                                    模糊
                                  </span>
                                )}
                                {item.source === 'manual' && (
                                  <span className="rounded bg-blue-100 px-1 text-[9px] text-blue-700">
                                    手动
                                  </span>
                                )}
                                <button
                                  type="button"
                                  aria-label={`删除关键词 ${item.keyword}`}
                                  onClick={() => handleRemoveJdKeyword(item.keyword)}
                                  className="ml-0.5 rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {jdMatch.missing.length > 0 && (
                      <div>
                        <div className="text-[10.5px] font-medium text-amber-700 mb-1">
                          JD 提及但简历未出现（{jdMatch.missing.length} · 按核心度排序，点 × 可剔除误提）
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(jdMatch.missingDetails && jdMatch.missingDetails.length > 0
                            ? jdMatch.missingDetails
                            : jdMatch.missing.map(
                                (kw): LocalJdKeywordDetail => ({
                                  keyword: kw,
                                  weight: 2,
                                  tier: 'standard',
                                  matchType: 'missing',
                                  source: 'local',
                                }),
                              )
                          ).map((item) => {
                            const isCore = item.tier === 'core';
                            const isBonus = item.tier === 'bonus';
                            return (
                              <span
                                key={item.keyword}
                                title={
                                  isCore
                                    ? `核心要求（高权重 ${item.weight}）· 如误提可点 × 删除`
                                    : isBonus
                                      ? `加分/优先项（权重 ${item.weight}）`
                                      : `常规要求（权重 ${item.weight}）`
                                }
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] ${
                                  isCore
                                    ? 'border-rose-200 bg-rose-50 text-rose-800 font-medium'
                                    : isBonus
                                      ? 'border-slate-200 bg-slate-100/80 text-slate-600'
                                      : 'border-amber-200 bg-amber-50 text-amber-800'
                                }`}
                              >
                                <span>{item.keyword}</span>
                                {isCore && (
                                  <span className="rounded bg-rose-100 px-1 text-[9px] font-semibold text-rose-700">
                                    核心
                                  </span>
                                )}
                                {isBonus && (
                                  <span className="rounded bg-slate-200/80 px-1 text-[9px] text-slate-600">
                                    加分
                                  </span>
                                )}
                                {item.source === 'manual' && (
                                  <span className="rounded bg-blue-100 px-1 text-[9px] text-blue-700">
                                    手动
                                  </span>
                                )}
                                <button
                                  type="button"
                                  aria-label={`删除关键词 ${item.keyword}`}
                                  onClick={() => handleRemoveJdKeyword(item.keyword)}
                                  className="ml-0.5 rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Human-in-the-loop Manual Keyword Add Bar */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/70">
                  <input
                    type="text"
                    aria-label="手动补充 JD 关键词"
                    value={manualKwInput}
                    onChange={(e) => setManualKwInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualJdKeyword();
                      }
                    }}
                    placeholder="漏提了？手动补充技能词（逗号分隔）..."
                    className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                  <select
                    aria-label="补充关键词权重级别"
                    value={manualKwTier}
                    onChange={(e) => setManualKwTier(e.target.value as JdKeywordTier)}
                    className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="core">核心</option>
                    <option value="standard">常规</option>
                    <option value="bonus">加分</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddManualJdKeyword}
                    disabled={!manualKwInput.trim()}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                    添加
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Local Rule Checks */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-xs text-slate-600 border-b border-slate-100 pb-2">
              <span className="font-mono tabular-nums text-red-700 font-medium">
                必改 {errCount}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono tabular-nums text-amber-700 font-medium">
                建议 {warnCount}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono tabular-nums text-slate-600">
                优化 {tipCount}
              </span>
            </div>

            {localChecks.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center space-y-1">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                <div className="text-xs font-semibold text-emerald-900">本地基础格式检查全部通过</div>
                <p className="text-[11px] text-emerald-700">
                  如需深度打磨表达与含金量，可切到「AI 深度体检」使用你自己的 AI 模型协作。
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {localChecks.map((item) => {
                  const hasEnhancements = Boolean(item.enhancements && item.enhancements.length > 0);
                  if (!hasEnhancements) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onJumpToModule(item.go)}
                        className="flex w-full items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        {item.lv === 'err' ? (
                          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                        ) : item.lv === 'warn' ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        ) : (
                          <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900">{item.msg}</div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.sub}</p>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                      </button>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      data-testid="audit-quant-card"
                      className={`rounded-xl border p-3 space-y-2.5 ${
                        item.lv === 'warn'
                          ? 'border-amber-200 bg-amber-50/30'
                          : 'border-blue-200/80 bg-blue-50/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {item.lv === 'warn' ? (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          ) : (
                            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900">{item.msg}</div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              {item.sub}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJumpToModule(item.go)}
                          className="shrink-0 inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 whitespace-nowrap"
                        >
                          去修改
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div
                        data-testid="audit-quant-enhancements"
                        className="space-y-2 pt-0.5"
                      >
                        {item.enhancements!.map((enh) => {
                          const targetExp = doc.data.experience.find((e) => e.id === enh.expId);
                          const currentBullet = targetExp?.bullets[enh.bulletIndex] || '';
                          const alreadyApplied =
                            currentBullet.trim() === enh.suggestedText.trim();

                          return (
                            <div
                              key={enh.id}
                              className="rounded-lg border border-slate-200/90 bg-white p-2.5 space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-800 truncate">
                                  {enh.location}
                                </span>
                                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.5 whitespace-nowrap">
                                  缺{enh.missingDimensions.join(' / ')}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 leading-relaxed">
                                <span className="font-medium text-slate-600">
                                  {alreadyApplied ? '当前内容：' : '原句：'}
                                </span>
                                {enh.original}
                              </div>

                              {alreadyApplied ? (
                                <div className="rounded-md border border-emerald-200/80 bg-emerald-50/50 px-2 py-1.5 text-[11px] leading-relaxed text-emerald-800">
                                  已套用到简历，点击下方「去填入真实数字」即可将 <span className="font-mono font-semibold">XX</span> 替换为真实数据。
                                </div>
                              ) : (
                                <>
                                  <div className="rounded-md border border-emerald-200/80 bg-emerald-50/45 px-2 py-1.5 text-[11px] leading-relaxed text-slate-800">
                                    <span className="font-semibold text-emerald-800">
                                      自动增强建议：
                                    </span>
                                    {enh.suggestedText}
                                  </div>

                                  <div className="text-[10.5px] text-slate-500 leading-relaxed">
                                    {enh.tip}
                                  </div>
                                </>
                              )}

                              <div className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(enh.suggestedText);
                                      onNotify('已复制量化增强建议');
                                    } catch {
                                      onNotify('复制失败，请手动选中复制');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                                >
                                  <ClipboardCopy className="h-3 w-3" />
                                  复制建议
                                </button>
                                {alreadyApplied ? (
                                  <button
                                    type="button"
                                    onClick={() => onJumpToModule(item.go)}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 whitespace-nowrap"
                                  >
                                    去填入真实数字
                                    <ArrowUpRight className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onMutate((draft) => {
                                        const exp = draft.data.experience.find(
                                          (e) => e.id === enh.expId
                                        );
                                        if (exp && typeof exp.bullets[enh.bulletIndex] === 'string') {
                                          exp.bullets[enh.bulletIndex] = enh.suggestedText;
                                        }
                                      }, true);
                                      onNotify(
                                        '已套用量化增强建议，请前往经历模块将 XX 替换为你的真实数字（支持 Ctrl+Z 撤销）'
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                                  >
                                    <Wand2 className="h-3 w-3" />
                                    一键套用建议
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Engine 2: Open-Source AI Deep Audit + Editable Built-in Prompt Workshop */}
      {subView === 'ai' && (
        <div className="space-y-4">
          <AiProviderSelector
            id="audit-ai-provider"
            providers={providers}
            selectedProvider={selectedProvider}
            onSelectProvider={onSelectProvider}
            customConfig={customConfig}
            onSaveCustomConfig={onSaveCustomConfig}
            onClearCustomConfig={onClearCustomConfig}
            onOpenSettings={onOpenSettings}
            onNotify={onNotify}
          />

          {/* Built-in + Custom Prompt Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">1. 选择行业审查视角 Prompt</span>
              <span className="text-[11px] text-slate-400">可随时编辑微调</span>
            </div>
            <div className="space-y-1.5">
              {allPresets.map((preset) => {
                const active = selectedPromptId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-900">{preset.name}</span>
                        <span className="text-[11px] text-slate-400">· {preset.tag}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {preset.summary}
                      </p>
                    </button>
                    {preset.isCustom && (
                      <button
                        type="button"
                        aria-label={`删除自定义 Prompt ${preset.name}`}
                        onClick={() => handleDeleteCustomPrompt(preset.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editable Prompt Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="audit-prompt-editor" className="text-xs font-semibold text-slate-900">
                2. 体检指令正文（支持自由改写）
              </label>
              <button
                type="button"
                onClick={() => setShowSaveInput((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                存为我的模板
              </button>
            </div>

            {showSaveInput && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <input
                  type="text"
                  value={savingPromptName}
                  onChange={(e) => setSavingPromptName(e.target.value)}
                  placeholder="输入模板名称，如：游戏策划严审"
                  className="flex-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomPrompt}
                  className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  保存
                </button>
              </div>
            )}

            <textarea
              id="audit-prompt-editor"
              rows={4}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Optional Target JD */}
          <div className="space-y-1.5">
            <label htmlFor="audit-jd-input" className="block text-xs font-semibold text-slate-900">
              3. 目标岗位 JD（选填，与离线扫描联动共享）
            </label>
            <textarea
              id="audit-jd-input"
              rows={3}
              value={targetJd}
              onChange={(e) => setTargetJd(e.target.value)}
              placeholder="粘贴你想投递的真实岗位 JD 要求..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Primary Open-Source Action Buttons */}
          <div className="flex items-center gap-2">
            {anyAiReady ? (
              <>
                <button
                  type="button"
                  onClick={handleRunAiAudit}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      AI 正在审查...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      开始 AI 深度体检
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyFullPrompt}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  复制 Prompt
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCopyFullPrompt}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
                1. 复制完整体检 Prompt（发给你的 DeepSeek / Kimi / Claude / Ollama）
              </button>
            )}
          </div>

          {/* External AI JSON Report Importer (Expanded by default in zero-config OSS mode) */}
          <div className="rounded-lg border border-blue-200/80 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowImportJson((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-800 hover:bg-blue-50/40"
            >
              <span className="inline-flex items-center gap-1.5">
                <FileJson2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                外部 AI 零配置协作 · 粘贴 JSON 渲染交互式体检卡片
              </span>
              {showImportJson ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
            </button>
            {showImportJson && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  无需配置任何 API 密钥：将上方复制的 Prompt 发给任意网页版或本地 AI，再把 AI 返回的 JSON 粘贴至下方，即可自动生成带「定位修改」按钮的诊断报告。
                </p>
                <textarea
                  rows={4}
                  aria-label="外部 AI 体检 JSON 内容"
                  value={externalAuditJson}
                  onChange={(e) => setExternalAuditJson(e.target.value)}
                  placeholder={'粘贴 ```json ... ``` 或完整体检 JSON 对象...'}
                  className="w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleImportExternalAudit}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  2. 导入并渲染体检诊断卡片
                </button>
                {externalAuditError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                    {externalAuditError}
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Structured AI Report */}
          {report && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900">AI 诊断结论</span>
                  <span className="font-medium text-blue-700">{report.readinessLevel}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">{report.overallVerdict}</p>
                {report.strengths?.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-700">真实核心亮点</div>
                    {report.strengths.map((s, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 leading-relaxed">
                        • {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {report.findings.map((f, idx) => {
                  const sevText =
                    f.severity === 'high' ? '高优先' : f.severity === 'medium' ? '中优先' : '微调';
                  const sevColor =
                    f.severity === 'high'
                      ? 'text-red-700'
                      : f.severity === 'medium'
                        ? 'text-amber-700'
                        : 'text-slate-500';
                  const modLabel =
                    f.module === 'layout' ? '外观排版' : FIXED_MODULE_LABELS[f.module] || f.module;

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`font-semibold ${sevColor}`}>{sevText}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-500">{modLabel}</span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-900 mt-0.5">{f.title}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJumpToModule(f.module === 'layout' ? 'design' : f.module)}
                          className="shrink-0 inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          定位修改
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="text-[11px] leading-relaxed text-slate-600">{f.issue}</p>
                      <p className="text-[11px] leading-relaxed text-slate-800">
                        <strong className="font-semibold">建议：</strong>
                        {f.suggestion}
                      </p>

                      {f.rewriteExample && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>可直接参考的改写示范</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(f.rewriteExample);
                                  onNotify('已复制改写示范');
                                } catch {
                                  onNotify('复制失败');
                                }
                              }}
                              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                            >
                              <ClipboardCopy className="h-3 w-3" />
                              复制
                            </button>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-800">
                            {f.rewriteExample}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
