import { ArrowDown, ArrowUp, Palette, Plus, RotateCcw } from 'lucide-react';
import {
  DENSITY_PRESETS,
  MODULE_PRESETS,
  TEMPLATE_OPTIONS,
  THEMES,
  VISUAL_STYLE_PRESETS,
} from '../data/themes';
import type {
  CustomModuleKind,
  FontStyle,
  HeaderStyle,
  KpiStyle,
  ResumeDoc,
  SectionStyle,
  TemplateId,
  ThemeId,
} from '../types/resume';
import {
  applySectionLanguage,
  blankItems,
  DEFAULT_BASE_FONT_WEIGHT,
  DEFAULT_LINE_HEIGHT,
  ENGLISH_SECTION_TITLES,
  formatFontWeightLabel,
  formatLineHeightLabel,
  MAX_BASE_FONT_WEIGHT,
  MAX_LINE_HEIGHT,
  MIN_BASE_FONT_WEIGHT,
  MIN_LINE_HEIGHT,
  nid,
  resolveBaseFontWeight,
  resolveLineHeight,
  resolvePalette,
  secTitle,
} from '../utils/resumeLogic';

interface DesignPanelProps {
  doc: ResumeDoc;
  onMutate: (mutator: (draft: ResumeDoc) => void, recordHistory?: boolean) => void;
  onSelectModuleAndEdit: (moduleKey: string) => void;
}

function TemplateMiniPreview({ id, accent }: { id: TemplateId; accent: string }) {
  if (id === 'single-column') {
    return (
      <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white p-1 flex flex-col gap-1">
        <div className="h-1.5 w-5 rounded-xs" style={{ background: accent }} />
        <div className="h-0.5 w-full bg-slate-200" />
        <div className="h-1 w-full bg-slate-200 rounded-xs" />
        <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
        <div className="h-1 w-full bg-slate-100 rounded-xs" />
      </div>
    );
  }
  if (id === 'centered-classic') {
    return (
      <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white p-1 flex flex-col items-center gap-1">
        <div className="h-0.5 w-full" style={{ background: accent }} />
        <div className="h-1.5 w-5 rounded-xs" style={{ background: accent }} />
        <div className="h-0.5 w-full bg-slate-300" />
        <div className="h-1 w-full bg-slate-200 rounded-xs" />
        <div className="h-1 w-4/5 bg-slate-200 rounded-xs self-start" />
      </div>
    );
  }
  if (id === 'timeline') {
    return (
      <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white p-1 flex flex-col gap-1">
        <div className="h-1.5 w-5 rounded-xs" style={{ background: accent }} />
        <div className="flex flex-1 gap-1 pl-0.5">
          <div className="flex flex-col items-center justify-around py-0.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            <span className="w-px flex-1 bg-slate-300" />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          </div>
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="h-1 w-full bg-slate-300 rounded-xs" />
            <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
            <div className="h-1 w-full bg-slate-200 rounded-xs" />
          </div>
        </div>
      </div>
    );
  }
  if (id === 'card-grid') {
    return (
      <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white p-1 flex flex-col gap-1">
        <div className="h-1.5 w-5 rounded-xs" style={{ background: accent }} />
        <div className="rounded-xs bg-slate-100 border border-slate-200 p-0.5 flex flex-col gap-0.5">
          <div className="h-1 w-full bg-slate-300 rounded-xs" />
          <div className="h-1 w-3/4 bg-slate-200 rounded-xs" />
        </div>
        <div className="grid grid-cols-2 gap-0.5">
          <div className="h-2.5 rounded-xs bg-slate-100 border border-slate-200" />
          <div className="h-2.5 rounded-xs bg-slate-100 border border-slate-200" />
        </div>
      </div>
    );
  }
  if (id === 'two-column') {
    return (
      <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white overflow-hidden grid grid-cols-3">
        <div style={{ background: accent }} className="p-0.5 flex flex-col gap-1">
          <div className="h-1.5 w-full bg-white/75 rounded-xs" />
          <div className="h-1 w-3/4 bg-white/45 rounded-xs" />
        </div>
        <div className="col-span-2 p-1 flex flex-col gap-1">
          <div className="h-1 w-full bg-slate-300 rounded-xs" />
          <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
          <div className="h-1 w-full bg-slate-200 rounded-xs" />
        </div>
      </div>
    );
  }
  if (id === 'two-column-reverse') {
    return (
      <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white overflow-hidden grid grid-cols-3">
        <div className="col-span-2 p-1 flex flex-col gap-1">
          <div className="h-1 w-full bg-slate-300 rounded-xs" />
          <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
          <div className="h-1 w-full bg-slate-200 rounded-xs" />
        </div>
        <div style={{ background: accent }} className="p-0.5 flex flex-col gap-1">
          <div className="h-1.5 w-full bg-white/75 rounded-xs" />
          <div className="h-1 w-3/4 bg-white/45 rounded-xs" />
        </div>
      </div>
    );
  }
  if (id === 'magazine') {
    return (
      <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white p-1 flex flex-col gap-1">
        <div className="h-2.5 w-full rounded-xs opacity-20" style={{ background: accent }} />
        <div className="grid grid-cols-5 gap-0.5 flex-1">
          <div className="col-span-3 flex flex-col gap-0.5">
            <div className="h-1 w-full bg-slate-300 rounded-xs" />
            <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
          </div>
          <div className="col-span-2 border-l border-slate-200 pl-0.5 flex flex-col gap-0.5">
            <div className="h-1 w-full bg-slate-200 rounded-xs" />
            <div className="h-1 w-3/4 bg-slate-200 rounded-xs" />
          </div>
        </div>
      </div>
    );
  }
  // top-banner-split
  return (
    <div className="h-12 w-9 shrink-0 rounded border border-slate-200 bg-white overflow-hidden flex flex-col">
      <div className="h-3.5 w-full p-0.5 flex items-center" style={{ background: accent }}>
        <div className="h-1 w-4 bg-white/80 rounded-xs" />
      </div>
      <div className="grid grid-cols-3 flex-1">
        <div className="bg-slate-100 border-r border-slate-200 p-0.5 flex flex-col gap-0.5">
          <div className="h-1 w-full bg-slate-300 rounded-xs" />
          <div className="h-1 w-3/4 bg-slate-200 rounded-xs" />
        </div>
        <div className="col-span-2 p-0.5 flex flex-col gap-0.5">
          <div className="h-1 w-full bg-slate-300 rounded-xs" />
          <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
        </div>
      </div>
    </div>
  );
}

export function DesignPanel({ doc, onMutate, onSelectModuleAndEdit }: DesignPanelProps) {
  const { meta, data } = doc;
  const activePalette = resolvePalette(meta.theme, meta.customColor);
  const supportsTopHeaderStyle =
    meta.template !== 'two-column' && meta.template !== 'two-column-reverse';

  const addCustomModule = (kind: CustomModuleKind, defaultTitle: string) => {
    const id = nid('cm');
    onMutate((d) => {
      d.data.custom.push({
        id,
        title: defaultTitle,
        kind,
        show: true,
        items: blankItems(kind),
      });
      d.meta.order.push(`custom:${id}`);
    }, true);
    onSelectModuleAndEdit(`custom:${id}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Expressive Aesthetic Style Presets */}
      <section className="space-y-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">视觉气质一键切换（简易 / 优美自由选）</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            体制/财务偏极简政务，工科/通用适合现代精致，文科/教培适合人文书卷，游戏/设计可用视觉先锋。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {VISUAL_STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.meta.fontStyle = preset.apply.fontStyle;
                  d.meta.headerStyle = preset.apply.headerStyle;
                  d.meta.sidebarStyle = preset.apply.sidebarStyle;
                  d.meta.kpiStyle = preset.apply.kpiStyle;
                  d.meta.sectionStyle = preset.apply.sectionStyle;
                  d.meta.printSafe = preset.apply.printSafe;
                }, true)
              }
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-slate-900 hover:bg-slate-50 transition-colors"
            >
              <div className="text-xs font-semibold text-slate-900">{preset.name}</div>
              <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{preset.desc}</div>
              <div className="text-[10px] text-blue-700 mt-1">{preset.bestFor}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. All 8 Distinct Layout Templates (Compact 2-Column Visual Grid) */}
      <section className="border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">8 大版式结构</h3>
          <span className="text-[10.5px] text-slate-400">无缝无损切换</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_OPTIONS.map((tpl) => {
            const active = meta.template === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                title={`${tpl.desc}（适合：${tpl.bestFor}）`}
                onClick={() =>
                  onMutate((d) => {
                    d.meta.template = tpl.id;
                  }, true)
                }
                className={`flex items-start gap-2 rounded-xl border p-2 text-left transition-colors ${
                  active
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <TemplateMiniPreview id={tpl.id} accent={activePalette.primary} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold text-slate-900 leading-tight truncate">
                    {tpl.name}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                    {tpl.bestFor}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. 10 Curated Color Themes + Custom Color Picker */}
      <section className="border-t border-slate-100 pt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">10 套主题色 + 自定义取色</h3>
          {meta.customColor && (
            <button
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.meta.customColor = undefined;
                }, true)
              }
              className="text-[11px] text-blue-600 hover:underline"
            >
              恢复预设色
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(THEMES) as ThemeId[]).map((tid) => {
            const th = THEMES[tid];
            const active = !meta.customColor && meta.theme === tid;
            return (
              <button
                key={tid}
                type="button"
                onClick={() =>
                  onMutate((d) => {
                    d.meta.theme = tid;
                    d.meta.customColor = undefined;
                  }, true)
                }
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                  active
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="flex shrink-0 items-center">
                  <span className="h-3.5 w-3.5 rounded-l-xs" style={{ background: th.primary }} />
                  <span className="h-3.5 w-2 rounded-r-xs" style={{ background: th.accent }} />
                </span>
                <span className="text-[11.5px] font-medium text-slate-800 truncate">{th.name}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Hex Color Picker */}
        <label className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-2.5 py-2 text-xs text-slate-700 cursor-pointer hover:border-slate-400">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Palette className="h-3.5 w-3.5 text-slate-500" />
            自定义品牌 / 专属主色调
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">
              {meta.customColor || activePalette.accent}
            </span>
            <input
              type="color"
              aria-label="自定义简历主题色"
              value={meta.customColor || activePalette.accent}
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.customColor = e.target.value;
                }, false)
              }
              className="h-6 w-7 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
            />
          </span>
        </label>
      </section>

      {/* 4. Fine-grained Aesthetic & Structural Details */}
      <section className="border-t border-slate-100 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-900">细节美学微调</h3>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() =>
                onMutate((d) => {
                  applySectionLanguage(d.meta, 'zh');
                }, true)
              }
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                meta.titles?.experience !== ENGLISH_SECTION_TITLES.experience
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              中文标题
            </button>
            <button
              type="button"
              onClick={() =>
                onMutate((d) => {
                  applySectionLanguage(d.meta, 'en');
                }, true)
              }
              title="一键将标准模块标题切换为英文（外企 / 外贸 / 跨境 / 出海岗适用）"
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                meta.titles?.experience === ENGLISH_SECTION_TITLES.experience
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              EN 英文标题
            </button>
          </div>
        </div>

        {/* Section Heading Style */}
        <div className="space-y-1.5">
          <span className="block text-[11px] font-medium text-slate-700">模块标题装饰风格</span>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'bar', label: '左侧竖标' },
                { id: 'underline', label: '通栏底线' },
                { id: 'pill', label: '色块标题' },
                { id: 'minimal', label: '极简圆点' },
              ] as Array<{ id: SectionStyle; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onMutate((d) => {
                    d.meta.sectionStyle = opt.id;
                  }, true)
                }
                className={`rounded-md border py-1.5 text-[11px] font-medium transition-colors ${
                  (meta.sectionStyle || 'bar') === opt.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Style */}
        <div className="space-y-1.5">
          <span className="block text-[11px] font-medium text-slate-700">字体气质</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'sans', label: '现代黑体' },
                { id: 'serif', label: '人文衬线题' },
                { id: 'classic', label: '书卷全衬线' },
              ] as Array<{ id: FontStyle; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onMutate((d) => {
                    d.meta.fontStyle = opt.id;
                  }, true)
                }
                className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                  (meta.fontStyle || 'sans') === opt.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Header Style (for all top-header layouts) */}
        {supportsTopHeaderStyle && (
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-700">页眉眉首样式</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'clean', label: '清爽白底' },
                  { id: 'tinted', label: '柔和色块' },
                  { id: 'banner', label: '深色横幅' },
                ] as Array<{ id: HeaderStyle; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onMutate((d) => {
                      d.meta.headerStyle = opt.id;
                    }, true)
                  }
                  className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                    (meta.headerStyle || 'clean') === opt.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar Style (for two-column templates) */}
        {(meta.template === 'two-column' || meta.template === 'two-column-reverse') && (
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-700">双栏侧栏底色</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onMutate((d) => {
                    d.meta.sidebarStyle = 'light';
                  }, true)
                }
                className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                  meta.sidebarStyle !== 'dark'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                浅色清爽（省墨）
              </button>
              <button
                type="button"
                onClick={() =>
                  onMutate((d) => {
                    d.meta.sidebarStyle = 'dark';
                  }, true)
                }
                className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                  meta.sidebarStyle === 'dark'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                深色高对比（视觉强）
              </button>
            </div>
          </div>
        )}

        {/* KPI Visual Style */}
        <div className="space-y-1.5">
          <span className="block text-[11px] font-medium text-slate-700">
            量化亮点条样式（如填写了亮点指标）
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'divider', label: '极简细竖线' },
                { id: 'accent', label: '主题柔和微卡' },
                { id: 'card', label: '浅灰中性框' },
                { id: 'inline', label: '紧凑纯文本' },
              ] as Array<{ id: KpiStyle; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onMutate((d) => {
                    d.meta.kpiStyle = opt.id;
                  }, true)
                }
                className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                  (meta.kpiStyle || 'divider') === opt.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Density & Print Switches */}
      <section className="border-t border-slate-100 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">排版密度与打印保护</h3>
          <button
            type="button"
            onClick={() =>
              onMutate((d) => {
                d.meta.fs = 12;
                d.meta.fw = DEFAULT_BASE_FONT_WEIGHT;
                d.meta.lh = DEFAULT_LINE_HEIGHT;
                d.meta.pad = 30;
              }, true)
            }
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900"
          >
            <RotateCcw className="h-3 w-3" />
            恢复默认
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {DENSITY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.meta.fs = preset.fs;
                  d.meta.lh = preset.lh;
                  d.meta.pad = preset.pad;
                }, true)
              }
              className="rounded-md border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 pt-1">
          <div>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <label htmlFor="range-fs">正文字号</label>
              <span className="font-mono tabular-nums">{meta.fs.toFixed(1)} px</span>
            </div>
            <input
              id="range-fs"
              type="range"
              min={10}
              max={14}
              step={0.2}
              value={meta.fs}
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.fs = Number(e.target.value);
                }, false)
              }
              className="w-full accent-slate-900"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <label htmlFor="range-fw">整体字重</label>
              <span className="font-mono tabular-nums">
                {resolveBaseFontWeight(meta.fw)} · {formatFontWeightLabel(meta.fw)}
              </span>
            </div>
            <input
              id="range-fw"
              type="range"
              min={MIN_BASE_FONT_WEIGHT}
              max={MAX_BASE_FONT_WEIGHT}
              step={50}
              value={resolveBaseFontWeight(meta.fw)}
              aria-label="整体字重"
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.fw = Number(e.target.value);
                }, false)
              }
              className="w-full accent-slate-900"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-400 tabular-nums">
              <span>300 纤细</span>
              <span>500 稳重</span>
              <span>700 粗体</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <label htmlFor="range-lh">行高与纵向间距</label>
              <span className="font-mono tabular-nums">
                {resolveLineHeight(meta.lh).toFixed(2)}× · {formatLineHeightLabel(meta.lh)}
              </span>
            </div>
            <input
              id="range-lh"
              type="range"
              min={MIN_LINE_HEIGHT}
              max={MAX_LINE_HEIGHT}
              step={0.01}
              value={resolveLineHeight(meta.lh)}
              aria-label="行高与纵向间距"
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.lh = resolveLineHeight(Number(e.target.value));
                }, false)
              }
              className="w-full accent-slate-900"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-400 tabular-nums">
              <span>1.20 紧凑</span>
              <span>1.60 均衡</span>
              <span>2.00 宽松</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <label htmlFor="range-pad">页面边距</label>
              <span className="font-mono tabular-nums">{meta.pad} px</span>
            </div>
            <input
              id="range-pad"
              type="range"
              min={18}
              max={42}
              step={2}
              value={meta.pad}
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.pad = Number(e.target.value);
                }, false)
              }
              className="w-full accent-slate-900"
            />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 cursor-pointer">
            <div>
              <div className="font-medium text-slate-800">黑白激光打印自动省墨保护</div>
              <div className="text-[11px] text-slate-500">
                屏幕放心用深色横幅/侧栏，打印时自动去重色块；需彩色原样打印可关闭
              </div>
            </div>
            <input
              type="checkbox"
              checked={meta.printSafe !== false}
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.printSafe = e.target.checked;
                }, true)
              }
              className="rounded border-slate-300 text-slate-900"
            />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 cursor-pointer">
            <span>智能自动压进 1 页 A4</span>
            <input
              type="checkbox"
              checked={meta.autofit}
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.autofit = e.target.checked;
                }, true)
              }
              className="rounded border-slate-300 text-slate-900"
            />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 cursor-pointer">
            <span>未传照片时仍显示证件照占位框</span>
            <input
              type="checkbox"
              checked={meta.showPhotoSlot}
              onChange={(e) =>
                onMutate((d) => {
                  d.meta.showPhotoSlot = e.target.checked;
                }, true)
              }
              className="rounded border-slate-300 text-slate-900"
            />
          </label>
        </div>
      </section>

      {/* 6. Module Order & Industry Module Library */}
      <section className="border-t border-slate-100 pt-4 space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-900">模块排序与显隐</h3>
        <div className="space-y-1.5">
          {meta.order.map((key, idx) => {
            const isCustom = key.startsWith('custom:');
            const cm = isCustom ? data.custom.find((c) => c.id === key.slice(7)) : null;
            if (isCustom && !cm) return null;
            const title = isCustom ? cm!.title : secTitle(meta, key);
            const shown = isCustom ? cm!.show : !meta.hidden?.[key];

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shown}
                    onChange={(e) => {
                      const nextShown = e.target.checked;
                      onMutate((d) => {
                        if (isCustom) {
                          const target = d.data.custom.find((c) => c.id === key.slice(7));
                          if (target) target.show = nextShown;
                        } else {
                          d.meta.hidden[key] = !nextShown;
                        }
                      }, true);
                    }}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <span className={`truncate ${shown ? '' : 'text-slate-400 line-through'}`}>
                    {title}
                  </span>
                </label>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    aria-label={`上移 ${title}`}
                    onClick={() =>
                      onMutate((d) => {
                        const arr = d.meta.order;
                        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                      }, true)
                    }
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === meta.order.length - 1}
                    aria-label={`下移 ${title}`}
                    onClick={() =>
                      onMutate((d) => {
                        const arr = d.meta.order;
                        [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                      }, true)
                    }
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* One-Click Industry Modules */}
        <div className="pt-2">
          <div className="text-[11px] font-medium text-slate-500 mb-1.5">一键添加行业常用模块</div>
          <div className="grid grid-cols-1 gap-1.5">
            {MODULE_PRESETS.map((mp) => (
              <button
                key={mp.id}
                type="button"
                onClick={() => addCustomModule(mp.kind, mp.title)}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Plus className="h-3 w-3 text-slate-500" />
                  {mp.title}
                </span>
                <span className="text-[10.5px] text-slate-400">{mp.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
