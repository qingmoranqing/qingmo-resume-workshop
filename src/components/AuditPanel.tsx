import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BookmarkPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  FileJson2,
  Info,
  Loader2,
  ScanSearch,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { BUILTIN_AUDIT_PROMPTS, FIXED_MODULE_LABELS } from '../data/themes';
import type {
  AiAuditReport,
  AiConfigSaveResult,
  AiProviderId,
  AiProviderInfo,
  AuditPromptPreset,
  CustomAiConfig,
  LocalCheckItem,
  ResumeDoc,
} from '../types/resume';
import {
  analyzeJdMatchLocal,
  assembleAuditPrompt,
  buildAiRequestDefaults,
  formatPlainText,
  isCustomAiReady,
  nid,
  parseExternalAuditJson,
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

  // Pure offline local JD keyword gap scan (zero API needed)
  const localJdMatch = useMemo(() => analyzeJdMatchLocal(doc, targetJd), [doc, targetJd]);

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
          {/* Pure Offline JD Keyword Scanner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <ScanSearch className="h-3.5 w-3.5 text-blue-600" />
                离线 JD 关键词缺口扫描（免 API / 实时算分）
              </div>
              {localJdMatch.totalKeywords > 0 && (
                <span
                  className={`font-mono text-xs font-bold tabular-nums ${
                    localJdMatch.scorePct >= 70
                      ? 'text-emerald-700'
                      : localJdMatch.scorePct >= 40
                        ? 'text-amber-700'
                        : 'text-red-700'
                  }`}
                >
                  命中 {localJdMatch.scorePct}%
                </span>
              )}
            </div>
            <textarea
              aria-label="离线扫描目标岗位 JD"
              rows={3}
              value={targetJd}
              onChange={(e) => setTargetJd(e.target.value)}
              placeholder="粘贴招聘 JD 原文（如：熟悉西门子 S7-1500、EPLAN、PROFINET...），无需联网或 AI 立即标出简历已覆盖与缺失关键词..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
            />
            {localJdMatch.totalKeywords > 0 && (
              <div className="space-y-2 pt-0.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      localJdMatch.scorePct >= 70
                        ? 'bg-emerald-600'
                        : localJdMatch.scorePct >= 40
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${localJdMatch.scorePct}%` }}
                  />
                </div>
                {localJdMatch.matched.length > 0 && (
                  <div>
                    <div className="text-[10.5px] font-medium text-emerald-700 mb-1">
                      简历已命中（{localJdMatch.matched.length}）
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {localJdMatch.matched.map((kw) => (
                        <span
                          key={kw}
                          className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10.5px] text-emerald-800"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {localJdMatch.missing.length > 0 && (
                  <div>
                    <div className="text-[10.5px] font-medium text-amber-700 mb-1">
                      JD 提及但简历未出现（{localJdMatch.missing.length} · 如真实掌握建议补入技能或经历）
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {localJdMatch.missing.map((kw) => (
                        <span
                          key={kw}
                          className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10.5px] text-amber-800"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
