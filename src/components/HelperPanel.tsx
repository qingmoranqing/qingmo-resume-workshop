import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  FileJson2,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { TEMPLATE_OPTIONS, THEMES } from '../data/themes';
import type {
  AiConfigSaveResult,
  AiProviderId,
  AiProviderInfo,
  CustomAiConfig,
  ResumeDoc,
  TailorProposal,
} from '../types/resume';
import {
  buildAiRequestDefaults,
  buildTailorPromptForExternalAi,
  formatPlainText,
  getAllHelperMemos,
  isCustomAiReady,
  nid,
  parseExternalTailorJson,
} from '../utils/resumeLogic';
import { AiProviderSelector } from './AiProviderSelector';

interface HelperPanelProps {
  doc: ResumeDoc;
  providers: AiProviderInfo[];
  selectedProvider: AiProviderId;
  onSelectProvider: (provider: AiProviderId) => void;
  customConfig: CustomAiConfig;
  onSaveCustomConfig: (draft: CustomAiConfig) => AiConfigSaveResult;
  onClearCustomConfig: () => void;
  onOpenSettings: () => void;
  onMutate: (mutator: (draft: ResumeDoc) => void, recordHistory?: boolean) => void;
  onApplyTailorProposal: (proposal: TailorProposal, mode: 'new-version' | 'in-place') => void;
  onNotify: (msg: string) => void;
}

export function HelperPanel({
  doc,
  providers,
  selectedProvider,
  onSelectProvider,
  customConfig,
  onSaveCustomConfig,
  onClearCustomConfig,
  onOpenSettings,
  onMutate,
  onApplyTailorProposal,
  onNotify,
}: HelperPanelProps) {
  const { helper } = doc.data;
  const memos = getAllHelperMemos(doc.data);
  const anyAiReady = isCustomAiReady(customConfig) || providers.some((p) => p.configured);

  // AI Job Switching / JD Auto-Tailoring state
  const [targetRole, setTargetRole] = useState('');
  const [targetJd, setTargetJd] = useState('');
  const [intensity, setIntensity] = useState<'light' | 'deep'>('deep');
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<TailorProposal | null>(null);

  // External AI Bridge (expanded by default when no API is configured yet)
  const [showExternalBridge, setShowExternalBridge] = useState(!anyAiReady);
  const [externalJson, setExternalJson] = useState('');
  const [externalError, setExternalError] = useState<string | null>(null);

  useEffect(() => {
    if (anyAiReady) {
      setShowExternalBridge(false);
    }
  }, [anyAiReady]);

  // AI Helper Regeneration state
  const [helperLoading, setHelperLoading] = useState(false);
  const [helperError, setHelperError] = useState<string | null>(null);

  // Editable Helper local inputs
  const [newKeyword, setNewKeyword] = useState('');
  const [newRedFlag, setNewRedFlag] = useState('');
  const [newMemoTitle, setNewMemoTitle] = useState('');

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(`已复制${label}`);
    } catch {
      onNotify('复制失败，请手动选中复制');
    }
  };

  const handleCopyExternalTailorPrompt = async () => {
    const prompt = buildTailorPromptForExternalAi(
      doc,
      targetRole.trim(),
      targetJd.trim(),
      intensity,
    );
    await handleCopy(prompt, '换岗结构化 Prompt（可发给 DeepSeek / Kimi / Claude / Ollama）');
  };

  const handleParseExternalTailorJson = () => {
    if (!externalJson.trim()) {
      setExternalError('请先粘贴外部 AI 返回的 JSON 内容。');
      return;
    }
    try {
      const parsed = parseExternalTailorJson(externalJson);
      setExternalError(null);
      setTailorError(null);
      setProposal(parsed);
      setExternalJson('');
      onNotify('已解析外部 AI 换岗方案，请预览后决定新建或覆盖版本');
    } catch (err: unknown) {
      setExternalError(err instanceof Error ? err.message : 'JSON 格式无法解析，请确认复制完整。');
    }
  };

  const handleGenerateTailor = async () => {
    if (!targetRole.trim() && !targetJd.trim()) {
      setTailorError('请至少输入「新目标职位名称」或粘贴「目标岗位 JD」后再生成方案。');
      return;
    }
    setTailorLoading(true);
    setTailorError(null);
    setProposal(null);
    try {
      const res = await fetch('/api/ai/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildAiRequestDefaults(customConfig, selectedProvider),
          resumeJson: {
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
          },
          targetRole: targetRole.trim(),
          targetJd: targetJd.trim(),
          intensity,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTailorError(json.error || `请求失败 (${res.status})`);
        return;
      }
      setProposal(json.proposal as TailorProposal);
    } catch (err: unknown) {
      setTailorError(err instanceof Error ? `网络异常：${err.message}` : '网络请求失败');
    } finally {
      setTailorLoading(false);
    }
  };

  const handleRegenerateHelper = async () => {
    setHelperLoading(true);
    setHelperError(null);
    try {
      const res = await fetch('/api/ai/helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildAiRequestDefaults(customConfig, selectedProvider),
          resumeText: formatPlainText(doc),
          targetRole: targetRole.trim() || doc.data.intent.position || doc.name,
          targetJd: targetJd.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setHelperError(json.error || `请求失败 (${res.status})`);
        return;
      }
      const nextHelper = json.helper;
      onMutate((d) => {
        d.data.helper = {
          keywords: Array.isArray(nextHelper.keywords) ? nextHelper.keywords : [],
          greeting: typeof nextHelper.greeting === 'string' ? nextHelper.greeting : '',
          redFlags: Array.isArray(nextHelper.redFlags) ? nextHelper.redFlags : [],
          memos: Array.isArray(nextHelper.memos)
            ? nextHelper.memos.map((m: { title: string; items: string[] }) => ({
                id: nid('memo'),
                title: m.title,
                items: Array.isArray(m.items) ? m.items : [],
              }))
            : [],
        };
      }, true);
      onNotify('已按当前简历重新生成投递助手包');
    } catch (err: unknown) {
      setHelperError(err instanceof Error ? `网络异常：${err.message}` : '网络请求失败');
    } finally {
      setHelperLoading(false);
    }
  };

  const handleAddKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    onMutate((d) => {
      if (!d.data.helper.keywords.includes(kw)) {
        d.data.helper.keywords.push(kw);
      }
    }, true);
    setNewKeyword('');
  };

  const handleAddRedFlag = () => {
    const flag = newRedFlag.trim();
    if (!flag) return;
    onMutate((d) => {
      d.data.helper.redFlags.push(flag);
    }, true);
    setNewRedFlag('');
  };

  const handleAddMemoGroup = () => {
    const title = newMemoTitle.trim() || '新建面试准备清单';
    onMutate((d) => {
      d.data.helper.memos.push({
        id: nid('memo'),
        title,
        items: ['补充面试高频追问或案例准备要点'],
      });
    }, true);
    setNewMemoTitle('');
  };

  const tplName = (id: string) =>
    TEMPLATE_OPTIONS.find((t) => t.id === id)?.name || id;
  const themeName = (id: string) =>
    THEMES[id as keyof typeof THEMES]?.name || id;

  return (
    <div className="space-y-6">
      {/* SECTION 1: Open-Source AI Job Switching & JD Auto-Tailoring Engine */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">
            AI 智能换岗与 JD 定制改写（开源自带模型）
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            投递全新岗位时，基于你的真实经历自动重构定位、要点、技能排序与整套投递助手（绝不编造公司与日期）。
          </p>
        </div>

        <AiProviderSelector
          id="helper-ai-provider"
          providers={providers}
          selectedProvider={selectedProvider}
          onSelectProvider={onSelectProvider}
          customConfig={customConfig}
          onSaveCustomConfig={onSaveCustomConfig}
          onClearCustomConfig={onClearCustomConfig}
          onOpenSettings={onOpenSettings}
          onNotify={onNotify}
        />

        <div className="space-y-2">
          <div>
            <label htmlFor="tailor-role" className="block text-[11px] font-medium text-slate-700 mb-1">
              新目标职位名称
            </label>
            <input
              id="tailor-role"
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="例如：PLC 自动化调试 / 游戏系统策划 / B2B 销售 / 财务分析"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="tailor-jd" className="block text-[11px] font-medium text-slate-700 mb-1">
              目标岗位 JD 原文（强烈建议粘贴，匹配度更高）
            </label>
            <textarea
              id="tailor-jd"
              rows={3}
              value={targetJd}
              onChange={(e) => setTargetJd(e.target.value)}
              placeholder="粘贴招聘网站的岗位职责与任职要求..."
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-slate-600">重构强度</span>
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setIntensity('light')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  intensity === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                轻度微调
              </button>
              <button
                type="button"
                onClick={() => setIntensity('deep')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  intensity === 'deep'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                深度跨岗重塑
              </button>
            </div>
          </div>

          {anyAiReady && (
            <button
              type="button"
              onClick={handleGenerateTailor}
              disabled={tailorLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {tailorLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  正在通过你的 AI 生成换岗方案...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  一键生成换岗改写方案
                </>
              )}
            </button>
          )}

          {/* Universal Zero-Config External AI Bridge */}
          <div className="rounded-lg border border-blue-200/80 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExternalBridge((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-800 hover:bg-blue-50/40"
            >
              <span className="inline-flex items-center gap-1.5">
                <FileJson2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                外部 AI 零配置换岗协作（DeepSeek / Kimi / Claude / Ollama）
              </span>
              {showExternalBridge ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
            </button>

            {showExternalBridge && (
              <div className="border-t border-slate-100 p-3 space-y-2.5 bg-slate-50/50">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  无需填写任何 API Key：先复制结构化换岗 Prompt 发给你常用的大模型对话，再把对方返回的 JSON 粘贴回来，即可一键对比预览并生成新版本。
                </p>
                <button
                  type="button"
                  onClick={handleCopyExternalTailorPrompt}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  1. 复制换岗结构化 Prompt（含原简历 + JD）
                </button>
                <div className="space-y-1.5">
                  <label htmlFor="external-tailor-json" className="block text-[11px] font-medium text-slate-700">
                    2. 粘贴外部 AI 返回的 JSON
                  </label>
                  <textarea
                    id="external-tailor-json"
                    rows={4}
                    value={externalJson}
                    onChange={(e) => setExternalJson(e.target.value)}
                    placeholder={'粘贴 ```json ... ``` 或完整 JSON 对象...'}
                    className="w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleParseExternalTailorJson}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    解析 JSON 并预览换岗方案
                  </button>
                </div>
                {externalError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                    {externalError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {tailorError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 leading-relaxed">
            {tailorError}
          </div>
        )}

        {/* Proposal Diff Preview */}
        {proposal && (
          <div className="rounded-xl border border-blue-200 bg-white p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900">{proposal.versionName}</div>
                <div className="text-[11px] text-blue-700 mt-0.5">{proposal.fitAssessment}</div>
              </div>
              <button
                type="button"
                aria-label="放弃该改写方案"
                onClick={() => setProposal(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-600">{proposal.strategySummary}</p>

            <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
              <div>
                <span className="text-slate-400">新标语：</span>
                <span className="font-medium text-slate-900">{proposal.headline}</span>
              </div>
              <div>
                <span className="text-slate-400">新意向：</span>
                <span className="text-slate-800">{proposal.intent.position}</span>
              </div>
              <div>
                <span className="text-slate-400">推荐版式：</span>
                <span className="text-slate-800">
                  {tplName(proposal.recommendedTemplate)} · {themeName(proposal.recommendedTheme)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">重构范围：</span>
                <span className="text-slate-800">
                  {proposal.experienceUpdates.length} 段经历要点 · {proposal.skills.length} 组技能 · 全新配套投递包
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onApplyTailorProposal(proposal, 'new-version');
                  setProposal(null);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Layers className="h-3.5 w-3.5" />
                保存为新版本并立即切换（推荐）
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyTailorProposal(proposal, 'in-place');
                  setProposal(null);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Check className="h-3.5 w-3.5" />
                直接覆盖当前版本（支持 Ctrl+Z 撤销）
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: Fully Editable Delivery Helper */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">当前版本投递助手（全项可改）</h3>
            <p className="text-[11px] text-slate-500">跟随当前版本独立保存</p>
          </div>
          {anyAiReady && (
            <button
              type="button"
              onClick={handleRegenerateHelper}
              disabled={helperLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {helperLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              AI 重生成
            </button>
          )}
        </div>

        {helperError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 leading-relaxed">
            {helperError}
          </div>
        )}

        {/* 2.1 Editable Search Keywords */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-800">招聘平台搜索关键词</span>
            <span className="text-[11px] text-slate-400">点击词条复制</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {helper.keywords.map((kw, idx) => (
              <span
                key={`${kw}-${idx}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              >
                <button
                  type="button"
                  onClick={() => handleCopy(kw, `关键词「${kw}」`)}
                  className="hover:text-blue-600"
                >
                  {kw}
                </button>
                <button
                  type="button"
                  aria-label={`移除关键词 ${kw}`}
                  onClick={() =>
                    onMutate((d) => {
                      d.data.helper.keywords.splice(idx, 1);
                    }, true)
                  }
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="新增搜索关键词"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              placeholder="输入新关键词并回车添加..."
              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              添加
            </button>
          </div>
        </div>

        {/* 2.2 Editable BOSS Greeting */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <label htmlFor="helper-greeting" className="text-xs font-medium text-slate-800">
              BOSS 直聘首句打招呼语
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {helper.greeting.length} 字
              </span>
              <button
                type="button"
                onClick={() => handleCopy(helper.greeting, '打招呼语')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <ClipboardCopy className="h-3 w-3" />
                复制
              </button>
            </div>
          </div>
          <textarea
            id="helper-greeting"
            rows={4}
            value={helper.greeting}
            onChange={(e) =>
              onMutate((d) => {
                d.data.helper.greeting = e.target.value;
              }, false)
            }
            placeholder="写一段 100-140 字真诚、贴合岗位的首句开场白..."
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* 2.3 Editable JD Red Flags */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <span className="block text-xs font-medium text-slate-800">JD 避坑与筛岗核查点</span>
          <div className="space-y-1.5">
            {helper.redFlags.map((flag, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <textarea
                  rows={2}
                  aria-label={`避坑提示 ${idx + 1}`}
                  value={flag}
                  onChange={(e) =>
                    onMutate((d) => {
                      d.data.helper.redFlags[idx] = e.target.value;
                    }, false)
                  }
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed text-slate-700 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`删除避坑提示 ${idx + 1}`}
                  onClick={() =>
                    onMutate((d) => {
                      d.data.helper.redFlags.splice(idx, 1);
                    }, true)
                  }
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="新增 JD 避坑提示"
              value={newRedFlag}
              onChange={(e) => setNewRedFlag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRedFlag();
                }
              }}
              placeholder="新增一条筛岗避坑提醒..."
              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddRedFlag}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              添加
            </button>
          </div>
        </div>

        {/* 2.4 Editable Interview Memos */}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <span className="block text-xs font-medium text-slate-800">面试准备与话术备忘</span>
          {memos.map((memo) => (
            <div key={memo.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                {memo.source === 'helper' ? (
                  <input
                    type="text"
                    value={memo.title}
                    onChange={(e) =>
                      onMutate((d) => {
                        const target = d.data.helper.memos.find((m) => m.id === memo.id);
                        if (target) target.title = e.target.value;
                      }, false)
                    }
                    className="flex-1 rounded border border-transparent px-1 py-0.5 text-xs font-semibold text-slate-900 hover:border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-900">{memo.title}</span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`复制备忘 ${memo.title}`}
                    onClick={() => handleCopy(`${memo.title}\n${memo.items.map((x) => `- ${x}`).join('\n')}`, '面试备忘')}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  </button>
                  {memo.source === 'helper' && (
                    <button
                      type="button"
                      aria-label={`删除备忘 ${memo.title}`}
                      onClick={() =>
                        onMutate((d) => {
                          d.data.helper.memos = d.data.helper.memos.filter((m) => m.id !== memo.id);
                        }, true)
                      }
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {memo.items.map((line, lIdx) => (
                  <div key={lIdx} className="flex items-start gap-1.5">
                    {memo.source === 'helper' ? (
                      <>
                        <input
                          type="text"
                          value={line}
                          onChange={(e) =>
                            onMutate((d) => {
                              const target = d.data.helper.memos.find((m) => m.id === memo.id);
                              if (target) target.items[lIdx] = e.target.value;
                            }, false)
                          }
                          className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label="删除备忘项"
                          onClick={() =>
                            onMutate((d) => {
                              const target = d.data.helper.memos.find((m) => m.id === memo.id);
                              if (target) target.items.splice(lIdx, 1);
                            }, true)
                          }
                          className="rounded p-1 text-slate-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-slate-600">• {line}</div>
                    )}
                  </div>
                ))}
                {memo.source === 'helper' && (
                  <button
                    type="button"
                    onClick={() =>
                      onMutate((d) => {
                        const target = d.data.helper.memos.find((m) => m.id === memo.id);
                        if (target) target.items.push('');
                      }, true)
                    }
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3 w-3" />
                    新增要点
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="新面试备忘标题"
              value={newMemoTitle}
              onChange={(e) => setNewMemoTitle(e.target.value)}
              placeholder="输入新备忘分组标题..."
              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddMemoGroup}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              新建分组
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
