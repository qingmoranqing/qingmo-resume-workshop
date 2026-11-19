import { ArrowRight, Compass, TrendingUp, X } from 'lucide-react';
import type { RadarDimensionScore, ResumeCompetitivenessReport } from '../types/resume';

interface CompetitivenessRadarPanelProps {
  open: boolean;
  docName: string;
  report: ResumeCompetitivenessReport;
  onClose: () => void;
  onJumpToModule: (moduleKey: string) => void;
}

const CX = 132;
const CY = 113;
const RADIUS = 56;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1];

// Fixed 4-axis order: Top (行业契合度), Right (资历深度), Bottom (项目丰富度), Left (描述专业度)
const AXIS_VECTORS: Array<{
  dx: number;
  dy: number;
  labelX: number;
  labelY: number;
  scoreY: number;
  anchor: 'middle' | 'start' | 'end';
}> = [
  { dx: 0, dy: -1, labelX: CX, labelY: 22, scoreY: 37, anchor: 'middle' },
  { dx: 1, dy: 0, labelX: CX + RADIUS + 10, labelY: CY - 4, scoreY: CY + 12, anchor: 'start' },
  { dx: 0, dy: 1, labelX: CX, labelY: CY + RADIUS + 20, scoreY: CY + RADIUS + 35, anchor: 'middle' },
  { dx: -1, dy: 0, labelX: CX - RADIUS - 10, labelY: CY - 4, scoreY: CY + 12, anchor: 'end' },
];

function scoreTone(score: number): {
  text: string;
  bar: string;
  badge: string;
} {
  if (score >= 82) {
    return {
      text: 'text-emerald-700',
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    };
  }
  if (score >= 65) {
    return {
      text: 'text-blue-700',
      bar: 'bg-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    };
  }
  if (score >= 45) {
    return {
      text: 'text-amber-700',
      bar: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    };
  }
  return {
    text: 'text-rose-700',
    bar: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
  };
}

function buildDiamondPoints(scale: number): string {
  return AXIS_VECTORS.map(
    (v) => `${(CX + v.dx * RADIUS * scale).toFixed(1)},${(CY + v.dy * RADIUS * scale).toFixed(1)}`,
  ).join(' ');
}

function buildDataPoints(dimensions: RadarDimensionScore[]): Array<{ x: number; y: number }> {
  return AXIS_VECTORS.map((v, idx) => {
    const rawScore = dimensions[idx]?.score ?? 0;
    // Keep a tiny 8% floor visually so zero-score vertices stay readable near center
    const ratio = Math.max(0.08, Math.min(1, rawScore / 100));
    return {
      x: Number((CX + v.dx * RADIUS * ratio).toFixed(1)),
      y: Number((CY + v.dy * RADIUS * ratio).toFixed(1)),
    };
  });
}

export function CompetitivenessRadarPanel({
  open,
  docName,
  report,
  onClose,
  onJumpToModule,
}: CompetitivenessRadarPanelProps) {
  if (!open) return null;

  const dataCoords = buildDataPoints(report.dimensions);
  const dataPolygon = dataCoords.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const overallTone = scoreTone(report.overallScore);
  const yearsText =
    report.totalExpMonths === 0
      ? '待补充年限'
      : report.totalExpMonths >= 12
        ? `约 ${(report.totalExpMonths / 12).toFixed(1)} 年`
        : `约 ${report.totalExpMonths} 个月`;

  return (
    <>
      {/* Mobile & compact-desktop overlay backdrop */}
      <div
        onClick={onClose}
        className="no-print fixed inset-0 top-14 z-20 bg-slate-900/30 xl:hidden"
        aria-hidden="true"
      />

      {/* RIGHT-ANCHORED COMPETITIVENESS RADAR PANEL */}
      <aside
        aria-label="简历竞争力雷达图"
        data-testid="competitiveness-radar-panel"
        className="no-print fixed inset-y-0 right-0 top-14 z-30 flex w-[88vw] max-w-[300px] flex-col border-l border-slate-200 bg-white shadow-xl xl:static xl:top-0 xl:z-10 xl:w-[276px] xl:shrink-0 xl:shadow-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3.5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                简历竞争力雷达
              </h2>
            </div>
            <p className="mt-0.5 text-[10.5px] text-slate-500 truncate" title={docName}>
              实时解析：{docName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="收起竞争力雷达"
            title="收起竞争力雷达（可在底部工具栏重新打开）"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 studio-scroll">
          {/* Composite Score Hero Strip */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/75 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="radar-overall-score"
                  className={`text-2xl font-bold font-mono tabular-nums leading-none ${overallTone.text}`}
                >
                  {report.overallScore}
                </span>
                <span className="text-[11px] font-mono text-slate-400">/ 100</span>
              </div>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10.5px] font-semibold ${overallTone.badge}`}
              >
                {report.tierLabel}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-500 border-t border-slate-200/70 pt-1.5">
              <span>量化表达率 {report.quantifiedRatioPct}%</span>
              <span>资历时长 {yearsText}</span>
            </div>
          </div>

          {/* 4-Axis SVG Radar Chart */}
          <div className="rounded-xl border border-slate-200/80 bg-white px-1 py-1.5">
            <svg
              viewBox="0 0 264 226"
              role="img"
              aria-label={`简历竞争力四维雷达图：综合 ${report.overallScore} 分，${report.dimensions
                .map((d) => `${d.label} ${d.score} 分`)
                .join('，')}`}
              data-testid="competitiveness-radar-svg"
              className="w-full h-auto block select-none"
            >
              {/* Concentric diamond grid rings */}
              {GRID_LEVELS.map((lvl, idx) => (
                <polygon
                  key={lvl}
                  points={buildDiamondPoints(lvl)}
                  fill={idx === GRID_LEVELS.length - 1 ? '#f8fafc' : 'none'}
                  stroke="#e2e8f0"
                  strokeWidth={idx === GRID_LEVELS.length - 1 ? 1.2 : 0.9}
                  strokeDasharray={idx < GRID_LEVELS.length - 1 ? '2.5 2.5' : undefined}
                />
              ))}

              {/* Crosshair axis lines */}
              {AXIS_VECTORS.map((v, idx) => (
                <line
                  key={idx}
                  x1={CX}
                  y1={CY}
                  x2={CX + v.dx * RADIUS}
                  y2={CY + v.dy * RADIUS}
                  stroke="#cbd5e1"
                  strokeWidth={0.9}
                />
              ))}

              {/* Active score polygon */}
              <polygon
                data-testid="radar-data-polygon"
                points={dataPolygon}
                fill="rgba(37, 99, 235, 0.16)"
                stroke="#2563eb"
                strokeWidth={2}
                strokeLinejoin="round"
                className="transition-all duration-300"
              />

              {/* Data vertex dots */}
              {dataCoords.map((pt, idx) => {
                const dim = report.dimensions[idx];
                const isWeakest = dim?.key === report.weakest.key;
                return (
                  <circle
                    key={dim?.key || idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isWeakest ? 4.2 : 3.6}
                    fill={isWeakest ? '#d97706' : '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth={1.6}
                    className="transition-all duration-300"
                  />
                );
              })}

              {/* 4 Dimension Labels + Live Scores */}
              {AXIS_VECTORS.map((v, idx) => {
                const dim = report.dimensions[idx];
                if (!dim) return null;
                return (
                  <g key={dim.key}>
                    <text
                      x={v.labelX}
                      y={v.labelY}
                      textAnchor={v.anchor}
                      fill="#334155"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {dim.label}
                    </text>
                    <text
                      x={v.labelX}
                      y={v.scoreY}
                      textAnchor={v.anchor}
                      fill={dim.score >= 82 ? '#047857' : dim.score >= 65 ? '#1d4ed8' : dim.score >= 45 ? '#b45309' : '#be123c'}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {dim.score}分
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 4-Dimension Interactive Breakdown List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px] font-medium text-slate-500 px-0.5">
              <span>四维明细（点击定位编辑）</span>
              <span>满分 100</span>
            </div>
            {report.dimensions.map((dim) => {
              const tone = scoreTone(dim.score);
              const isWeakest = dim.key === report.weakest.key;
              return (
                <button
                  key={dim.key}
                  type="button"
                  data-testid="radar-dimension-row"
                  data-dim-key={dim.key}
                  onClick={() => onJumpToModule(dim.jumpModule)}
                  className={`w-full text-left rounded-lg border px-2.5 py-2 transition-colors ${
                    isWeakest
                      ? 'border-amber-200/90 bg-amber-50/40 hover:bg-amber-50/80'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11.5px] font-semibold text-slate-800 truncate">
                        {dim.label}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{dim.level}</span>
                    </div>
                    <span className={`font-mono text-xs font-bold tabular-nums shrink-0 ${tone.text}`}>
                      {dim.score}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${tone.bar}`}
                      style={{ width: `${Math.max(4, dim.score)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500 break-words">
                    {dim.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Priority Improvement Action Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
              <TrendingUp className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                优先提升：{report.weakest.label}（{report.weakest.score} 分）
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">{report.weakest.tip}</p>
            <button
              type="button"
              onClick={() => onJumpToModule(report.weakest.jumpModule)}
              className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <span>前往优化「{report.weakest.label}」</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
