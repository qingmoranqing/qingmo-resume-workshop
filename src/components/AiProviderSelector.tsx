import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  PlugZap,
  RefreshCw,
  Server,
  Settings,
  Settings2,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import type {
  AiConfigSaveResult,
  AiConfigValidationErrors,
  AiProviderId,
  AiProviderInfo,
  CustomAiConfig,
  CustomAiProtocol,
} from '../types/resume';
import {
  classifyAiNetworkError,
  isCustomAiReady,
  isLocalEndpointUrl,
  summarizeAiConfigErrors,
  validateCustomAiConfig,
} from '../utils/resumeLogic';

interface AiProviderSelectorProps {
  id: string;
  providers: AiProviderInfo[];
  selectedProvider: AiProviderId;
  onSelectProvider: (provider: AiProviderId) => void;
  customConfig: CustomAiConfig;
  onSaveCustomConfig: (draft: CustomAiConfig) => AiConfigSaveResult;
  onClearCustomConfig: () => void;
  onOpenSettings?: () => void;
  onNotify?: (msg: string) => void;
}

const ENDPOINT_PRESETS: Array<{
  label: string;
  protocol: CustomAiProtocol;
  baseUrl: string;
  model: string;
}> = [
  {
    label: 'DeepSeek',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    label: 'Kimi',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  {
    label: '硅基流动',
    protocol: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-72B-Instruct',
  },
  {
    label: 'OpenAI / 中转',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  {
    label: 'Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
  },
  {
    label: '本地 Ollama',
    protocol: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:14b',
  },
];

export function AiProviderSelector({
  id,
  providers,
  selectedProvider,
  onSelectProvider,
  customConfig,
  onSaveCustomConfig,
  onClearCustomConfig,
  onOpenSettings,
  onNotify,
}: AiProviderSelectorProps) {
  const configuredEnvProviders = providers.filter((p) => p.configured);
  const envReady = configuredEnvProviders.length > 0;
  const customReady = isCustomAiReady(customConfig);

  const [draft, setDraft] = useState<CustomAiConfig>(customConfig);
  const [editingCustom, setEditingCustom] = useState<boolean>(() => !customReady && !envReady);
  const [showKey, setShowKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AiConfigValidationErrors>({});
  const [modelSearch, setModelSearch] = useState('');
  const [showEnvGuide, setShowEnvGuide] = useState(false);

  // Sync draft when SettingsModal or another panel updates the validated config
  useEffect(() => {
    setDraft(customConfig);
    setFieldErrors({});
    if (isCustomAiReady(customConfig)) {
      setEditingCustom(false);
    }
  }, [customConfig]);

  const draftIsLocal = isLocalEndpointUrl(draft.baseUrl);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return draft.fetchedModels;
    return draft.fetchedModels.filter((m) => m.toLowerCase().includes(q));
  }, [draft.fetchedModels, modelSearch]);

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

  const handleFetchModels = async () => {
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
      setFetchMsg({
        type: 'err',
        text: summarizeAiConfigErrors(probeErrors),
      });
      return;
    }

    setFetchingModels(true);
    setFetchMsg(null);
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
        setFetchMsg({ type: 'err', text: reason });
        return;
      }
      const models = Array.isArray(json.models) ? (json.models as string[]) : [];
      if (models.length === 0) {
        setFetchMsg({
          type: 'err',
          text: '接口连通成功，但未返回可用模型列表，请直接在下方手动输入 Model ID。',
        });
        return;
      }
      const nextModel = draft.model.trim() || models[0];
      setDraft((prev) => ({
        ...prev,
        baseUrl: preCheck.normalized.baseUrl,
        apiKey: preCheck.normalized.apiKey,
        fetchedModels: models,
        model: nextModel,
        lastVerifiedAt: new Date().toISOString(),
      }));
      setFetchMsg({
        type: 'ok',
        text: json.note || `连接成功！已拉取 ${models.length} 个模型，点击「验证并保存」即刻生效。`,
      });
      onNotify?.(`已拉取 ${models.length} 个可用模型`);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      setFetchMsg({
        type: 'err',
        text: classifyAiNetworkError(rawMsg),
      });
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = () => {
    const result = onSaveCustomConfig({ ...draft, enabled: true });
    if (!result.ok) {
      setFieldErrors(result.validation.errors);
      setFetchMsg({
        type: 'err',
        text: summarizeAiConfigErrors(result.validation.errors),
      });
      return;
    }
    setFieldErrors({});
    setFetchMsg(null);
    setEditingCustom(false);
  };

  const handleQuickSwitchModel = (modelId: string) => {
    const result = onSaveCustomConfig({ ...customConfig, model: modelId, enabled: true });
    if (!result.ok) {
      setFieldErrors(result.validation.errors);
    }
  };

  const handleClearCustom = () => {
    onClearCustomConfig();
    setFetchMsg(null);
    setFieldErrors({});
    setModelSearch('');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
      {/* Header Status Row */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-900 min-w-0 truncate">
          <Server className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate">自定义 AI 接口（自带 Key）</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              title="打开完整应用设置 · AI 接口配置面板"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
            >
              <Settings className="h-3 w-3" />
              详细设置
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditingCustom((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            <Settings2 className="h-3 w-3" />
            {editingCustom ? '收起' : customReady ? '快速改' : '配置'}
          </button>
        </div>
      </div>

      {/* Collapsed Ready Summary + Quick Model Switcher */}
      {!editingCustom && customReady && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 max-w-full">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">已启用：{customConfig.model}</span>
              </div>
              <div className="text-[10.5px] text-emerald-700/80 truncate mt-0.5 font-mono">
                {customConfig.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI 兼容'} ·{' '}
                {customConfig.baseUrl}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearCustom}
              title="清除本地 API 配置"
              className="shrink-0 rounded p-1 text-emerald-700/70 hover:bg-emerald-100 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {(customConfig.savedModels?.length || 0) > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-slate-400">热切换：</span>
              {customConfig.savedModels!.slice(0, 4).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleQuickSwitchModel(m)}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    customConfig.model === m
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Server .env selector when custom BYOK is not active */}
      {!editingCustom && !customReady && envReady && (
        <div className="space-y-1.5">
          <select
            id={id}
            aria-label="选择服务端 .env AI 引擎"
            value={selectedProvider}
            onChange={(e) => onSelectProvider(e.target.value as AiProviderId)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
          >
            <option value="auto">服务端 .env 自动路由</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} · {p.configured ? `已就绪 (${p.defaultModel})` : '未配置'}
              </option>
            ))}
          </select>
        </div>
      )}

      {!editingCustom && !customReady && !envReady && (
        <p className="text-[11px] leading-relaxed text-slate-500">
          未配置直连 API。点击右上角「详细设置」或「配置」填入你的 Base URL、API Key 与 Model ID，或直接使用下方免费的「外部 AI 零配置协作」。
        </p>
      )}

      {/* Inline BYOK Custom API Configuration Panel */}
      {editingCustom && (
        <div className="space-y-2.5 border-t border-slate-100 pt-2.5">
          {/* Quick Service Presets */}
          <div className="space-y-1">
            <span className="block text-[10.5px] font-medium text-slate-500">
              一键填充常用接口（也可自由改填中转站 URL）
            </span>
            <div className="flex flex-wrap gap-1">
              {ENDPOINT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    updateDraft({
                      protocol: preset.protocol,
                      baseUrl: preset.baseUrl,
                      model: preset.model,
                    });
                    setFetchMsg(null);
                  }}
                  className={`rounded-md border px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
                    draft.baseUrl.trim().replace(/\/+$/, '') === preset.baseUrl
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Protocol Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => updateDraft({ protocol: 'openai' })}
              className={`rounded-md py-1 font-medium transition-colors ${
                draft.protocol === 'openai'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              OpenAI 兼容（主流/中转/Ollama）
            </button>
            <button
              type="button"
              onClick={() => updateDraft({ protocol: 'anthropic' })}
              className={`rounded-md py-1 font-medium transition-colors ${
                draft.protocol === 'anthropic'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Anthropic Claude 协议
            </button>
          </div>

          {/* API Base URL */}
          <div>
            <label htmlFor={`${id}-base-url`} className="block text-[11px] font-medium text-slate-700 mb-1">
              API Base URL
            </label>
            <input
              id={`${id}-base-url`}
              type="url"
              value={draft.baseUrl}
              onChange={(e) => updateDraft({ baseUrl: e.target.value })}
              placeholder={
                draft.protocol === 'anthropic'
                  ? 'https://api.anthropic.com 或 Claude 中转地址'
                  : 'https://api.deepseek.com/v1 或你的中转站地址'
              }
              className={`w-full rounded-md border bg-white px-2.5 py-1.5 font-mono text-[11.5px] text-slate-900 focus:outline-none ${
                fieldErrors.baseUrl
                  ? 'border-red-400 focus:border-red-600'
                  : 'border-slate-200 focus:border-blue-600'
              }`}
            />
            {fieldErrors.baseUrl && (
              <p className="mt-1 flex items-center gap-1 text-[10.5px] text-red-600">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{fieldErrors.baseUrl}</span>
              </p>
            )}
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={`${id}-api-key`} className="text-[11px] font-medium text-slate-700">
                API Key
              </label>
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                {draftIsLocal ? '本地接口可留空' : '仅存本机 localStorage'}
              </span>
            </div>
            <div className="relative">
              <input
                id={`${id}-api-key`}
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                value={draft.apiKey}
                onChange={(e) => updateDraft({ apiKey: e.target.value })}
                placeholder={draftIsLocal ? '本地 Ollama 可留空' : 'sk-...'}
                className={`w-full rounded-md border bg-white pl-2.5 pr-8 py-1.5 font-mono text-[11.5px] text-slate-900 focus:outline-none ${
                  fieldErrors.apiKey
                    ? 'border-red-400 focus:border-red-600'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              <button
                type="button"
                aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {fieldErrors.apiKey && (
              <p className="mt-1 flex items-center gap-1 text-[10.5px] text-red-600">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{fieldErrors.apiKey}</span>
              </p>
            )}
          </div>

          {/* Model ID Input + Live Fetch Models Button */}
          <div className="space-y-1.5">
            <label htmlFor={`${id}-model`} className="block text-[11px] font-medium text-slate-700">
              自定义 Model ID（支持自动拉取或手填）
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id={`${id}-model`}
                type="text"
                value={draft.model}
                onChange={(e) => updateDraft({ model: e.target.value })}
                placeholder="例如 deepseek-chat / claude-sonnet-4-20250514"
                className={`min-w-0 flex-1 rounded-md border bg-white px-2.5 py-1.5 font-mono text-[11.5px] text-slate-900 focus:outline-none ${
                  fieldErrors.model
                    ? 'border-red-400 focus:border-red-600'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
              >
                {fetchingModels ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                获取模型
              </button>
            </div>
            {fieldErrors.model && (
              <p className="flex items-center gap-1 text-[10.5px] text-red-600">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{fieldErrors.model}</span>
              </p>
            )}

            {fetchMsg && (
              <div
                className={`rounded-md border px-2 py-1.5 text-[11px] leading-relaxed ${
                  fetchMsg.type === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {fetchMsg.text}
              </div>
            )}

            {/* Fetched Models Quick Selector */}
            {draft.fetchedModels.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 space-y-1.5">
                {draft.fetchedModels.length > 12 && (
                  <input
                    type="text"
                    aria-label="筛选已拉取的模型"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder={`筛选已拉取的 ${draft.fetchedModels.length} 个模型...`}
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                )}
                <select
                  aria-label="从拉取结果中选择模型"
                  value={filteredModels.includes(draft.model) ? draft.model : ''}
                  onChange={(e) => {
                    if (e.target.value) updateDraft({ model: e.target.value });
                  }}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="">
                    -- 从已拉取模型中点选（共 {filteredModels.length} 个）--
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

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowEnvGuide((v) => !v)}
              className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-slate-800"
            >
              <Terminal className="h-3 w-3" />
              <span>自托管 `.env`</span>
              {showEnvGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <div className="flex items-center gap-1.5">
              {(draft.baseUrl || draft.apiKey || draft.model || customReady) && (
                <button
                  type="button"
                  onClick={handleClearCustom}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                >
                  清除
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
              >
                <PlugZap className="h-3 w-3" />
                验证并保存
              </button>
            </div>
          </div>

          {showEnvGuide && (
            <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-900 p-2 font-mono text-[10px] leading-relaxed text-slate-100">
{`# 自行部署到服务器时，也可用 .env 作为全局默认接口：
AI_BASE_URL="https://api.deepseek.com/v1"
AI_API_KEY="sk-your-key"
AI_MODEL="deepseek-chat"
# 本地 Ollama 离线模型可不填 AI_API_KEY`}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
