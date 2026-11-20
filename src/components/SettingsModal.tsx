import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AiConfigSaveResult,
  AiConfigValidationErrors,
  AiProviderInfo,
  CustomAiConfig,
  CustomAiProtocol,
} from '../types/resume';
import {
  buildAiEndpointPreview,
  classifyAiNetworkError,
  isCustomAiReady,
  isLocalEndpointUrl,
  summarizeAiConfigErrors,
  validateCustomAiConfig,
} from '../utils/resumeLogic';

interface SettingsModalProps {
  open: boolean;
  providers: AiProviderInfo[];
  customConfig: CustomAiConfig;
  resumeCount: number;
  onClose: () => void;
  onSaveCustomConfig: (draft: CustomAiConfig) => AiConfigSaveResult;
  onClearCustomConfig: () => void;
  onExportBackup: () => void;
  onOpenGuide: () => void;
  onNotify: (msg: string) => void;
}

type SettingsTab = 'ai' | 'storage';

const AI_PRESETS: Array<{
  label: string;
  tag: string;
  protocol: CustomAiProtocol;
  baseUrl: string;
  model: string;
}> = [
  {
    label: 'DeepSeek 官方',
    tag: '性价比',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    label: 'DeepSeek R1',
    tag: '推理',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-reasoner',
  },
  {
    label: 'Kimi (Moonshot)',
    tag: '长文本',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  {
    label: '硅基流动',
    tag: '多模型',
    protocol: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-72B-Instruct',
  },
  {
    label: 'OpenRouter',
    tag: '聚合',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-sonnet-4',
  },
  {
    label: 'OpenAI / 中转站',
    tag: '通用',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  {
    label: 'Anthropic Claude',
    tag: '官方/中转',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
  },
  {
    label: '本地 Ollama',
    tag: '离线免 Key',
    protocol: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:14b',
  },
];

export function SettingsModal({
  open,
  providers,
  customConfig,
  resumeCount,
  onClose,
  onSaveCustomConfig,
  onClearCustomConfig,
  onExportBackup,
  onOpenGuide,
  onNotify,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [draft, setDraft] = useState<CustomAiConfig>(customConfig);
  const [showKey, setShowKey] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AiConfigValidationErrors>({});
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  const prevOpenRef = useRef(false);

  // Reset transient feedback only when modal opens; keep draft synced with external config updates
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setDraft(customConfig);
      setFieldErrors({});
      setProbeResult(null);
      setModelSearch('');
    } else if (open) {
      setDraft(customConfig);
    }
    prevOpenRef.current = open;
  }, [open, customConfig]);

  const activeCustomReady = isCustomAiReady(customConfig);
  const configuredEnvProviders = providers.filter((p) => p.configured);
  const draftIsLocal = isLocalEndpointUrl(draft.baseUrl);
  const endpointPreview = useMemo(
    () => buildAiEndpointPreview(draft.protocol, draft.baseUrl),
    [draft.protocol, draft.baseUrl],
  );

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return draft.fetchedModels;
    return draft.fetchedModels.filter((m) => m.toLowerCase().includes(q));
  }, [draft.fetchedModels, modelSearch]);

  const hasUnsavedChanges =
    draft.protocol !== customConfig.protocol ||
    draft.baseUrl.trim().replace(/\/+$/, '') !== customConfig.baseUrl.trim().replace(/\/+$/, '') ||
    draft.apiKey.trim() !== customConfig.apiKey.trim() ||
    draft.model.trim() !== customConfig.model.trim() ||
    draft.enabled !== customConfig.enabled;

  const storageUsageKb = useMemo(() => {
    if (!open || typeof window === 'undefined') return 0;
    try {
      let bytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const v = localStorage.getItem(k) || '';
        bytes += (k.length + v.length) * 2;
      }
      return Math.max(1, Math.round(bytes / 1024));
    } catch {
      return 0;
    }
  }, [open, resumeCount, customConfig]);

  if (!open) return null;

  const updateDraft = (patch: Partial<CustomAiConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      if ('baseUrl' in patch) delete next.baseUrl;
      if ('apiKey' in patch) delete next.apiKey;
      if ('model' in patch) delete next.model;
      return next;
    });
  };

  const focusFirstErrorField = (errors: AiConfigValidationErrors) => {
    const targetId = errors.baseUrl
      ? 'settings-ai-base-url'
      : errors.apiKey
        ? 'settings-ai-api-key'
        : errors.model
          ? 'settings-ai-model'
          : null;
    if (targetId && typeof document !== 'undefined') {
      document.getElementById(targetId)?.focus();
    }
  };

  const handleTestAndFetchModels = async () => {
    const preCheck = validateCustomAiConfig({
      ...draft,
      model: draft.model.trim() || '__probe__',
    });
    if (preCheck.errors.baseUrl || preCheck.errors.apiKey) {
      const probeErrors: AiConfigValidationErrors = {
        baseUrl: preCheck.errors.baseUrl,
        apiKey: preCheck.errors.apiKey,
      };
      setFieldErrors(probeErrors);
      setProbeResult({
        type: 'err',
        text: summarizeAiConfigErrors(probeErrors),
      });
      focusFirstErrorField(probeErrors);
      return;
    }

    setProbeLoading(true);
    setProbeResult(null);
    setFieldErrors({});
    try {
      const resp = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: preCheck.normalized.protocol,
          baseUrl: preCheck.normalized.baseUrl,
          apiKey: preCheck.normalized.apiKey,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const reason =
          typeof json.error === 'string' && json.error.trim()
            ? json.error.trim()
            : classifyAiNetworkError(`HTTP ${resp.status}`, resp.status);
        setProbeResult({
          type: 'err',
          text: reason,
        });
        return;
      }

      const models = Array.isArray(json.models) ? (json.models as string[]) : [];
      const verifiedAt = new Date().toISOString();
      const nextModel = draft.model.trim() || models[0] || '';
      const nextDraft: CustomAiConfig = {
        ...draft,
        baseUrl: preCheck.normalized.baseUrl,
        apiKey: preCheck.normalized.apiKey,
        model: nextModel,
        fetchedModels: models,
        lastVerifiedAt: verifiedAt,
      };
      setDraft(nextDraft);

      if (models.length > 0) {
        setProbeResult({
          type: 'ok',
          text:
            json.note ||
            `接口连通性验证通过！已拉取 ${models.length} 个可用模型，点击下方「验证并保存为默认」即可立即生效。`,
        });
        onNotify(`连通测试通过，已拉取 ${models.length} 个模型`);
      } else {
        setProbeResult({
          type: 'ok',
          text: '接口鉴权与连通正常，但未返回模型目录，请手动填写自定义 Model ID 后保存。',
        });
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      setProbeResult({
        type: 'err',
        text: classifyAiNetworkError(rawMsg),
      });
    } finally {
      setProbeLoading(false);
    }
  };

  const handleSave = () => {
    const result = onSaveCustomConfig({
      ...draft,
      enabled: true,
    });
    if (!result.ok) {
      setFieldErrors(result.validation.errors);
      const summary = summarizeAiConfigErrors(result.validation.errors);
      setProbeResult({
        type: 'err',
        text: `${summary}（未通过校验的配置不会覆盖现有默认设置）`,
      });
      focusFirstErrorField(result.validation.errors);
      return;
    }
    setFieldErrors({});
    setDraft(result.validation.normalized);
    setProbeResult({
      type: 'ok',
      text: `配置校验通过并已保存到本机浏览器！当前默认模型已动态切换为 ${result.validation.normalized.model}，无需重启应用。`,
    });
  };

  const handleQuickSwitchSavedModel = (modelId: string) => {
    const nextDraft: CustomAiConfig = {
      ...draft,
      model: modelId,
      enabled: true,
    };
    setDraft(nextDraft);
    const result = onSaveCustomConfig(nextDraft);
    if (result.ok) {
      setFieldErrors({});
      setProbeResult({
        type: 'ok',
        text: `已热切换默认模型为 ${modelId}，后续所有 AI 请求将立即使用该模型。`,
      });
    } else {
      setFieldErrors(result.validation.errors);
      setProbeResult({
        type: 'err',
        text: summarizeAiConfigErrors(result.validation.errors),
      });
      focusFirstErrorField(result.validation.errors);
    }
  };

  const handleClear = () => {
    onClearCustomConfig();
    setFieldErrors({});
    setProbeResult(null);
    setModelSearch('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Settings className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="settings-modal-title" className="text-sm font-bold text-slate-900">
                应用设置 · AI 接口配置
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                自定义 Base URL / API Key / Model ID，校验通过后存入本地并动态切换，无需重启应用
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭设置面板"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Left Settings Nav */}
          <nav
            aria-label="设置分类"
            className="flex sm:w-44 shrink-0 gap-1 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50/80 p-2 sm:flex-col"
          >
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'ai'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>AI 接口配置</span>
              {activeCustomReady && (
                <span
                  aria-label="已启用自定义 AI"
                  className="ml-auto h-2 w-2 rounded-full bg-emerald-500 shrink-0"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('storage')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'storage'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>本地数据与隐私</span>
            </button>
          </nav>

          {/* Right Settings Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 studio-scroll space-y-4">
            {activeTab === 'ai' ? (
              <>
                {/* Current Active Runtime Status Card */}
                <div
                  data-testid="settings-ai-status"
                  className={`rounded-xl border p-3 ${
                    activeCustomReady
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : configuredEnvProviders.length > 0
                        ? 'border-blue-200 bg-blue-50/60'
                        : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        {activeCustomReady ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>当前生效默认接口：自定义 BYOK（已通过校验）</span>
                          </>
                        ) : configuredEnvProviders.length > 0 ? (
                          <>
                            <Server className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>当前生效默认接口：服务端 .env 托管配置</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                            <span>尚未启用直连 AI 接口（当前仅使用离线扫描与外部 AI 复制模式）</span>
                          </>
                        )}
                      </div>

                      {activeCustomReady ? (
                        <div className="mt-1 space-y-0.5 text-[11px] text-emerald-900/85 font-mono break-all">
                          <div>
                            Model ID：<strong className="font-semibold">{customConfig.model}</strong>{' '}
                            （{customConfig.protocol === 'anthropic' ? 'Anthropic 协议' : 'OpenAI 兼容协议'}）
                          </div>
                          <div>Base URL：{customConfig.baseUrl}</div>
                          {customConfig.lastVerifiedAt && (
                            <div className="text-[10.5px] text-emerald-700">
                              最近连通验证：{new Date(customConfig.lastVerifiedAt).toLocaleString('zh-CN')}
                            </div>
                          )}
                        </div>
                      ) : configuredEnvProviders.length > 0 ? (
                        <p className="mt-1 text-[11px] text-blue-800/85">
                          已检测到服务端默认模型（{configuredEnvProviders[0].defaultModel}）。你在下方保存自定义配置后，将优先使用你的本地配置。
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-600">
                          本项目不内置大模型或 API 额度。填写任意 OpenAI 兼容或 Anthropic Claude 接口的 Base URL、你自己的 API Key 与 Model ID，保存后全站「简历体检 / 换岗改写 / 语义打分 / 旧简历解析」立即生效。
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      1. 快捷填入常用接口地址模板（仅填 URL/模型名，需自备 Key）
                    </span>
                    <span className="relative group inline-flex items-center">
                      <button
                        type="button"
                        aria-label="模型接口网络连通性与中转站安全说明"
                        title="请确保你的本地网络环境能够访问该模型接口。如果选择中转站，请自行甄别安全性。"
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        <span>网络与中转站安全提示</span>
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute right-0 bottom-full z-30 mb-1.5 w-72 rounded-lg border border-amber-200 bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        快捷模板仅自动填入服务商 Base URL 与默认 Model ID，项目本身不内置大模型和 Key。请确保你的本地网络环境能够访问该模型接口。如果选择中转站，请自行甄别安全性。
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {AI_PRESETS.map((preset) => {
                      const active =
                        draft.baseUrl.trim().replace(/\/+$/, '') === preset.baseUrl &&
                        draft.model.trim() === preset.model;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          title={`仅填入 ${preset.label} 接口地址与推荐模型名（不含 API Key）。请确保你的本地网络环境能够访问该模型接口。如果选择中转站，请自行甄别安全性。`}
                          onClick={() => {
                            updateDraft({
                              protocol: preset.protocol,
                              baseUrl: preset.baseUrl,
                              model: preset.model,
                            });
                            setProbeResult(null);
                          }}
                          className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-[11.5px] font-medium truncate">{preset.label}</div>
                          <div
                            className={`text-[10px] truncate ${
                              active ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {preset.tag}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    data-testid="settings-ai-safety-notice"
                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/75 px-3 py-2 text-[11px] leading-relaxed text-amber-900"
                  >
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      <strong>安全与网络提示：</strong>
                      上方快捷按钮仅自动填充对应平台的 Base URL 与默认模型名，本项目不内置大模型或官方 Key。请确保你的本地网络环境能够访问该模型接口。如果选择中转站，请自行甄别安全性。
                    </span>
                  </div>
                </div>

                {/* Protocol Selector */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-800">2. 接口协议类型</span>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => updateDraft({ protocol: 'openai' })}
                      className={`rounded-lg py-1.5 font-medium transition-colors ${
                        draft.protocol === 'openai'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      OpenAI 兼容协议（/chat/completions）
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft({ protocol: 'anthropic' })}
                      className={`rounded-lg py-1.5 font-medium transition-colors ${
                        draft.protocol === 'anthropic'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Anthropic Claude 协议（/v1/messages）
                    </button>
                  </div>
                </div>

                {/* Detailed Fields: Base URL, API Key, Model ID */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
                  {/* Base URL */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label htmlFor="settings-ai-base-url" className="text-xs font-semibold text-slate-800">
                        Base URL <span className="text-red-500">*</span>
                      </label>
                      {draftIsLocal && (
                        <span className="text-[10.5px] font-medium text-emerald-700">
                          已识别为本地接口（可免填 API Key）
                        </span>
                      )}
                    </div>
                    <input
                      id="settings-ai-base-url"
                      type="url"
                      value={draft.baseUrl}
                      onChange={(e) => updateDraft({ baseUrl: e.target.value })}
                      placeholder={
                        draft.protocol === 'anthropic'
                          ? 'https://api.anthropic.com 或 Claude 中转站地址'
                          : 'https://api.deepseek.com/v1 或 https://your-relay.com/v1'
                      }
                      aria-invalid={Boolean(fieldErrors.baseUrl)}
                      className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.baseUrl
                          ? 'border-red-400 focus:border-red-600'
                          : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                    {fieldErrors.baseUrl ? (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{fieldErrors.baseUrl}</span>
                      </p>
                    ) : endpointPreview ? (
                      <p className="mt-1 font-mono text-[10.5px] text-slate-500 truncate">
                        实际请求地址：POST {endpointPreview}
                      </p>
                    ) : null}
                  </div>

                  {/* API Key */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label htmlFor="settings-ai-api-key" className="text-xs font-semibold text-slate-800">
                        API Key {!draftIsLocal && <span className="text-red-500">*</span>}
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        仅保存在本机浏览器 localStorage
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="settings-ai-api-key"
                        type={showKey ? 'text' : 'password'}
                        autoComplete="off"
                        value={draft.apiKey}
                        onChange={(e) => updateDraft({ apiKey: e.target.value })}
                        placeholder={draftIsLocal ? '本地 Ollama 可留空' : 'sk-...'}
                        aria-invalid={Boolean(fieldErrors.apiKey)}
                        className={`w-full rounded-lg border bg-white pl-3 pr-9 py-2 font-mono text-xs text-slate-900 focus:outline-none ${
                          fieldErrors.apiKey
                            ? 'border-red-400 focus:border-red-600'
                            : 'border-slate-200 focus:border-blue-600'
                        }`}
                      />
                      <button
                        type="button"
                        aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                        onClick={() => setShowKey((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.apiKey && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{fieldErrors.apiKey}</span>
                      </p>
                    )}
                  </div>

                  {/* Custom Model ID + Fetch Models */}
                  <div className="space-y-1.5">
                    <label htmlFor="settings-ai-model" className="block text-xs font-semibold text-slate-800">
                      自定义 Model ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="settings-ai-model"
                        type="text"
                        value={draft.model}
                        onChange={(e) => updateDraft({ model: e.target.value })}
                        placeholder="手动输入任意 Model ID，如 deepseek-chat / gpt-4.1 / claude-sonnet-4-20250514"
                        aria-invalid={Boolean(fieldErrors.model)}
                        className={`min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none ${
                          fieldErrors.model
                            ? 'border-red-400 focus:border-red-600'
                            : 'border-slate-200 focus:border-blue-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleTestAndFetchModels}
                        disabled={probeLoading}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
                      >
                        {probeLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        测试并获取模型
                      </button>
                    </div>
                    {fieldErrors.model && (
                      <p className="flex items-center gap-1 text-[11px] text-red-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{fieldErrors.model}</span>
                      </p>
                    )}

                    {/* Quick Dynamic Switch from Recently Saved Model IDs */}
                    {(customConfig.savedModels?.length || 0) > 0 && (
                      <div className="pt-1">
                        <div className="text-[11px] text-slate-500 mb-1">
                          已用模型一键热切换（无需重启）：
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {customConfig.savedModels!.map((m) => {
                            const isCurrent = customConfig.enabled && customConfig.model === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleQuickSwitchSavedModel(m)}
                                className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                                  isCurrent
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                }`}
                              >
                                {m}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fetched Model Directory Selector */}
                    {draft.fetchedModels.length > 0 && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5 mt-1">
                        {draft.fetchedModels.length > 10 && (
                          <input
                            type="text"
                            aria-label="筛选已拉取的模型"
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            placeholder={`筛选已拉取的 ${draft.fetchedModels.length} 个模型...`}
                            className="w-full rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        )}
                        <select
                          aria-label="从拉取结果中选择 Model ID"
                          value={filteredModels.includes(draft.model) ? draft.model : ''}
                          onChange={(e) => {
                            if (e.target.value) updateDraft({ model: e.target.value });
                          }}
                          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                        >
                          <option value="">
                            -- 从接口拉取到的模型中选择（共 {filteredModels.length} 个）--
                          </option>
                          {filteredModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Probe / Validation Result Banner */}
                  {probeResult && (
                    <div
                      role={probeResult.type === 'err' ? 'alert' : 'status'}
                      data-testid="settings-ai-feedback"
                      className={`rounded-lg border px-3 py-2 text-xs leading-relaxed flex items-start gap-2 ${
                        probeResult.type === 'ok'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {probeResult.type === 'ok' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                      )}
                      <span>{probeResult.text}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Storage & Privacy Tab */
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    开源隐私与本地存储说明
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    所有简历版本、自定义提示词以及你的 AI 接口 Key 均仅保存在当前浏览器的{' '}
                    <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px]">
                      localStorage
                    </code>{' '}
                    中。发起 AI 请求时，服务端仅做无状态代理转发以解决浏览器跨域（CORS），不会落盘、记录或分享你的任何密钥与简历内容。
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] text-slate-500">本地简历版本数</div>
                      <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                        {resumeCount} 份
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] text-slate-500">浏览器本地存储占用</div>
                      <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                        约 {storageUsageKb} KB
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Database className="h-3.5 w-3.5 text-slate-500" />
                    导出全部简历 JSON 备份
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenGuide();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                    重新查看新手引导
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {activeTab === 'ai' && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/70 px-4 sm:px-5 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {(activeCustomReady || draft.baseUrl || draft.apiKey || draft.model) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">清除本地配置</span>
                  <span className="sm:hidden">清除</span>
                </button>
              )}
              {hasUnsavedChanges && (
                <span className="hidden md:inline text-[11px] text-amber-700 truncate">
                  有未保存的修改
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 sm:px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 sm:px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <PlugZap className="h-3.5 w-3.5" />
                验证并保存为默认
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
