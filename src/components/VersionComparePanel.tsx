import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  CopyPlus,
  Eye,
  GitCompareArrows,
  Palette,
  PencilLine,
} from 'lucide-react';
import type { DiffFieldEntry, DiffSegment, DiffStatus, ResumeDoc } from '../types/resume';
import { compareResumeVersions } from '../utils/versionDiff';

interface VersionComparePanelProps {
  resumes: ResumeDoc[];
  activeId: string;
  preferredPair?: { baseId: string; targetId: string; nonce: number } | null;
  onSelectResume: (id: string) => void;
  onDuplicateResume: () => void;
  onJumpToModule: (moduleKey: string) => void;
}

const STATUS_META: Record<
  DiffStatus,
  { label: string; badgeClass: string; borderClass: string }
> = {
  modified: {
    label: '有改动',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-slate-200',
  },
  added: {
    label: '新增',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-200/90',
  },
  removed: {
    label: '已删除',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    borderClass: 'border-rose-200/90',
  },
  unchanged: {
    label: '无变化',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    borderClass: 'border-slate-200/80',
  },
};

function DiffSegmentsView({ segments }: { segments: DiffSegment[] }) {
  return (
    <div className="text-[12px] leading-relaxed text-slate-700 break-words whitespace-pre-wrap">
      {segments.map((seg, idx) => {
        if (seg.kind === 'added') {
          return (
            <ins
              key={idx}
              className="no-underline rounded-[3px] bg-emerald-100/90 px-0.5 font-medium text-emerald-900"
            >
              {seg.text}
            </ins>
          );
        }
        if (seg.kind === 'removed') {
          return (
            <del
              key={idx}
              className="rounded-[3px] bg-rose-100/90 px-0.5 text-rose-800 line-through decoration-rose-500/80"
            >
              {seg.text}
            </del>
          );
        }
        return <span key={idx}>{seg.text}</span>;
      })}
    </div>
  );
}

function DiffFieldRow({ field }: { field: DiffFieldEntry }) {
  const rowTone =
    field.status === 'added'
      ? 'border-l-2 border-l-emerald-500 bg-emerald-50/35 pl-2.5'
      : field.status === 'removed'
        ? 'border-l-2 border-l-rose-400 bg-rose-50/35 pl-2.5'
        : field.status === 'modified'
          ? 'border-l-2 border-l-blue-400 bg-slate-50/60 pl-2.5'
          : 'border-l-2 border-l-slate-200 pl-2.5';

  return (
    <div className={`rounded-r-lg py-1.5 pr-2 ${rowTone}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-500 truncate">{field.label}</span>
        {field.status !== 'unchanged' && (
          <span className="shrink-0 font-mono text-[10px] tabular-nums">
            {field.addedChars > 0 && (
              <span className="text-emerald-700">+{field.addedChars}</span>
            )}
            {field.addedChars > 0 && field.removedChars > 0 && (
              <span className="mx-1 text-slate-300">/</span>
            )}
            {field.removedChars > 0 && (
              <span className="text-rose-600">-{field.removedChars}</span>
            )}
          </span>
        )}
      </div>
      <DiffSegmentsView segments={field.segments} />
    </div>
  );
}

export function VersionComparePanel({
  resumes,
  activeId,
  preferredPair,
  onSelectResume,
  onDuplicateResume,
  onJumpToModule,
}: VersionComparePanelProps) {
  const [baseId, setBaseId] = useState<string>(() => {
    if (preferredPair?.baseId && resumes.some((r) => r.id === preferredPair.baseId)) {
      return preferredPair.baseId;
    }
    const other = resumes.find((r) => r.id !== activeId);
    return other ? other.id : activeId;
  });
  const [targetId, setTargetId] = useState<string>(() => {
    if (preferredPair?.targetId && resumes.some((r) => r.id === preferredPair.targetId)) {
      return preferredPair.targetId;
    }
    return activeId;
  });
  const [onlyChanged, setOnlyChanged] = useState<boolean>(true);

  useEffect(() => {
    if (!preferredPair) return;
    if (resumes.some((r) => r.id === preferredPair.baseId)) {
      setBaseId(preferredPair.baseId);
    }
    if (resumes.some((r) => r.id === preferredPair.targetId)) {
      setTargetId(preferredPair.targetId);
    }
  }, [preferredPair, resumes]);

  // Keep selected IDs valid whenever resumes list changes (e.g. create/delete/duplicate)
  useEffect(() => {
    if (resumes.length === 0) return;
    const validIds = new Set(resumes.map((r) => r.id));
    const nextTarget = validIds.has(targetId) ? targetId : activeId;
    let nextBase = validIds.has(baseId) ? baseId : '';
    if (!nextBase || (resumes.length > 1 && nextBase === nextTarget && !validIds.has(baseId))) {
      nextBase = resumes.find((r) => r.id !== nextTarget)?.id || nextTarget;
    }
    if (nextTarget !== targetId) setTargetId(nextTarget);
    if (nextBase !== baseId) setBaseId(nextBase);
  }, [resumes, activeId, baseId, targetId]);

  const baseDoc = useMemo(
    () => resumes.find((r) => r.id === baseId) || resumes[0],
    [resumes, baseId]
  );
  const targetDoc = useMemo(
    () => resumes.find((r) => r.id === targetId) || resumes[resumes.length - 1] || resumes[0],
    [resumes, targetId]
  );

  const report = useMemo(() => {
    if (!baseDoc || !targetDoc) return null;
    return compareResumeVersions(baseDoc, targetDoc);
  }, [baseDoc, targetDoc]);

  const handleSwap = () => {
    setBaseId(targetId);
    setTargetId(baseId);
  };

  if (resumes.length < 2) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center space-y-2.5">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-900">至少需要 2 份简历版本才能对比</h3>
            <p className="text-[11px] leading-relaxed text-slate-500">
              你可以复制当前简历新建一版并针对岗位微调，随后在此处逐项高亮对比文字增删与量化指标变化。
            </p>
          </div>
          <button
            type="button"
            onClick={onDuplicateResume}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800"
          >
            <CopyPlus className="h-3.5 w-3.5" />
            复制当前版本以开始对比
          </button>
        </div>
      </div>
    );
  }

  if (!report || !baseDoc || !targetDoc) return null;

  const visibleSections = onlyChanged
    ? report.sections.filter((s) => s.status !== 'unchanged')
    : report.sections;

  const quantDelta = report.targetQuantCount - report.baseQuantCount;

  return (
    <div className="space-y-4">
      {/* Version Pair Picker */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-700">选择对比版本</span>
          <button
            type="button"
            onClick={handleSwap}
            aria-label="交换对比版本"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700"
          >
            <ArrowLeftRight className="h-3 w-3" />
            交换 A / B
          </button>
        </div>

        {/* Version A (Base) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="compare-base-select"
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-rose-100 font-mono text-[10px] font-bold text-rose-700">
                A
              </span>
              基准版本（参考旧版）
            </label>
            {activeId === baseDoc.id ? (
              <span className="text-[10.5px] font-medium text-blue-600">当前画布预览中</span>
            ) : (
              <button
                type="button"
                onClick={() => onSelectResume(baseDoc.id)}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-500 hover:text-blue-700"
              >
                <Eye className="h-3 w-3" />
                画布查看 A
              </button>
            )}
          </div>
          <select
            id="compare-base-select"
            aria-label="选择基准版本 A"
            value={baseDoc.id}
            onChange={(e) => setBaseId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Version B (Target) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="compare-target-select"
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-emerald-100 font-mono text-[10px] font-bold text-emerald-700">
                B
              </span>
              对比版本（修改后新版）
            </label>
            {activeId === targetDoc.id ? (
              <span className="text-[10.5px] font-medium text-blue-600">当前画布预览中</span>
            ) : (
              <button
                type="button"
                onClick={() => onSelectResume(targetDoc.id)}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-500 hover:text-blue-700"
              >
                <Eye className="h-3 w-3" />
                画布查看 B
              </button>
            )}
          </div>
          <select
            id="compare-target-select"
            aria-label="选择对比版本 B"
            value={targetDoc.id}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quantitative Evaluation Strip */}
      <div
        data-testid="version-compare-summary"
        className="grid grid-cols-3 gap-2"
      >
        <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10.5px] text-slate-500">文字增删</div>
          <div className="mt-1 flex items-baseline gap-1 font-mono text-xs font-bold tabular-nums">
            <span className="text-emerald-700">+{report.addedChars}</span>
            <span className="text-slate-300">/</span>
            <span className="text-rose-600">-{report.removedChars}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10.5px] text-slate-500">总字数变化</div>
          <div className="mt-1 font-mono text-xs font-bold tabular-nums text-slate-900">
            {report.baseCharCount}→{report.targetCharCount}
          </div>
          <div
            className={`text-[10px] font-mono tabular-nums ${
              report.charDelta > 0
                ? 'text-emerald-700'
                : report.charDelta < 0
                  ? 'text-rose-600'
                  : 'text-slate-400'
            }`}
          >
            {report.charDelta > 0 ? `+${report.charDelta}` : report.charDelta} 字
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10.5px] text-slate-500">量化指标数</div>
          <div className="mt-1 font-mono text-xs font-bold tabular-nums text-slate-900">
            {report.baseQuantCount}→{report.targetQuantCount}
          </div>
          <div
            className={`text-[10px] font-mono tabular-nums ${
              quantDelta > 0
                ? 'text-emerald-700'
                : quantDelta < 0
                  ? 'text-amber-700'
                  : 'text-slate-400'
            }`}
          >
            {quantDelta > 0 ? `+${quantDelta} 项` : quantDelta < 0 ? `${quantDelta} 项` : '持平'}
          </div>
        </div>
      </div>

      {/* Layout/Style Meta Changes */}
      {report.styleChanges.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Palette className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            外观与版式差异
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {report.styleChanges.map((item, idx) => (
              <span key={idx}>{item}</span>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Legend Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-700 select-none">
          <input
            type="checkbox"
            checked={onlyChanged}
            onChange={(e) => setOnlyChanged(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          仅看有差异（{report.changedSectionsCount}/{report.totalSectionsCount}）
        </label>

        <div className="flex items-center gap-2 text-[10.5px]">
          <span className="inline-flex items-center gap-1 text-emerald-800">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-200 border border-emerald-300" />
            新增
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-rose-200 border border-rose-300" />
            删除
          </span>
        </div>
      </div>

      {/* Same version / No diff empty state */}
      {report.sameDoc ? (
        <div
          data-testid="version-compare-empty"
          className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 space-y-1"
        >
          <div className="font-semibold">当前 A 与 B 选择了同一份简历</div>
          <p className="text-[11px] leading-relaxed text-amber-800/90">
            请在上方下拉框中选择另一份不同版本，即可查看逐句增删高亮。
          </p>
        </div>
      ) : !report.hasChanges || (onlyChanged && visibleSections.length === 0) ? (
        <div
          data-testid="version-compare-empty"
          className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            两份版本的文字内容完全一致
          </div>
          <p className="text-[11px] leading-relaxed text-emerald-800/85">
            {report.styleChanges.length > 0
              ? '文字内容暂无差异，仅在上方列出的外观/版式配置上有所不同。'
              : '修改其中一个版本的内容后，这里会实时高亮显示每一处文字增删。'}
          </p>
        </div>
      ) : (
        /* Section-by-Section Diff Cards */
        <div className="space-y-3" data-testid="version-compare-sections">
          {visibleSections.map((section) => {
            const meta = STATUS_META[section.status];
            const fieldsToRender = onlyChanged
              ? section.fields.filter((f) => f.status !== 'unchanged')
              : section.fields;

            return (
              <section
                key={section.moduleKey}
                className={`rounded-xl border bg-white p-3 space-y-2.5 ${meta.borderClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {section.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {(section.addedChars > 0 || section.removedChars > 0) && (
                      <span className="font-mono text-[10.5px] tabular-nums">
                        {section.addedChars > 0 && (
                          <span className="text-emerald-700">+{section.addedChars}</span>
                        )}
                        {section.addedChars > 0 && section.removedChars > 0 && (
                          <span className="mx-0.5 text-slate-300">/</span>
                        )}
                        {section.removedChars > 0 && (
                          <span className="text-rose-600">-{section.removedChars}</span>
                        )}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeId !== targetDoc.id) {
                          onSelectResume(targetDoc.id);
                        }
                        onJumpToModule(section.moduleKey);
                      }}
                      title={`切到「${targetDoc.name}」编辑此模块`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap"
                    >
                      <PencilLine className="h-3 w-3" />
                      编辑 B
                    </button>
                  </div>
                </div>

                {fieldsToRender.length > 0 ? (
                  <div className="space-y-2">
                    {fieldsToRender.map((field) => (
                      <DiffFieldRow key={field.id} field={field} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">该模块内容在两个版本中保持一致。</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
