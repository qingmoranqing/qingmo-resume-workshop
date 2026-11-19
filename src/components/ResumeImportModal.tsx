import { useState } from 'react';
import { FileText, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import type {
  AiProviderId,
  AiProviderInfo,
  CustomAiConfig,
  ResumeDoc,
} from '../types/resume';
import {
  buildAiRequestDefaults,
  isCustomAiReady,
  nid,
  normalizeData,
  normalizeMeta,
  parsePlainTextResumeLocal,
} from '../utils/resumeLogic';

interface ResumeImportModalProps {
  open: boolean;
  providers: AiProviderInfo[];
  selectedProvider: AiProviderId;
  customConfig: CustomAiConfig;
  onClose: () => void;
  onImportDoc: (doc: ResumeDoc, modeLabel: string) => void;
}

export function ResumeImportModal({
  open,
  providers,
  selectedProvider,
  customConfig,
  onClose,
  onImportDoc,
}: ResumeImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const anyAiReady = isCustomAiReady(customConfig) || providers.some((p) => p.configured);

  const handleLocalImport = () => {
    if (rawText.trim().length < 12) {
      setErrorMsg('请先粘贴你的旧简历文本内容（至少 12 字）。');
      return;
    }
    setErrorMsg(null);
    const doc = parsePlainTextResumeLocal(rawText);
    onImportDoc(doc, '本地离线解析');
    setRawText('');
    onClose();
  };

  const handleAiImport = async () => {
    if (rawText.trim().length < 20) {
      setErrorMsg('请先粘贴完整的旧简历文本内容（至少 20 字）。');
      return;
    }
    setLoadingAi(true);
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          ...buildAiRequestDefaults(customConfig, selectedProvider),
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErrorMsg(json.error || `AI 解析失败 (${resp.status})`);
        return;
      }
      const parsed = json.parsed || {};
      const doc: ResumeDoc = {
        id: nid('resume'),
        name:
          typeof parsed.versionName === 'string' && parsed.versionName.trim()
            ? parsed.versionName.trim()
            : `${parsed.basic?.name || '个人简历'} · AI 导入版`,
        meta: normalizeMeta({ template: 'single-column', theme: 'navy-blue' }),
        data: normalizeData({
          basic: parsed.basic,
          intent: parsed.intent,
          education: parsed.education,
          experience: parsed.experience,
          skills: parsed.skills,
          certs: parsed.certs,
          tags: parsed.tags,
          evals: parsed.evals,
        }),
      };
      onImportDoc(doc, 'AI 智能结构化解析');
      setRawText('');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? `网络异常：${err.message}` : '解析请求失败');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="导入旧简历文本"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">粘贴旧简历文本 · 一键结构化导入</h2>
              <p className="text-[11px] text-slate-500">
                直接全选复制你现有的 Word / PDF / 招聘网简历文字，免去逐框手填。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭导入弹窗"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <textarea
            rows={11}
            aria-label="旧简历纯文本内容"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`把旧简历里的文字直接粘贴到这里，例如：\n\n张三\n13800001234 | zhangsan@example.com | 上海 | 26岁\n求职意向：PLC 电气自动化工程师\n\n工作经历\nXX智能装备有限公司 2022.05 - 至今\n• 主导西门子 S7-1500 非标产线程序设计与调试...\n\n教育背景\nXX大学 自动化 本科 2018.09 - 2022.06`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
          />

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500">
              {anyAiReady
                ? '已检测到可用 AI 接口，推荐用 AI 精准还原所有分段。'
                : '未配置 API 时，可直接用右侧「离线快速解析」零门槛导入。'}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLocalImport}
                disabled={loadingAi}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                离线快速解析导入
              </button>

              {anyAiReady && (
                <button
                  type="button"
                  onClick={handleAiImport}
                  disabled={loadingAi}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      AI 正在拆解结构...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      AI 智能精准导入
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
