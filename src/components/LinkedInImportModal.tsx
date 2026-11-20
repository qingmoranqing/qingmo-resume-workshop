import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardPaste,
  FileText,
  Linkedin,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
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
  parseLinkedInProfileText,
} from '../utils/resumeLogic';

interface LinkedInImportModalProps {
  open: boolean;
  providers: AiProviderInfo[];
  selectedProvider: AiProviderId;
  customConfig: CustomAiConfig;
  onClose: () => void;
  onImportDoc: (doc: ResumeDoc, modeLabel: string) => void;
}

const SAMPLE_LINKEDIN_PROFILE = `Alex Chen
Senior Full-Stack Engineer | React, TypeScript & Distributed Systems
San Francisco, California, United States
Contact info
500+ connections
alex.chen@example.com
linkedin.com/in/alex-chen-dev

About
Full-stack engineer with 6+ years of experience building high-throughput developer platforms and AI-assisted productivity tools. Passionate about clean architecture, web performance, and measurable business outcomes.

Experience
Senior Software Engineer
CloudScale Labs · Full-time
Mar 2022 - Present · 3 yrs
San Francisco, California · Hybrid
• Architected a real-time collaborative workspace in React 19 and TypeScript serving 120K+ monthly active users with 99.95% uptime.
• Reduced initial bundle payload by 64% through route-level code splitting and edge caching, improving LCP from 2.8s to 0.9s.

Software Engineer
Northstar Commerce · Full-time
Jul 2019 - Feb 2022 · 2 yrs 8 mos
• Built Node.js order orchestration microservices processing $45M+ annual GMV across 14 regional warehouses.
• Automated CI/CD release verification pipelines, cutting deployment rollback incidents by 70%.

Education
University of California, Berkeley
Bachelor of Science, Computer Science
2015 - 2019

Licenses & certifications
AWS Certified Solutions Architect – Associate

Skills
TypeScript · React · Node.js · PostgreSQL · GraphQL · Docker · Kubernetes · System Design`;

export function LinkedInImportModal({
  open,
  providers,
  selectedProvider,
  customConfig,
  onClose,
  onImportDoc,
}: LinkedInImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewDoc = useMemo(() => {
    if (rawText.trim().length < 20) return null;
    return parseLinkedInProfileText(rawText);
  }, [rawText]);

  if (!open) return null;

  const anyAiReady = isCustomAiReady(customConfig) || providers.some((p) => p.configured);

  const handleLocalImport = () => {
    if (rawText.trim().length < 20) {
      setErrorMsg('请先粘贴你的 LinkedIn 个人档案原始文本（至少 20 个字符）。');
      return;
    }
    setErrorMsg(null);
    const doc = parseLinkedInProfileText(rawText);
    onImportDoc(doc, 'LinkedIn 离线解析');
    setRawText('');
    onClose();
  };

  const handleAiImport = async () => {
    if (rawText.trim().length < 20) {
      setErrorMsg('请先粘贴完整的 LinkedIn 个人档案文本（至少 20 个字符）。');
      return;
    }
    setLoadingAi(true);
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: `[LinkedIn Profile Export]\n${rawText}`,
          ...buildAiRequestDefaults(customConfig, selectedProvider),
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErrorMsg(json.error || `AI 解析失败 (${resp.status})`);
        return;
      }
      const parsed = json.parsed || {};
      const localBaseline = parseLinkedInProfileText(rawText);
      const doc: ResumeDoc = {
        id: nid('resume'),
        name:
          typeof parsed.versionName === 'string' && parsed.versionName.trim()
            ? parsed.versionName.trim()
            : `${parsed.basic?.name || localBaseline.data.basic.name || 'LinkedIn 候选人'} · LinkedIn 导入版`,
        meta: normalizeMeta({
          template: 'single-column',
          theme: 'navy-blue',
          titles: localBaseline.meta.titles,
        }),
        data: normalizeData({
          basic: {
            ...localBaseline.data.basic,
            ...(parsed.basic || {}),
            extras:
              Array.isArray(parsed.basic?.extras) && parsed.basic.extras.length > 0
                ? parsed.basic.extras
                : localBaseline.data.basic.extras,
          },
          intent: parsed.intent || localBaseline.data.intent,
          education:
            Array.isArray(parsed.education) && parsed.education.length > 0
              ? parsed.education
              : localBaseline.data.education,
          experience:
            Array.isArray(parsed.experience) && parsed.experience.length > 0
              ? parsed.experience
              : localBaseline.data.experience,
          skills:
            Array.isArray(parsed.skills) && parsed.skills.length > 0
              ? parsed.skills
              : localBaseline.data.skills,
          certs:
            Array.isArray(parsed.certs) && parsed.certs.length > 0
              ? parsed.certs
              : localBaseline.data.certs,
          tags:
            Array.isArray(parsed.tags) && parsed.tags.length > 0
              ? parsed.tags
              : localBaseline.data.tags,
          evals:
            Array.isArray(parsed.evals) && parsed.evals.length > 0
              ? parsed.evals
              : localBaseline.data.evals,
        }),
      };
      onImportDoc(doc, 'LinkedIn AI 结构化解析');
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
      aria-label="从 LinkedIn 档案导入简历"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A66C2]/10 text-[#0A66C2]">
              <Linkedin className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                从 LinkedIn 档案导入 · 一键转为简历结构
              </h2>
              <p className="text-[11px] text-slate-500">
                打开你的 LinkedIn 主页（或「Save to PDF」导出文字），全选复制后直接粘贴到下方即可。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭 LinkedIn 导入弹窗"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <ClipboardPaste className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
              <span>
                支持中/英文 LinkedIn 网页直接粘贴与 PDF 文本，自动剔除「500+ connections / Show all」等页面噪点。
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRawText(SAMPLE_LINKEDIN_PROFILE);
                setErrorMsg(null);
              }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap"
            >
              填入示例档案
            </button>
          </div>

          <textarea
            rows={11}
            aria-label="LinkedIn 档案原始文本"
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder={`把 LinkedIn 个人档案里的文字直接粘贴到这里，例如：\n\nAlex Chen\nSenior Full-Stack Engineer | React & TypeScript\nSan Francisco, California, United States\nlinkedin.com/in/alex-chen-dev\n\nExperience\nSenior Software Engineer\nCloudScale Labs · Full-time\nMar 2022 - Present\n• Architected a real-time collaborative workspace...\n\nEducation\nUC Berkeley\nBachelor of Science, Computer Science\n2015 - 2019\n\nSkills\nTypeScript · React · Node.js`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-900 focus:border-[#0A66C2] focus:bg-white focus:outline-none"
          />

          {previewDoc && (
            <div
              data-testid="linkedin-parse-preview"
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-2 text-[11px] text-emerald-900"
            >
              <span className="inline-flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                已识别：{previewDoc.data.basic.name}
              </span>
              <span>工作经历 {previewDoc.data.experience.length} 段</span>
              <span>教育背景 {previewDoc.data.education.length} 段</span>
              <span>技能标签 {previewDoc.data.tags.length} 项</span>
              {previewDoc.data.certs.length > 0 && (
                <span>证书 {previewDoc.data.certs.length} 项</span>
              )}
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500">
              {anyAiReady
                ? '支持离线即时解析，或使用你已配置的 AI 接口进行深度分段还原。'
                : '零配置即可本地离线解析导入；若在「设置」中配置了自有 AI 接口也可启用 AI 增强。'}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLocalImport}
                disabled={loadingAi}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <FileText className="h-3.5 w-3.5 text-[#0A66C2]" />
                离线解析并导入
              </button>

              {anyAiReady && (
                <button
                  type="button"
                  onClick={handleAiImport}
                  disabled={loadingAi}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0A66C2] px-4 py-2 text-xs font-medium text-white hover:bg-[#004182] disabled:opacity-60 whitespace-nowrap"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      AI 正在拆解档案...
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
