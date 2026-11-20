import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileCheck2,
  Printer,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { PdfPreflightCategory, PdfPreflightReport } from '../types/resume';

interface PdfPreflightModalProps {
  open: boolean;
  report: PdfPreflightReport | null;
  pdfTitle: string;
  isDesktop?: boolean;
  onClose: () => void;
  onFixModule: (moduleKey: string, guideHint: string) => void;
  onProceedExport: () => void;
}

const CATEGORY_LABELS: Record<PdfPreflightCategory, string> = {
  required: '必填项',
  length: '内容长度',
  placeholder: '占位符残留',
  duplicate: '内容重复',
  layout: '版面分页',
};

export function PdfPreflightModal({
  open,
  report,
  pdfTitle,
  isDesktop = false,
  onClose,
  onFixModule,
  onProceedExport,
}: PdfPreflightModalProps) {
  if (!open || !report) return null;

  const firstIssue = report.issues[0] || null;
  const isReady = report.status === 'ready';
  const isBlocked = report.status === 'blocked';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preflight-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isReady
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isBlocked
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isReady ? (
                <FileCheck2 className="h-4.5 w-4.5" />
              ) : isBlocked ? (
                <ShieldAlert className="h-4.5 w-4.5" />
              ) : (
                <AlertTriangle className="h-4.5 w-4.5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="pdf-preflight-title" className="text-sm font-bold text-slate-900">
                  导出 PDF 前自动检查
                </h2>
                <span
                  data-testid="pdf-preflight-status"
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    isReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isBlocked
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isReady
                    ? '全部通过 · 可安心导出'
                    : isBlocked
                      ? `发现 ${report.errorCount} 项必改${report.warningCount > 0 ? ` · ${report.warningCount} 项建议` : ''}`
                      : `发现 ${report.warningCount} 项可优化提示`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                自动扫描必填项、正文长度、占位符与重复内容
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭导出检查弹窗"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 studio-scroll">
          {/* 4-Pillar Automated Scan Summary Grid */}
          <div
            data-testid="pdf-preflight-checklist"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {report.checklist.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border px-3 py-2.5 ${
                  item.passed
                    ? 'border-emerald-200/80 bg-emerald-50/50'
                    : 'border-amber-200/90 bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  {item.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </div>
                <div
                  className={`mt-1 text-[11px] truncate ${
                    item.passed ? 'text-emerald-800/85' : 'text-amber-900/90'
                  }`}
                >
                  {item.summary}
                </div>
              </div>
            ))}
          </div>

          {/* Ready State OR Detailed Issue Guide List */}
          {isReady ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                所有自动检查项均已通过，简历具备投递级完整度！
              </div>
              <p className="text-xs leading-relaxed text-emerald-800/85">
                当前共 <strong className="font-mono">{report.charCount}</strong> 字，排版为{' '}
                <strong className="font-mono">{report.pageCount}</strong> 页 A4（填充度约{' '}
                <strong className="font-mono">{report.fillPct}%</strong>），未检测到未替换占位符或重复内容。
              </p>
            </div>
          ) : (
            <div className="space-y-2.5" data-testid="pdf-preflight-issues">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-900">
                  待处理问题与修改引导
                  <span className="hidden sm:inline">（点击右侧按钮直达对应模块）</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-400 font-mono">
                  共 {report.issues.length} 项
                </span>
              </div>

              {report.issues.map((issue) => {
                const isErr = issue.severity === 'error';
                return (
                  <div
                    key={issue.id}
                    className={`rounded-xl border p-3.5 space-y-2 ${
                      isErr
                        ? 'border-red-200 bg-red-50/40'
                        : 'border-amber-200 bg-amber-50/35'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span
                            className={`font-semibold ${
                              isErr ? 'text-red-700' : 'text-amber-800'
                            }`}
                          >
                            {isErr ? '必改项' : '建议优化'}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="rounded bg-white/80 border border-slate-200/80 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600">
                            {CATEGORY_LABELS[issue.category]}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900">{issue.title}</h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => onFixModule(issue.moduleKey, issue.guide)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap"
                      >
                        <span>{issue.actionLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-[11.5px] leading-relaxed text-slate-600">{issue.detail}</p>

                    {issue.samples && issue.samples.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {issue.samples.map((s, idx) => (
                          <span
                            key={idx}
                            className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10.5px] text-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="rounded-lg bg-white/85 border border-slate-200/70 px-2.5 py-1.5 text-[11px] text-slate-700">
                      <span className="font-semibold text-blue-700">引导提示：</span>
                      {issue.guide}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Print / Desktop Export Quick Hint */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-600 space-y-0.5">
            <div className="font-medium text-slate-800">
              输出文件名：<span className="font-mono text-slate-700">{pdfTitle}.pdf</span>
            </div>
            <div>
              {isDesktop
                ? '桌面版提示：点击导出后将直接弹出系统保存框，静默生成高清零边距 A4 矢量 PDF（无需浏览器打印设置）。'
                : '打印提示：在浏览器打印弹窗中选择「另存为 PDF」，勾选「背景图形」并取消「页眉和页脚」，即可获得高清矢量简历。'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/70 px-4 sm:px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            取消
          </button>

          <div className="flex items-center gap-2">
            {!isReady && firstIssue && (
              <button
                type="button"
                onClick={onProceedExport}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5" />
                仍要导出 PDF
              </button>
            )}

            {isReady || !firstIssue ? (
              <button
                type="button"
                onClick={onProceedExport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5" />
                立即导出 PDF
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onFixModule(firstIssue.moduleKey, firstIssue.guide)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <span>前往首项问题修改</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
