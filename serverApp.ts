import express, { type Request, type Response } from 'express';

type ProviderId = 'openai' | 'anthropic';

interface ProviderDescriptor {
  id: ProviderId;
  label: string;
  desc: string;
  configured: boolean;
  defaultModel: string;
  baseUrlHint?: string;
}

interface CustomAiPayload {
  protocol?: ProviderId;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal)(:\d+)?(\/|$)/i.test(
    url.trim(),
  );
}

function sanitizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    const err = new Error('Base URL 格式错误：必须以 https:// 或 http:// 开头（例如 https://api.deepseek.com/v1）。');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  let parsed: URL | null = null;
  try {
    parsed = new URL(trimmed);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname) {
    const err = new Error('Base URL 格式无效：请填写合法的 https:// 或 http:// 接口地址。');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  // Reject link-local / cloud metadata endpoints for safety (while keeping localhost / Ollama allowed)
  if (/^https?:\/\/(169\.254\.\d+\.\d+|\[?fe80:|metadata\.google\.internal|metadata\.goog)/i.test(trimmed)) {
    const err = new Error('安全拦截：不允许访问内部云元数据或链路本地地址。');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  return trimmed;
}

function buildOpenAiChatUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v\d+$/i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

function buildOpenAiModelsUrls(baseUrl: string): string[] {
  const clean = baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
  if (/\/models$/i.test(clean)) return [clean];
  if (/\/v\d+$/i.test(clean)) return [`${clean}/models`];
  return [`${clean}/v1/models`, `${clean}/models`];
}

function buildAnthropicMessagesUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, '');
  if (/\/v1\/messages$/i.test(clean)) return clean;
  if (/\/v1$/i.test(clean)) return `${clean}/messages`;
  return `${clean}/v1/messages`;
}

function buildAnthropicModelsUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, '').replace(/\/v1\/messages$/i, '');
  if (/\/v1$/i.test(clean)) return `${clean}/models`;
  return `${clean}/v1/models`;
}

/**
 * Open-source BYO-Model configuration via .env (optional server-side default).
 * Users can also pass per-request customConfig from their own browser BYOK settings
 * (statelessly proxied here to avoid CORS, never stored or logged on server).
 */
function getOpenAiConfig() {
  const apiKey = (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  const baseUrl = (
    process.env.AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.deepseek.com/v1'
  )
    .trim()
    .replace(/\/+$/, '');
  const model = (process.env.AI_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat').trim();

  if (!apiKey && !isLocalUrl(baseUrl)) return null;

  return {
    apiKey: apiKey || 'ollama',
    baseUrl,
    model,
  };
}

function getAnthropicConfig() {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com')
    .trim()
    .replace(/\/+$/, '');
  const model = (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514').trim();
  return { apiKey, baseUrl, model };
}

function listProviders(): ProviderDescriptor[] {
  const openaiCfg = getOpenAiConfig();
  const anthropicCfg = getAnthropicConfig();

  return [
    {
      id: 'openai',
      label: 'OpenAI 兼容接口（DeepSeek / Kimi / 通义 / Ollama / 中转站）',
      desc: '支持浏览器直填或在 .env 配置 AI_BASE_URL + AI_API_KEY + AI_MODEL',
      configured: Boolean(openaiCfg),
      defaultModel: openaiCfg?.model || 'deepseek-chat',
      baseUrlHint: openaiCfg?.baseUrl,
    },
    {
      id: 'anthropic',
      label: 'Claude（Anthropic / 兼容中转）',
      desc: '支持浏览器直填或在 .env 配置 ANTHROPIC_BASE_URL + ANTHROPIC_API_KEY + ANTHROPIC_MODEL',
      configured: Boolean(anthropicCfg),
      defaultModel: anthropicCfg?.model || 'claude-sonnet-4-20250514',
      baseUrlHint: anthropicCfg?.baseUrl,
    },
  ];
}

function extractJsonText(raw: string): string {
  // Strip <think>...</think> reasoning traces from DeepSeek-R1 / QwQ / thinking models
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return stripped.slice(firstBrace, lastBrace + 1);
  }
  return stripped;
}

function parseStructuredJson<T>(raw: string): T {
  try {
    return JSON.parse(extractJsonText(raw)) as T;
  } catch {
    const err = new Error('模型返回内容不是合法 JSON 格式（可能是输出被截断或模型不支持结构化 JSON），请重试或切换模型。');
    (err as Error & { statusCode?: number }).statusCode = 502;
    throw err;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 60000,
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message))) {
      const timeoutErr = new Error(`模型响应超时（${Math.round(timeoutMs / 1000)} 秒），请检查中转站网络或切换更快的模型。`);
      (timeoutErr as Error & { statusCode?: number }).statusCode = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('429') ||
        msg.includes('ETIMEDOUT');
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function extractCauseInfo(err: unknown): { code: string; detail: string } {
  const e = err as { code?: unknown; message?: unknown; cause?: { code?: unknown; message?: unknown } } | null;
  const code = String(e?.cause?.code || e?.code || '');
  const detail = String(e?.cause?.message || e?.message || '');
  return { code, detail };
}

function mapAiError(err: unknown, providerLabel: string): { status: number; message: string } {
  const statusCode = (err as Error & { statusCode?: number })?.statusCode;
  if (typeof statusCode === 'number' && statusCode >= 400) {
    return {
      status: statusCode,
      message: err instanceof Error ? err.message : String(err),
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  const { code, detail } = extractCauseInfo(err);
  const combined = `${code} ${detail} ${msg}`.toLowerCase();

  if (
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    combined.includes('enotfound') ||
    combined.includes('getaddrinfo')
  ) {
    return {
      status: 502,
      message: `${providerLabel}失败：网络不可达（域名无法解析），请检查 Base URL 域名拼写或当前网络连通性。`,
    };
  }
  if (code === 'ECONNREFUSED' || combined.includes('econnrefused')) {
    return {
      status: 502,
      message: `${providerLabel}失败：网络不可达（目标主机拒绝连接）。若使用本地 Ollama，请确认服务已启动且端口正确。`,
    };
  }
  if (
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    combined.includes('etimedout') ||
    combined.includes('connect_timeout')
  ) {
    return {
      status: 504,
      message: `${providerLabel}失败：网络连接超时，目标接口或中转站无响应，请检查网络或稍后重试。`,
    };
  }
  if (
    code === 'ENETUNREACH' ||
    code === 'EHOSTUNREACH' ||
    code === 'ECONNRESET' ||
    combined.includes('enetunreach') ||
    combined.includes('ehostunreach') ||
    combined.includes('econnreset')
  ) {
    return {
      status: 502,
      message: `${providerLabel}失败：网络不可达或连接中断，请检查网络环境、代理设置或中转站可用性。`,
    };
  }
  if (
    code.includes('CERT') ||
    combined.includes('certificate') ||
    combined.includes('tls') ||
    combined.includes('ssl')
  ) {
    return {
      status: 502,
      message: `${providerLabel}失败：HTTPS/SSL 证书校验失败，请检查 Base URL 协议与中转站证书状态。`,
    };
  }
  if (combined.includes('fetch failed')) {
    return {
      status: 502,
      message: `${providerLabel}失败：网络不可达，无法连接到目标 Base URL，请检查地址是否可访问。`,
    };
  }
  if (
    msg.includes('401') ||
    combined.includes('invalid_api_key') ||
    combined.includes('incorrect api key') ||
    combined.includes('authentication_error')
  ) {
    return {
      status: 401,
      message: `${providerLabel}失败（401）：API Key 格式错误、已失效或与协议不匹配，请核对密钥后重试。`,
    };
  }
  if (msg.includes('403')) {
    return {
      status: 403,
      message: `${providerLabel}失败（403）：API Key 权限不足、账号余额受限或地区/IP 被拒绝访问。`,
    };
  }
  if (msg.includes('404')) {
    return {
      status: 404,
      message: `${providerLabel}失败（404）：接口路径或模型名称不存在，请检查 Base URL（是否缺少/多写了 /v1）与 Model ID。`,
    };
  }
  if (msg.includes('429')) {
    return {
      status: 429,
      message: `${providerLabel}失败（429）：请求频率受限或账户余额不足，请检查服务商配额或稍后重试。`,
    };
  }
  if (err instanceof SyntaxError) {
    return {
      status: 502,
      message: `${providerLabel}失败：接口返回数据无法解析为合法 JSON，请确认 Base URL 指向的是 API 接口而非网页。`,
    };
  }
  return {
    status: 500,
    message: `${providerLabel}失败：${msg.slice(0, 240)}`,
  };
}

interface ResolvedEndpoint {
  protocol: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  source: 'custom' | 'env';
}

function resolveEndpoint(
  provider?: string,
  modelOverride?: string,
  customConfig?: CustomAiPayload,
): ResolvedEndpoint | null {
  // 1. Prefer user's own browser BYOK customConfig when provided
  if (customConfig && typeof customConfig.baseUrl === 'string' && customConfig.baseUrl.trim()) {
    const protocol: ProviderId = customConfig.protocol === 'anthropic' ? 'anthropic' : 'openai';
    const baseUrl = sanitizeBaseUrl(customConfig.baseUrl);
    const apiKey = (customConfig.apiKey || '').trim();
    const model = (customConfig.model || '').trim();

    if (!model) {
      const err = new Error('请先填写或拉取并选择一个模型名称（Model ID）。');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }
    if (!apiKey && !isLocalUrl(baseUrl)) {
      const err = new Error('当前远程接口需要填写 API Key（本地 Ollama 如 http://localhost:11434/v1 可留空）。');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }
    return {
      protocol,
      baseUrl,
      apiKey: apiKey || 'ollama',
      model,
      source: 'custom',
    };
  }

  // 2. Fall back to self-hosted server .env config
  const requested = (provider || 'auto') as ProviderId | 'auto';
  const override = typeof modelOverride === 'string' ? modelOverride.trim() : '';

  const pickEnv = (): ProviderId | null => {
    if (requested === 'openai') return getOpenAiConfig() ? 'openai' : null;
    if (requested === 'anthropic') return getAnthropicConfig() ? 'anthropic' : null;
    if (getOpenAiConfig()) return 'openai';
    if (getAnthropicConfig()) return 'anthropic';
    return null;
  };

  const selected = pickEnv();
  if (!selected) return null;

  if (selected === 'openai') {
    const cfg = getOpenAiConfig()!;
    return {
      protocol: 'openai',
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: override || cfg.model,
      source: 'env',
    };
  }

  const cfg = getAnthropicConfig()!;
  return {
    protocol: 'anthropic',
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: override || cfg.model,
    source: 'env',
  };
}

interface StructuredCallParams {
  provider?: string;
  modelOverride?: string;
  customConfig?: CustomAiPayload;
  systemInstruction: string;
  userContent: string;
  jsonContractHint: string;
}

async function invokeStructuredAi<T>(
  params: StructuredCallParams,
): Promise<{ data: T; usedProvider: string; usedModel: string }> {
  const endpoint = resolveEndpoint(params.provider, params.modelOverride, params.customConfig);
  if (!endpoint) {
    const err = new Error(
      '尚未配置可用的 AI 接口。请在上方「自定义 API 配置」中填入你的 Base URL、Key 与模型（点击「获取模型」或直接手填），或使用下方免费的「外部 AI 零配置协作」。',
    );
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  // 1. OpenAI-Compatible path (DeepSeek / Qwen / Kimi / SiliconFlow / Ollama / OpenAI / OneAPI / NewAPI)
  if (endpoint.protocol === 'openai') {
    const url = buildOpenAiChatUrl(endpoint.baseUrl);
    const messages = [
      {
        role: 'system',
        content: `${params.systemInstruction}\n\n你必须仅返回严格合法的 JSON 对象，不要包含额外解释文字。\nJSON 结构要求：\n${params.jsonContractHint}`,
      },
      { role: 'user', content: params.userContent },
    ];

    const callOpenAi = async (useJsonFormat: boolean) => {
      const payload: Record<string, unknown> = {
        model: endpoint.model,
        messages,
      };
      if (useJsonFormat) {
        payload.response_format = { type: 'json_object' };
      }
      const resp = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${endpoint.apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        60000,
      );
      if (!resp.ok) {
        const text = await resp.text();
        // Some reasoning models (e.g. deepseek-reasoner / o1 / custom relays) reject response_format
        if (useJsonFormat && resp.status === 400 && /response_format|json_object/i.test(text)) {
          return callOpenAi(false);
        }
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 220)}`);
      }
      return resp.json();
    };

    const json = await withRetry(() => callOpenAi(true));
    const content = json?.choices?.[0]?.message?.content || '';
    const parsed = parseStructuredJson<T>(content);
    return {
      data: parsed,
      usedProvider: endpoint.source === 'custom' ? 'custom-openai' : 'openai',
      usedModel: endpoint.model,
    };
  }

  // 2. Anthropic Claude path
  const url = buildAnthropicMessagesUrl(endpoint.baseUrl);
  const json = await withRetry(async () => {
    const resp = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': endpoint.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: endpoint.model,
          max_tokens: 4096,
          system: `${params.systemInstruction}\n\n请仅输出严格合法的 JSON 对象（不要用 Markdown 说明包裹）。\nJSON 结构要求：\n${params.jsonContractHint}`,
          messages: [{ role: 'user', content: params.userContent }],
        }),
      },
      60000,
    );
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text.slice(0, 220)}`);
    }
    return resp.json();
  });

  const textBlock = Array.isArray(json?.content)
    ? json.content.find((b: { type?: string }) => b.type === 'text')?.text || ''
    : '';
  const parsed = parseStructuredJson<T>(textBlock);
  return {
    data: parsed,
    usedProvider: endpoint.source === 'custom' ? 'custom-anthropic' : 'anthropic',
    usedModel: endpoint.model,
  };
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const providers = listProviders();
    const readyProviders = providers.filter((p) => p.configured);
    res.json({
      ok: true,
      mode: 'open-source-self-hosted',
      aiReady: readyProviders.length > 0,
      model: readyProviders[0]?.defaultModel || null,
      providers,
    });
  });

  app.get('/api/ai/providers', (_req: Request, res: Response) => {
    res.json({
      mode: 'open-source-self-hosted',
      providers: listProviders(),
    });
  });

  /**
   * Stateless proxy to fetch available model IDs from any user-provided
   * OpenAI-compatible endpoint (DeepSeek / Kimi / SiliconFlow / OpenRouter / OneAPI / Ollama)
   * or Anthropic-compatible endpoint. Never persists or logs API keys.
   */
  app.post('/api/ai/models', async (req: Request, res: Response) => {
    const { protocol, baseUrl, apiKey } = (req.body ?? {}) as CustomAiPayload;
    if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
      res.status(400).json({ error: '请先填写 API Base URL（例如 https://api.deepseek.com/v1）。' });
      return;
    }

    try {
      const cleanBase = sanitizeBaseUrl(baseUrl);
      const cleanKey = typeof apiKey === 'string' ? apiKey.trim() : '';
      const proto: ProviderId = protocol === 'anthropic' ? 'anthropic' : 'openai';

      if (!cleanKey && !isLocalUrl(cleanBase)) {
        res.status(400).json({
          error: '远程 API 拉取模型需要填写 API Key（本地 Ollama 可留空）。',
        });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        if (proto === 'anthropic') {
          const url = buildAnthropicModelsUrl(cleanBase);
          const resp = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'x-api-key': cleanKey,
              'anthropic-version': '2023-06-01',
            },
          });
          if (!resp.ok) {
            // Some Anthropic relays do not implement /v1/models; return curated fallback list gracefully
            if (resp.status === 404 || resp.status === 405) {
              res.json({
                models: [
                  'claude-sonnet-4-20250514',
                  'claude-3-7-sonnet-20250219',
                  'claude-3-5-sonnet-20241022',
                  'claude-3-5-haiku-20241022',
                ],
                note: '该中转站未开放 /v1/models 查询，已填充常用 Claude 模型列表，你也可以直接手动输入模型名。',
              });
              return;
            }
            const errText = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 180)}`);
          }
          const json = await resp.json();
          const rawList = Array.isArray(json?.data) ? json.data : [];
          const models = Array.from(
            new Set<string>(
              rawList
                .map((m: { id?: string; name?: string }) => String(m?.id || m?.name || '').trim())
                .filter(Boolean),
            ),
          ).sort();
          res.json({ models });
          return;
        }

        // OpenAI-compatible (also supports Ollama /v1/models & /api/tags-like shapes)
        const candidateUrls = buildOpenAiModelsUrls(cleanBase);
        let lastErr = '';
        for (const url of candidateUrls) {
          const resp = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${cleanKey || 'ollama'}`,
            },
          });
          if (!resp.ok) {
            const errText = await resp.text();
            lastErr = `HTTP ${resp.status}: ${errText.slice(0, 180)}`;
            if (resp.status === 404 && candidateUrls.length > 1) continue;
            throw new Error(lastErr);
          }
          const json = await resp.json();
          const rawList = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.models)
              ? json.models
              : [];
          const models = Array.from(
            new Set<string>(
              rawList
                .map((m: { id?: string; name?: string }) => String(m?.id || m?.name || '').trim())
                .filter(Boolean),
            ),
          ).sort();
          res.json({ models });
          return;
        }
        throw new Error(lastErr || '未能拉取到模型列表');
      } finally {
        clearTimeout(timeout);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('aborted')) {
        res.status(504).json({ error: '连接超时（15 秒），请检查 Base URL 是否可访问或中转站网络状态。' });
        return;
      }
      const mapped = mapAiError(err, '模型列表拉取');
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/ai/audit', async (req: Request, res: Response) => {
    const { resumeText, customPrompt, targetJd, roleHint, provider, modelOverride, customConfig } =
      req.body ?? {};
    if (typeof resumeText !== 'string' || !resumeText.trim()) {
      res.status(400).json({ error: '简历内容为空，请先补充基本信息或工作经历后再体检。' });
      return;
    }
    if (typeof customPrompt !== 'string' || !customPrompt.trim()) {
      res.status(400).json({ error: '请提供体检 Prompt 指令。' });
      return;
    }

    try {
      const userMessage = [
        `【体检 Prompt 指令】\n${customPrompt.trim()}`,
        roleHint ? `【当前简历目标岗位参考】\n${String(roleHint).trim()}` : '',
        targetJd ? `【目标岗位 JD 原文】\n${String(targetJd).trim()}` : '',
        `【候选人简历全文】\n${resumeText.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await invokeStructuredAi({
        provider,
        modelOverride,
        customConfig,
        systemInstruction:
          '你是拥有12年一线招聘与简历辅导经验的中国全行业招聘专家。请严格按照用户的体检 Prompt 指令分析候选人简历，尊重不同行业规范（如文科/工程/医疗/游戏/销售评价标准各异，不强行要求所有行业生造百分比），输出客观、可落地的结构化 JSON 体检报告。严禁编造公司或业绩数据；输出简体中文。',
        userContent: userMessage,
        jsonContractHint:
          '{"overallVerdict":"...","readinessLevel":"可直接投递|建议精修后投递|需重点重构","strengths":["..."],"findings":[{"severity":"high|medium|low","module":"basic|intent|education|experience|skills|certs|tags|evals|layout","title":"...","issue":"...","suggestion":"...","rewriteExample":"..."}]}',
      });

      res.json({
        report: result.data,
        meta: { provider: result.usedProvider, model: result.usedModel },
      });
    } catch (err: unknown) {
      const status = (err as Error & { statusCode?: number }).statusCode;
      if (status) {
        res.status(status).json({ error: (err as Error).message });
        return;
      }
      const mapped = mapAiError(err, String(customConfig?.model || provider || 'AI'));
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/ai/helper', async (req: Request, res: Response) => {
    const { resumeText, targetRole, targetJd, provider, modelOverride, customConfig } =
      req.body ?? {};
    if (typeof resumeText !== 'string' || !resumeText.trim()) {
      res.status(400).json({ error: '简历内容为空，无法生成投递助手包。' });
      return;
    }

    try {
      const prompt = [
        '请根据以下候选人简历与目标岗位，量身生成一套高转化、零模板味的求职投递助手包（搜索关键词、首句打招呼语、JD 避坑筛岗要点、面试高频追问备忘录）。',
        targetRole ? `【期望投递岗位】\n${String(targetRole).trim()}` : '',
        targetJd ? `【参考 JD】\n${String(targetJd).trim()}` : '',
        `【候选人简历】\n${resumeText.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await invokeStructuredAi({
        provider,
        modelOverride,
        customConfig,
        systemInstruction:
          '你是专注中国招聘市场的实战求职教练。输出的投递助手包必须深度贴合候选人的真实履历和具体目标行业/岗位，拒绝空洞套话。输出严格 JSON，简体中文。',
        userContent: prompt,
        jsonContractHint:
          '{"keywords":["..."],"greeting":"...","redFlags":["..."],"memos":[{"title":"...","items":["..."]}]}',
      });

      res.json({
        helper: result.data,
        meta: { provider: result.usedProvider, model: result.usedModel },
      });
    } catch (err: unknown) {
      const status = (err as Error & { statusCode?: number }).statusCode;
      if (status) {
        res.status(status).json({ error: (err as Error).message });
        return;
      }
      const mapped = mapAiError(err, String(customConfig?.model || provider || 'AI'));
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/ai/tailor', async (req: Request, res: Response) => {
    const { resumeJson, targetRole, targetJd, intensity, provider, modelOverride, customConfig } =
      req.body ?? {};
    if (!resumeJson || typeof resumeJson !== 'object') {
      res.status(400).json({ error: '缺少有效的简历数据。' });
      return;
    }
    const cleanRole = typeof targetRole === 'string' ? targetRole.trim() : '';
    const cleanJd = typeof targetJd === 'string' ? targetJd.trim() : '';
    if (!cleanRole && !cleanJd) {
      res.status(400).json({ error: '请至少填写「目标职位名称」或粘贴「目标岗位 JD」。' });
      return;
    }

    const modeInstruction =
      intensity === 'deep'
        ? '深度跨岗重塑模式：重新组织所有工作经历的叙述视角、副标题与全部要点，将候选人已有真实能力最大程度映射到目标岗位的核心职责与关键词，同时重排技能分类、核心标签、自我评价，并生成配套的新投递助手包。'
        : '精准轻度对齐模式：保留候选人原有叙事节奏，重点调整一句话定位、求职意向、每段经历中最相关的关键词与前两条核心要点，并同步更新技能排序、标签与配套投递助手包。';

    try {
      const prompt = [
        `【改写模式】\n${modeInstruction}`,
        cleanRole ? `【新目标职位】\n${cleanRole}` : '',
        cleanJd ? `【目标岗位 JD】\n${cleanJd}` : '',
        `【候选人当前简历结构化 JSON】\n${JSON.stringify(resumeJson)}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await invokeStructuredAi({
        provider,
        modelOverride,
        customConfig,
        systemInstruction:
          '你是资深职业转型顾问与简历重构专家。你的任务是将候选人现有的真实经历，有策略地重构为面向全新目标岗位的高匹配度简历方案。红线原则：1）绝对禁止凭空编造未出现过的公司名称、起止时间、学历或虚假业绩数据；2）必须通过提炼可迁移能力来对齐目标 JD；3）experienceUpdates 中的 id 必须与输入简历 experience 数组的 id 一一对应；4）每条 bullet 控制在 30-60 字，可用 **双星号** 强调关键动词和真实成果；5）同步生成全新匹配的 helper。全部使用简体中文，输出严格 JSON。',
        userContent: prompt,
        jsonContractHint:
          '{"versionName":"...","strategySummary":"...","fitAssessment":"...","recommendedTemplate":"single-column|centered-classic|timeline|card-grid|two-column|two-column-reverse|magazine|top-banner-split","recommendedTheme":"navy-blue|steel-blue|teal-orange|forest-green|warm-amber|ocean-cyan|charcoal|mono|rose|purple","headline":"...","intent":{"position":"...","city":"...","salary":"...","availability":"..."},"experienceUpdates":[{"id":"原经历id","role":"...","subtitle":"...","bullets":["..."]}],"skills":[{"cat":"...","items":"..."}],"tags":["..."],"evals":[{"title":"...","body":"..."}],"helper":{"keywords":["..."],"greeting":"...","redFlags":["..."],"memos":[{"title":"...","items":["..."]}]}}',
      });

      res.json({
        proposal: result.data,
        meta: { provider: result.usedProvider, model: result.usedModel },
      });
    } catch (err: unknown) {
      const status = (err as Error & { statusCode?: number }).statusCode;
      if (status) {
        res.status(status).json({ error: (err as Error).message });
        return;
      }
      const mapped = mapAiError(err, String(customConfig?.model || provider || 'AI'));
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  /**
   * 1-click single-bullet AI polish inside ContentEditor
   */
  app.post('/api/ai/polish', async (req: Request, res: Response) => {
    const { bullet, role, company, industryLabel, provider, modelOverride, customConfig } =
      req.body ?? {};
    if (typeof bullet !== 'string' || !bullet.trim()) {
      res.status(400).json({ error: '请先输入要润色的经历要点内容。' });
      return;
    }

    try {
      const result = await invokeStructuredAi<{ polished: string; tip?: string }>({
        provider,
        modelOverride,
        customConfig,
        systemInstruction:
          '你是资深全行业中文简历精修师。请将候选人的单条工作/项目经历润色得更专业、凝练、有层次。原则：1）严禁编造原文不存在的百分比、金额或虚构数据；2）剔除“负责/协助/参与”等弱动词，改用精准的行业动词；3）控制在 35-65 字，可用 **双星号** 适度加粗 1-2 个核心动作或真实成果；4）尊重行业语境（文科/医疗/工程不生搬硬套互联网黑话）。输出严格 JSON。',
        userContent: [
          industryLabel ? `【行业语境】${industryLabel}` : '',
          company ? `【所属机构】${company}` : '',
          role ? `【担任职位】${role}` : '',
          `【原始经历要点】\n${bullet.trim()}`,
        ]
          .filter(Boolean)
          .join('\n'),
        jsonContractHint: '{"polished":"润色后的单条要点文本","tip":"简短说明优化了什么（15字内）"}',
      });

      res.json({
        polished: result.data.polished,
        tip: result.data.tip || '已完成专业表达精修',
        meta: { provider: result.usedProvider, model: result.usedModel },
      });
    } catch (err: unknown) {
      const status = (err as Error & { statusCode?: number }).statusCode;
      if (status) {
        res.status(status).json({ error: (err as Error).message });
        return;
      }
      const mapped = mapAiError(err, String(customConfig?.model || provider || 'AI'));
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  /**
   * Generate 3 STAR-principle supplementary work experience suggestions based on company, role, and responsibilities
   */
  app.post('/api/ai/expand-experience', async (req: Request, res: Response) => {
    const {
      company,
      role,
      subtitle,
      existingBullets,
      industryLabel,
      provider,
      modelOverride,
      customConfig,
    } = req.body ?? {};

    const cleanCompany = typeof company === 'string' ? company.trim() : '';
    const cleanRole = typeof role === 'string' ? role.trim() : '';
    const cleanSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
    const cleanBullets = Array.isArray(existingBullets)
      ? existingBullets
          .filter((b): b is string => typeof b === 'string' && Boolean(b.trim()))
          .map((b) => b.trim())
          .slice(0, 8)
      : [];

    if (!cleanCompany && !cleanRole && !cleanSubtitle) {
      res.status(400).json({
        error: '请先填写「公司名称」和「担任职位 / 岗位职责」，再触发 AI 经历扩充。',
      });
      return;
    }

    try {
      const result = await invokeStructuredAi<{
        suggestions?: Array<{
          focus?: string;
          situation?: string;
          action?: string;
          result?: string;
          bullet?: string;
        }>;
      }>({
        provider,
        modelOverride,
        customConfig,
        systemInstruction:
          '你是资深全行业中文简历顾问，精通 STAR 法则（Situation 情境 / Task 任务 / Action 行动 / Result 结果）。请根据候选人填写的公司名称、担任职位、岗位职责概要及已有要点，自动生成恰好 3 条视角互补、不与已有要点重复的 STAR 原则补充经历建议。硬性要求：1）3 条建议应覆盖不同价值维度（如：核心业务交付 / 流程效率优化 / 跨团队协同或技术创新）；2）严禁编造虚构的公司机密营收数据，如需体现量化指标请使用「约 XX%」「X+ 个」等明确可替换占位提示；3）剔除“负责/协助/参与”等弱动词，改用强动词开头，并用 **双星号** 加粗 1-2 个核心动作或关键成果；4）每条 bullet 控制在 40-75 字；5）尊重行业语境，严格输出合法 JSON。',
        userContent: [
          industryLabel ? `【行业语境】${String(industryLabel).trim()}` : '',
          cleanCompany ? `【公司 / 团队】${cleanCompany}` : '',
          cleanRole ? `【担任职位】${cleanRole}` : '',
          cleanSubtitle ? `【岗位职责 / 价值概要】${cleanSubtitle}` : '',
          cleanBullets.length > 0
            ? `【已有经历要点（请避免重复，补充新视角）】\n${cleanBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}`
            : '【已有经历要点】暂无，请直接基于公司与岗位职责生成 3 条代表性 STAR 经历。',
        ]
          .filter(Boolean)
          .join('\n\n'),
        jsonContractHint:
          '{"suggestions":[{"focus":"价值维度（4-8字，如：流程提效）","situation":"情境/任务（10-20字）","action":"关键行动与方法（15-28字）","result":"量化或可验证结果（10-22字）","bullet":"可直接写入简历的完整 STAR 经历要点（40-75字，含 **双星号** 加粗）"}]}',
      });

      const rawList = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.data?.suggestions)
          ? result.data.suggestions
          : [];

      const suggestions = rawList
        .map((item, idx) => {
          if (typeof item === 'string' && item.trim()) {
            return {
              id: `star-${Date.now().toString(36)}-${idx + 1}`,
              focus: `STAR 维度 ${idx + 1}`,
              situation: '',
              action: '',
              result: '',
              bullet: item.trim(),
            };
          }
          if (!item || typeof item !== 'object') return null;
          const rec = item as Record<string, unknown>;
          const focus =
            typeof rec.focus === 'string' && rec.focus.trim()
              ? rec.focus.trim()
              : `核心维度 ${idx + 1}`;
          const situation = typeof rec.situation === 'string' ? rec.situation.trim() : '';
          const action = typeof rec.action === 'string' ? rec.action.trim() : '';
          const resultText = typeof rec.result === 'string' ? rec.result.trim() : '';
          let bullet = typeof rec.bullet === 'string' ? rec.bullet.trim() : '';
          if (!bullet) {
            const joined = [situation, action, resultText].filter(Boolean).join('，');
            if (joined) bullet = joined.endsWith('。') ? joined : `${joined}。`;
          }
          if (!bullet) return null;
          return {
            id: `star-${Date.now().toString(36)}-${idx + 1}`,
            focus,
            situation,
            action,
            result: resultText,
            bullet,
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .slice(0, 3);

      if (suggestions.length === 0) {
        res.status(422).json({
          error: '模型返回内容中未包含有效的 STAR 经历建议，请重试或切换更稳定的模型。',
        });
        return;
      }

      res.json({
        suggestions,
        meta: { provider: result.usedProvider, model: result.usedModel },
      });
    } catch (err: unknown) {
      const status = (err as Error & { statusCode?: number }).statusCode;
      if (status) {
        res.status(status).json({ error: (err as Error).message });
        return;
      }
      const mapped = mapAiError(err, String(customConfig?.model || provider || 'AI'));
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  /**
   * Bilingual AI translator: translates & polishes key resume content into idiomatic professional English
   */
  app.post('/api/ai/translate-en', async (req: Request, res: Response) => {
    const { keyContent, industryHint, provider, modelOverride, customConfig } = req.body ?? {};
    if (!keyContent || typeof keyContent !== 'object' || Array.isArray(keyContent)) {
      res.status(400).json({ error: '未检测到可翻译的简历关键内容，请先完善简历信息。' });
      return;
    }

    try {
      const result = await invokeStructuredAi({
        provider,
        modelOverride,
        customConfig,
        systemInstruction:
          'You are an executive bilingual resume writer and localization specialist for international (US/UK/global) hiring. Translate and elevate the provided Chinese resume JSON into idiomatic, polished professional English. Strict rules: 1) Replace literal Chinglish with authentic industry terminology and strong executive action verbs (Spearheaded, Architected, Automated, Streamlined, Drove, Delivered); 2) Preserve all real metrics, numbers, and entity facts—NEVER fabricate revenue, percentages, or companies; convert date markers like "至今" to "Present"; 3) Keep **double-asterisk** bold emphasis around 1-2 key actions/results in experience bullets; 4) Preserve every original "id" field verbatim so the app maps items accurately; 5) Provide 3-5 concise terminology upgrade notes in "glossaryNotes" formatted as "中文原词 → Idiomatic English Term". Output strict JSON only.',
        userContent: [
          industryHint ? `[Industry / Role Context] ${String(industryHint).trim()}` : '',
          `[Source Chinese Resume Key Content JSON]\n${JSON.stringify(keyContent).slice(0, 16000)}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        jsonContractHint:
          '{"basic":{"name":"Romanized Name","headline":"...","location":"...","age":"","extras":[{"id":"...","label":"...","value":"..."}]},"intent":{"position":"...","city":"...","salary":"...","availability":"..."},"experience":[{"id":"...","company":"...","role":"...","period":"2022.07 - Present","subtitle":"...","kpis":[{"num":"85%","label":"..."}],"bullets":["**Key Action**: ..."]}],"skills":[{"id":"...","cat":"...","items":"..."}],"education":[{"id":"...","school":"...","major":"...","degree":"...","period":"...","desc":"..."}],"certs":["..."],"tags":["..."],"evals":[{"id":"...","title":"...","body":"..."}],"custom":[{"id":"...","title":"...","items":[]}],"glossaryNotes":["中文专业词 → Idiomatic English Term"]}',
      });

      res.json({
        translated: result.data,
        meta: { provider: result.usedProvider, model: result.usedModel },
      });
    } catch (err: unknown) {
      const status = (err as Error & { statusCode?: number }).statusCode;
      if (status) {
        res.status(status).json({ error: (err as Error).message });
        return;
      }
      const mapped = mapAiError(err, String(customConfig?.model || provider || 'AI'));
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  /**
   * AI structured parser for pasted raw text from existing Word/PDF resumes
   */
  app.post('/api/ai/parse-resume', async (req: Request, res: Response) => {
    const { rawText, provider, modelOverride, customConfig } = req.body ?? {};
    if (typeof rawText !== 'string' || rawText.trim().length < 20) {
      res.status(400).json({ error: '请粘贴至少 20 字的旧简历文本内容再解析。' });
      return;
    }

    try {
      const result = await invokeStructuredAi({
        provider,
        modelOverride,
        customConfig,
        systemInstruction:
          '你是精准的中文简历结构化解析引擎。请将用户从旧 Word / PDF 复制的纯文本简历忠实还原为结构化 JSON。绝对不要编造任何不存在的公司、时间、学校或数据；无法识别的字段留空字符串或空数组；保留用户原有经历要点并用 **双星号** 保留或适度强调原文关键成果。输出严格 JSON。',
        userContent: `【用户旧简历原文】\n${rawText.trim().slice(0, 14000)}`,
        jsonContractHint:
          '{"versionName":"姓名 · 目标岗位（导入版）","basic":{"name":"","headline":"","phone":"","email":"","location":"","age":"","extras":[{"label":"学历","value":""}]},"intent":{"position":"","city":"","salary":"","availability":""},"education":[{"school":"","major":"","degree":"","period":"","desc":""}],"experience":[{"company":"","role":"","period":"","subtitle":"","bullets":[""]}],"skills":[{"cat":"","items":""}],"certs":[""],"tags":[""],"evals":[{"title":"","body":""}]}',
      });

      res.json({
        parsed: result.data,
        meta: { provider: result.usedProvider, model: result.usedModel },
      });
    } catch (err: unknown) {
      const status = (err as Error & { statusCode?: number }).statusCode;
      if (status) {
        res.status(status).json({ error: (err as Error).message });
        return;
      }
      const mapped = mapAiError(err, String(customConfig?.model || provider || 'AI'));
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  return app;
}
