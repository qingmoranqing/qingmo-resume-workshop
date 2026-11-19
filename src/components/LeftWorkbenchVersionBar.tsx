import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GitBranchPlus,
  GitCompareArrows,
  Languages,
  Layers,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AiProviderId,
  CustomAiConfig,
  ResumeDoc,
  TranslatedResumePayload,
} from '../types/resume';
import {
  buildTranslateResumePrompt,
  extractResumeKeyContent,
  findBilingualPair,
  parseExternalTranslateResumeJson,
} from '../utils/bilingual';
import { buildAiRequestDefaults, extractResumePositionLabel } from '../utils/resumeLogic';

interface LeftWorkbenchVersionBarProps {
  resumes: ResumeDoc[];
  activeDoc: ResumeDoc;
  selectedProvider: AiProviderId;
  customConfig: CustomAiConfig;
  onSelectResume: (id: string) => void;
  onDeriveVersion: (sourceDoc: ResumeDoc, targetRole?: string) => void;
  onCompareVersions: (baseId: string, targetId: string) => void;
  onApplyEnglishTranslation: (
    sourceZhDoc: ResumeDoc,
    translated: TranslatedResumePayload,
    modelUsed?: string,
  ) => void;
  onOpenSettings: () => void;
  onNotify: (msg: string) => void;
}

export function LeftWorkbenchVersionBar({
  resumes,
  activeDoc,
  selectedProvider,
  customConfig,
  onSelectResume,
  onDeriveVersion,
  onCompareVersions,
  onApplyEnglishTranslation,
  onOpenSettings,
  onNotify,
}: LeftWorkbenchVersionBarProps) {
  const [listOpen, setListOpen] = useState(false);
  const [deriveSourceId, setDeriveSourceId] = useState<string | null>(null);
  const [targetRoleInput, setTargetRoleInput] = useState('');

  // Bilingual translation panel state
  const [bilingualPanelOpen, setBilingualPanelOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteJson, setPasteJson] = useState('');
  const [showGlossary, setShowGlossary] = useState(true);

  const deriveSourceDoc =
    (deriveSourceId ? resumes.find((r) => r.id === deriveSourceId) : null) || activeDoc;
  const activePosition = extractResumePositionLabel(activeDoc);
  const parentExists = Boolean(
    activeDoc.lineage?.parentId && resumes.some((r) => r.id === activeDoc.lineage?.parentId),
  );

  const isEnDoc = activeDoc.bilingual?.lang === 'en';
  const bilingualPair = useMemo(
    () => findBilingualPair(resumes, activeDoc),
    [resumes, activeDoc],
  );
  const sourceZhDoc = isEnDoc ? bilingualPair.sibling || activeDoc : activeDoc;
  const keyScan = useMemo(() => extractResumeKeyContent(sourceZhDoc), [sourceZhDoc]);

  const openDeriveFor = (sourceDoc: ResumeDoc) => {
    setDeriveSourceId(sourceDoc.id);
    setTargetRoleInput('');
    setListOpen(false);
    setBilingualPanelOpen(false);
  };

  const handleConfirmDerive = () => {
    onDeriveVersion(deriveSourceDoc, targetRoleInput.trim() || undefined);
    setDeriveSourceId(null);
    setTargetRoleInput('');
    setListOpen(false);
  };

  const runAiTranslateToEnglish = async (zhTargetDoc: ResumeDoc) => {
    const scan = extractResumeKeyContent(zhTargetDoc);
    setListOpen(false);
    setDeriveSourceId(null);
    setBilingualPanelOpen(true);
    setShowPasteBox(false);

    if (!scan.summary.hasContent) {
      const msg = '当前简历关键内容为空，请先填写求职意向、工作经历或技能后再执行英文专业翻译。';
      setTranslateError(msg);
      onNotify(msg);
      return;
    }

    setTranslating(true);
    setTranslateError(null);
    try {
      const resp = await fetch('/api/ai/translate-en', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyContent: scan.payload,
          industryHint: extractResumePositionLabel(zhTargetDoc),
          ...buildAiRequestDefaults(customConfig, selectedProvider),
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg =
          typeof json.error === 'string' && json.error.trim()
            ? json.error.trim()
            : `AI 英文专业翻译失败 (HTTP ${resp.status})`;
        setTranslateError(msg);
        onNotify(msg);
        return;
      }

      const translated = (json?.translated || json) as TranslatedResumePayload;
      if (!translated || typeof translated !== 'object') {
        const msg = 'AI 返回结果格式异常，请重试或使用下方外部 AI 零配置导入。';
        setTranslateError(msg);
        onNotify(msg);
        return;
      }

      onApplyEnglishTranslation(
        zhTargetDoc,
        translated,
        typeof json?.meta?.model === 'string' ? json.meta.model : undefined,
      );
      setBilingualPanelOpen(false);
      setTranslateError(null);
      setShowGlossary(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? `中英翻译请求异常：${err.message}`
          : '中英翻译网络请求失败，请检查网络连接或 AI 接口配置。';
      setTranslateError(msg);
      onNotify(msg);
    } finally {
      setTranslating(false);
    }
  };

  const handleClickBilingualToggle = () => {
    setListOpen(false);
    setDeriveSourceId(null);

    // 1. Currently on English version -> instant switch back to preserved Chinese original
    if (isEnDoc) {
      if (bilingualPair.sibling) {
        onSelectResume(bilingualPair.sibling.id);
        setBilingualPanelOpen(false);
        onNotify(`已切回中文原版「${bilingualPair.sibling.name}」`);
      } else {
        onNotify('未找到关联的原中文版（可能已被删除），可从版本列表切换');
      }
      return;
    }

    // 2. Currently on Chinese version & paired English version already exists -> instant switch to English
    if (bilingualPair.sibling) {
      onSelectResume(bilingualPair.sibling.id);
      setBilingualPanelOpen(false);
      onNotify(`已切换到英文专业版「${bilingualPair.sibling.name}」（原中文版完整保留）`);
      return;
    }

    // 3. First-time translation from Chinese -> auto-detect key content & invoke AI immediately
    runAiTranslateToEnglish(activeDoc);
  };

  const handleCopyTranslatePrompt = async () => {
    const prompt = buildTranslateResumePrompt(sourceZhDoc);
    try {
      await navigator.clipboard.writeText(prompt);
      onNotify('已复制中译英专业 Prompt，发给外部 AI 后将返回的 JSON 粘回即可生成英文版');
    } catch {
      onNotify('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const handleImportExternalEnJson = () => {
    try {
      const parsed = parseExternalTranslateResumeJson(pasteJson);
      onApplyEnglishTranslation(sourceZhDoc, parsed, '外部 AI 导入');
      setPasteJson('');
      setShowPasteBox(false);
      setTranslateError(null);
      setBilingualPanelOpen(false);
      setShowGlossary(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '英文简历 JSON 解析失败';
      setTranslateError(msg);
      onNotify(msg);
    }
  };

  return (
    <div
      data-testid="left-version-bar"
      className="border-b border-slate-200 bg-slate-50/80 px-3.5 py-2.5 space-y-2"
    >
      {/* Top Row: Version Switcher + Bilingual Switch + Clone & Derive */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setListOpen((v) => !v);
            setDeriveSourceId(null);
          }}
          aria-expanded={listOpen}
          aria-label="展开或收起简历版本切换列表"
          className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:border-slate-300 transition-colors"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate text-xs font-semibold text-slate-800">{activeDoc.name}</span>
            <span className="shrink-0 font-mono text-[10.5px] text-slate-400">
              ({resumes.length}版)
            </span>
          </div>
          {listOpen ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
        </button>

        <button
          type="button"
          disabled={translating}
          onClick={handleClickBilingualToggle}
          aria-label="中英双语切换"
          title={
            isEnDoc
              ? '一键切回已保留的原中文版简历'
              : bilingualPair.sibling
                ? '一键切换到已生成的英文专业版简历'
                : '自动识别关键内容并调用 AI 润色翻译为地道英文版（完整保留原中文版）'
          }
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors disabled:opacity-60 ${
            isEnDoc
              ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              : bilingualPanelOpen
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                : 'border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/80'
          }`}
        >
          {translating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Languages className="h-3.5 w-3.5" />
          )}
          <span>{isEnDoc ? '切回中文' : '中英切换'}</span>
        </button>

        <button
          type="button"
          onClick={() =>
            deriveSourceId ? setDeriveSourceId(null) : openDeriveFor(activeDoc)
          }
          aria-expanded={Boolean(deriveSourceId)}
          aria-label="版本克隆并衍生"
          title="将当前简历克隆生成一份「针对性优化版」，并自动标记原版本关联职位"
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
            deriveSourceId
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100/80'
          }`}
        >
          <GitBranchPlus className="h-3.5 w-3.5" />
          <span>衍生</span>
        </button>
      </div>

      {/* Bilingual Active Strip (when viewing English version OR when Chinese doc has paired English sibling) */}
      {(isEnDoc || bilingualPair.sibling) && (
        <div
          data-testid="bilingual-status-strip"
          className="rounded-lg border border-indigo-200/85 bg-indigo-50/55 px-2.5 py-2 space-y-1.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide shrink-0 ${
                  isEnDoc
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-indigo-200 text-indigo-700'
                }`}
              >
                {isEnDoc ? 'EN 英文专业版' : '中文原版'}
              </span>
              <span className="truncate text-slate-600">
                {isEnDoc
                  ? `已保留中文原版${activeDoc.bilingual?.modelUsed ? ` · ${activeDoc.bilingual.modelUsed}` : ''}`
                  : '已关联英文专业版'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {bilingualPair.sibling && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectResume(bilingualPair.sibling!.id);
                    onNotify(
                      isEnDoc
                        ? `已切回中文原版「${bilingualPair.sibling!.name}」`
                        : `已切换到英文专业版「${bilingualPair.sibling!.name}」`,
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-700 hover:bg-indigo-50 whitespace-nowrap"
                >
                  <ArrowLeftRight className="h-2.5 w-2.5" />
                  {isEnDoc ? '切回中文' : '看英文版'}
                </button>
              )}
              <button
                type="button"
                disabled={translating}
                onClick={() => runAiTranslateToEnglish(sourceZhDoc)}
                title="基于最新中文内容重新调用 AI 进行英文术语润色翻译"
                className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${translating ? 'animate-spin' : ''}`} />
                同步重译
              </button>
              {bilingualPair.sibling && (
                <button
                  type="button"
                  onClick={() =>
                    onCompareVersions(
                      isEnDoc ? bilingualPair.sibling!.id : activeDoc.id,
                      isEnDoc ? activeDoc.id : bilingualPair.sibling!.id,
                    )
                  }
                  title="对比中文原版与英文专业版"
                  className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700 whitespace-nowrap"
                >
                  对比
                </button>
              )}
            </div>
          </div>

          {/* Terminology Polish Highlights (shown on English version when glossaryNotes exist) */}
          {isEnDoc &&
            activeDoc.bilingual?.glossaryNotes &&
            activeDoc.bilingual.glossaryNotes.length > 0 && (
              <div className="border-t border-indigo-200/60 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowGlossary((v) => !v)}
                  className="flex w-full items-center justify-between text-[10.5px] font-medium text-indigo-800 hover:text-indigo-950"
                >
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-600" />
                    英文专业术语润色对照（{activeDoc.bilingual.glossaryNotes.length} 项）
                  </span>
                  {showGlossary ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                {showGlossary && (
                  <ul
                    data-testid="bilingual-glossary-notes"
                    className="mt-1 space-y-0.5 text-[10.5px] leading-snug text-slate-700"
                  >
                    {activeDoc.bilingual.glossaryNotes.map((note, idx) => (
                      <li key={idx} className="truncate" title={note}>
                        • {note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
        </div>
      )}

      {/* Inline Bilingual Translation Progress / Key Content Scan / Fallback Panel */}
      {bilingualPanelOpen && (
        <div
          data-testid="bilingual-translate-panel"
          className="rounded-xl border border-indigo-200 bg-white p-3 shadow-xs space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <Languages className="h-3.5 w-3.5 text-indigo-600" />
              中英双语专业翻译（保留原中文版）
            </div>
            <button
              type="button"
              aria-label="关闭双语翻译面板"
              onClick={() => setBilingualPanelOpen(false)}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Auto-detected Key Content Summary */}
          <div
            data-testid="bilingual-key-scan"
            className="rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-2 space-y-1 text-[11px]"
          >
            <div className="font-medium text-slate-700">
              已自动识别关键内容：{keyScan.summary.expCount} 段经历（{keyScan.summary.bulletCount} 条要点）·{' '}
              {keyScan.summary.skillGroupCount} 组技能 · {keyScan.summary.eduCount} 段教育
              {keyScan.summary.customCount > 0 ? ` · ${keyScan.summary.customCount} 个扩展模块` : ''}
            </div>
            {keyScan.summary.keyTerms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400">核心术语：</span>
                {keyScan.summary.keyTerms.map((term) => (
                  <span
                    key={term}
                    className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700"
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>

          {translating && (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-50/70 px-2.5 py-2 text-xs text-indigo-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-indigo-600" />
              <span>正在调用 AI 进行地道英文术语润色与翻译，原中文版将完整保留...</span>
            </div>
          )}

          {!translating && translateError && (
            <div className="space-y-2">
              <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-700 break-words">
                  {translateError}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  <Settings className="h-3 w-3" />
                  去配置 AI 接口
                </button>
                <button
                  type="button"
                  onClick={handleCopyTranslatePrompt}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Copy className="h-3 w-3" />
                  复制中译英 Prompt
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteBox((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 whitespace-nowrap"
                >
                  {showPasteBox ? '收起 JSON 导入' : '粘贴外部英文 JSON'}
                </button>
              </div>

              {showPasteBox && (
                <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                  <textarea
                    rows={3}
                    value={pasteJson}
                    onChange={(e) => setPasteJson(e.target.value)}
                    placeholder='将外部 AI 返回的英文简历 JSON（{"basic":...,"experience":[...]}）粘贴于此'
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] leading-relaxed text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!pasteJson.trim()}
                      onClick={handleImportExternalEnJson}
                      className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-45"
                    >
                      导入并生成英文专业版
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Version Position / Lineage Tag Strip */}
      {activeDoc.lineage ? (
        <div
          data-testid="active-version-lineage"
          className="flex items-center justify-between gap-2 rounded-lg border border-blue-200/80 bg-blue-50/50 px-2.5 py-1.5 text-[11px]"
        >
          <div className="min-w-0 text-slate-700 truncate">
            <span className="font-semibold text-blue-700">优化版</span>
            <span className="mx-1 text-slate-300">·</span>
            <span
              title={`原版本「${activeDoc.lineage.parentName}」关联职位：${activeDoc.lineage.parentPosition}`}
            >
              原版职位：{activeDoc.lineage.parentPosition}
            </span>
          </div>
          {parentExists && (
            <button
              type="button"
              onClick={() => onCompareVersions(activeDoc.lineage!.parentId, activeDoc.id)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-blue-700 hover:bg-blue-50 whitespace-nowrap"
            >
              <GitCompareArrows className="h-3 w-3" />
              对比原版
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-0.5 text-[10.5px] text-slate-500">
          <Briefcase className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">当前关联职位：{activePosition}</span>
        </div>
      )}

      {/* Inline Clone & Derive Drawer */}
      {deriveSourceId && (
        <div
          data-testid="version-derive-form"
          className="rounded-xl border border-blue-200 bg-white p-3 shadow-xs space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <GitBranchPlus className="h-3.5 w-3.5 text-blue-600" />
              版本克隆并衍生 · 生成针对性优化版
            </div>
            <button
              type="button"
              aria-label="关闭克隆衍生面板"
              onClick={() => setDeriveSourceId(null)}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 text-[11px] text-slate-600 space-y-0.5">
            <div className="truncate">
              来源版本：<strong className="font-medium text-slate-800">{deriveSourceDoc.name}</strong>
            </div>
            <div className="truncate">
              自动标记原关联职位：
              <strong className="font-medium text-blue-700">
                {extractResumePositionLabel(deriveSourceDoc)}
              </strong>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="derive-target-role-input"
              className="block text-[11px] font-medium text-slate-700"
            >
              本次投递的目标公司 / 岗位（选填，留空则直接生成优化版）
            </label>
            <input
              id="derive-target-role-input"
              type="text"
              value={targetRoleInput}
              onChange={(e) => setTargetRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmDerive();
                }
              }}
              placeholder="例如：字节跳动 · 商业分析 / 腾讯 · 增长数据"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeriveSourceId(null)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmDerive}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
            >
              <GitBranchPlus className="h-3 w-3" />
              生成针对性优化版
            </button>
          </div>
        </div>
      )}

      {/* Expandable Resume Version Switcher List */}
      {listOpen && (
        <div
          data-testid="left-version-list"
          className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 studio-scroll">
            {resumes.map((r) => {
              const isCurrent = r.id === activeDoc.id;
              const posLabel = extractResumePositionLabel(r);
              const canCompareParent = Boolean(
                r.lineage?.parentId && resumes.some((p) => p.id === r.lineage?.parentId),
              );

              return (
                <div
                  key={r.id}
                  className={`px-3 py-2.5 transition-colors ${
                    isCurrent ? 'bg-blue-50/45' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectResume(r.id);
                        setListOpen(false);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                        <span
                          className={`truncate text-xs font-semibold ${
                            isCurrent ? 'text-blue-900' : 'text-slate-800'
                          }`}
                        >
                          {r.name}
                        </span>
                        {r.bilingual?.lang === 'en' && (
                          <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-700">
                            EN
                          </span>
                        )}
                        {r.lineage && (
                          <span className="shrink-0 rounded bg-blue-100/80 px-1.5 py-0.5 text-[9.5px] font-semibold text-blue-700">
                            优化版
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] text-slate-500">
                        关联职位：{posLabel}
                      </div>
                      {r.lineage && (
                        <div className="mt-0.5 truncate text-[10.5px] text-blue-700/85">
                          衍生自「{r.lineage.parentName}」· 原职位：{r.lineage.parentPosition}
                        </div>
                      )}
                      {r.bilingual?.lang === 'en' && r.bilingual.pairedName && (
                        <div className="mt-0.5 truncate text-[10.5px] text-indigo-700/85">
                          英文专业版 · 保留原中文版「{r.bilingual.pairedName}」
                        </div>
                      )}
                    </button>

                    <div className="flex shrink-0 items-center gap-1 pt-0.5">
                      {canCompareParent && (
                        <button
                          type="button"
                          onClick={() => {
                            setListOpen(false);
                            onCompareVersions(r.lineage!.parentId, r.id);
                          }}
                          title="与原版本高亮对比差异"
                          className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10.5px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700 whitespace-nowrap"
                        >
                          对比
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`克隆并衍生 ${r.name}`}
                        onClick={() => openDeriveFor(r)}
                        title="基于此版本生成针对性优化版"
                        className="inline-flex items-center gap-0.5 rounded-md border border-blue-200 bg-blue-50/70 px-1.5 py-1 text-[10.5px] font-medium text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                      >
                        <GitBranchPlus className="h-3 w-3" />
                        衍生
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-[10.5px] text-slate-500">
              多投不同岗位时，推荐克隆衍生或生成中英双语版
            </span>
            <button
              type="button"
              onClick={() => openDeriveFor(activeDoc)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              <GitBranchPlus className="h-3 w-3" />
              衍生当前版
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
