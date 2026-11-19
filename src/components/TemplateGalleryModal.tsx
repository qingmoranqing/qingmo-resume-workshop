import { useEffect, useState } from 'react';
import { LayoutGrid, Paintbrush, Plus, Search, Sparkles, X } from 'lucide-react';
import {
  INDUSTRY_CATEGORIES,
  TEMPLATE_LIBRARY,
  type TemplateCatalogEntry,
} from '../data/templateLibrary';
import type { IndustryCategory, ResumeDoc } from '../types/resume';
import { resolvePalette, searchTemplates } from '../utils/resumeLogic';

interface TemplateGalleryModalProps {
  open: boolean;
  onClose: () => void;
  onUseAsNewResume: (tplDoc: ResumeDoc, label: string) => void;
  onApplyStyleOnly: (tplDoc: ResumeDoc, label: string) => void;
  onCreateCustomRole: (roleName: string) => void;
}

function TemplateCardThumbnail({ entry }: { entry: TemplateCatalogEntry }) {
  const { meta } = entry.doc;
  const palette = resolvePalette(meta.theme, meta.customColor);
  const isDarkSide = meta.sidebarStyle === 'dark';

  if (meta.template === 'two-column' || meta.template === 'two-column-reverse') {
    const sideEl = (
      <div
        className="p-2 flex flex-col gap-1.5"
        style={{
          background: isDarkSide ? palette.sideBg : '#f8fafc',
          borderRight:
            !isDarkSide && meta.template === 'two-column' ? '1px solid #e2e8f0' : undefined,
          borderLeft:
            !isDarkSide && meta.template === 'two-column-reverse' ? '1px solid #e2e8f0' : undefined,
        }}
      >
        <div
          className="h-2.5 w-10 rounded-xs"
          style={{ background: isDarkSide ? '#ffffff' : palette.primary }}
        />
        <div
          className="h-1 w-full rounded-xs"
          style={{ background: isDarkSide ? 'rgba(255,255,255,0.45)' : '#cbd5e1' }}
        />
        <div className="mt-1 space-y-1">
          <div
            className="h-1 w-4/5 rounded-xs"
            style={{ background: isDarkSide ? 'rgba(255,255,255,0.35)' : '#cbd5e1' }}
          />
          <div
            className="h-1 w-3/5 rounded-xs"
            style={{ background: isDarkSide ? 'rgba(255,255,255,0.28)' : '#e2e8f0' }}
          />
        </div>
      </div>
    );
    const mainEl = (
      <div className="col-span-2 p-2.5 flex flex-col gap-1.5 bg-white">
        <div className="h-1.5 w-12 rounded-xs" style={{ background: palette.accent }} />
        <div className="h-1 w-full bg-slate-200 rounded-xs" />
        <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
        <div className="mt-1 h-1.5 w-10 rounded-xs" style={{ background: palette.primary }} />
        <div className="h-1 w-full bg-slate-100 rounded-xs" />
        <div className="h-1 w-4/5 bg-slate-100 rounded-xs" />
      </div>
    );
    return (
      <div className="h-28 w-full rounded-lg border border-slate-200 bg-white overflow-hidden grid grid-cols-3 shadow-2xs">
        {meta.template === 'two-column' ? (
          <>
            {sideEl}
            {mainEl}
          </>
        ) : (
          <>
            {mainEl}
            {sideEl}
          </>
        )}
      </div>
    );
  }

  if (meta.template === 'top-banner-split') {
    return (
      <div className="h-28 w-full rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col shadow-2xs">
        <div className="px-2.5 py-2 flex flex-col gap-1" style={{ background: palette.primary }}>
          <div className="h-2 w-12 rounded-xs bg-white" />
          <div className="h-1 w-3/4 rounded-xs bg-white/60" />
        </div>
        <div className="grid grid-cols-3 flex-1">
          <div className="bg-slate-50 border-r border-slate-200 p-2 flex flex-col gap-1">
            <div className="h-1 w-8 rounded-xs" style={{ background: palette.accent }} />
            <div className="h-1 w-full bg-slate-200 rounded-xs" />
            <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
          </div>
          <div className="col-span-2 p-2 flex flex-col gap-1">
            <div className="h-1.5 w-10 rounded-xs" style={{ background: palette.primary }} />
            <div className="h-1 w-full bg-slate-200 rounded-xs" />
            <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
            <div className="h-1 w-3/4 bg-slate-100 rounded-xs" />
          </div>
        </div>
      </div>
    );
  }

  if (meta.template === 'timeline') {
    return (
      <div className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col gap-1.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div className="h-2 w-14 rounded-xs" style={{ background: palette.primary }} />
          <div className="h-1 w-10 rounded-xs" style={{ background: palette.accent }} />
        </div>
        <div className="flex flex-1 gap-2 pl-1 pt-0.5">
          <div className="flex flex-col items-center">
            <span className="h-2 w-2 rounded-full border-2 bg-white" style={{ borderColor: palette.accent }} />
            <span className="w-px flex-1 bg-slate-200" />
            <span className="h-2 w-2 rounded-full border-2 bg-white" style={{ borderColor: palette.accent }} />
            <span className="w-px flex-1 bg-slate-200" />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-1.5 w-2/3 bg-slate-300 rounded-xs" />
            <div className="h-1 w-full bg-slate-200 rounded-xs" />
            <div className="h-1.5 w-1/2 bg-slate-300 rounded-xs mt-1" />
            <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
          </div>
        </div>
      </div>
    );
  }

  if (meta.template === 'card-grid') {
    return (
      <div className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2 flex flex-col gap-1.5 shadow-2xs">
        <div
          className="rounded-xs p-1.5 flex flex-col gap-1"
          style={{ background: palette.soft, border: `1px solid ${palette.line}` }}
        >
          <div className="h-1.5 w-12 rounded-xs" style={{ background: palette.primary }} />
          <div className="h-1 w-3/4 rounded-xs" style={{ background: palette.accent }} />
        </div>
        <div className="rounded-xs bg-slate-50 border border-slate-200 p-1.5 flex flex-col gap-1">
          <div className="h-1 w-10 rounded-xs" style={{ background: palette.primary }} />
          <div className="h-1 w-full bg-slate-200 rounded-xs" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          <div className="rounded-xs bg-slate-50 border border-slate-200 p-1" />
          <div className="rounded-xs bg-slate-50 border border-slate-200 p-1" />
        </div>
      </div>
    );
  }

  if (meta.template === 'centered-classic') {
    return (
      <div className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col gap-1.5 shadow-2xs">
        <div
          className="py-1.5 flex flex-col items-center gap-1"
          style={{
            borderTop: `2px solid ${palette.primary}`,
            borderBottom: `1px solid ${palette.primary}`,
          }}
        >
          <div className="h-2 w-12 rounded-xs" style={{ background: palette.primary }} />
          <div className="h-1 w-24 rounded-xs bg-slate-300" />
        </div>
        <div className="h-1 w-10 rounded-xs mt-0.5" style={{ background: palette.primary }} />
        <div className="h-1 w-full bg-slate-200 rounded-xs" />
        <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
        <div className="h-1 w-4/6 bg-slate-100 rounded-xs" />
      </div>
    );
  }

  if (meta.template === 'magazine') {
    const hdrBg =
      meta.headerStyle === 'banner'
        ? palette.primary
        : meta.headerStyle === 'tinted'
          ? palette.soft
          : '#ffffff';
    return (
      <div className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2 flex flex-col gap-2 shadow-2xs">
        <div
          className="rounded-sm p-1.5 flex flex-col gap-1"
          style={{
            background: hdrBg,
            border: meta.headerStyle === 'tinted' ? `1px solid ${palette.line}` : undefined,
          }}
        >
          <div
            className="h-2 w-12 rounded-xs"
            style={{ background: meta.headerStyle === 'banner' ? '#ffffff' : palette.primary }}
          />
          <div
            className="h-1 w-4/5 rounded-xs"
            style={{
              background:
                meta.headerStyle === 'banner' ? 'rgba(255,255,255,0.6)' : palette.accent,
            }}
          />
        </div>
        <div className="grid grid-cols-5 gap-2 flex-1">
          <div className="col-span-3 flex flex-col gap-1">
            <div className="h-1 w-10 rounded-xs" style={{ background: palette.primary }} />
            <div className="h-1 w-full bg-slate-200 rounded-xs" />
            <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
          </div>
          <div className="col-span-2 border-l border-slate-200 pl-1.5 flex flex-col gap-1">
            <div className="h-1 w-8 rounded-xs" style={{ background: palette.accent }} />
            <div className="h-1 w-full bg-slate-200 rounded-xs" />
            <div className="h-1 w-3/4 bg-slate-100 rounded-xs" />
          </div>
        </div>
      </div>
    );
  }

  // single-column
  const hdrBg =
    meta.headerStyle === 'banner'
      ? palette.primary
      : meta.headerStyle === 'tinted'
        ? palette.soft
        : '#ffffff';

  return (
    <div className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col gap-1.5 shadow-2xs">
      <div
        className="rounded-sm p-1.5 flex flex-col gap-1"
        style={{
          background: hdrBg,
          borderBottom: meta.headerStyle === 'clean' ? `1.5px solid ${palette.primary}` : undefined,
          border: meta.headerStyle === 'tinted' ? `1px solid ${palette.line}` : undefined,
        }}
      >
        <div
          className="h-2 w-14 rounded-xs"
          style={{ background: meta.headerStyle === 'banner' ? '#ffffff' : palette.primary }}
        />
        <div
          className="h-1 w-3/4 rounded-xs"
          style={{
            background: meta.headerStyle === 'banner' ? 'rgba(255,255,255,0.65)' : palette.accent,
          }}
        />
      </div>
      <div className="h-1 w-12 rounded-xs mt-0.5" style={{ background: palette.primary }} />
      <div className="h-1 w-full bg-slate-200 rounded-xs" />
      <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
      <div className="h-1 w-4/6 bg-slate-100 rounded-xs" />
    </div>
  );
}

export function TemplateGalleryModal({
  open,
  onClose,
  onUseAsNewResume,
  onApplyStyleOnly,
  onCreateCustomRole,
}: TemplateGalleryModalProps) {
  const [category, setCategory] = useState<IndustryCategory>('all');
  const [query, setQuery] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');

  useEffect(() => {
    if (open) {
      setCategory('all');
      setQuery('');
      setCustomRoleInput('');
    }
  }, [open]);

  if (!open) return null;

  const visible = searchTemplates(TEMPLATE_LIBRARY, query, category);
  const trimmedQuery = query.trim();

  const handleGenerateRole = (roleName: string) => {
    const clean = roleName.trim();
    if (!clean) return;
    onCreateCustomRole(clean);
    setQuery('');
    setCustomRoleInput('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全行业简历模板广场"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">全行业简历模板广场（12 行业 × 8 大版式）</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                按主流招聘网站行业分类设计，涵盖自动化/制造、游戏、财税金融、销售外贸、医疗护理、供应链、建筑工程与文科教培；小众岗位可按关键词一键定制骨架。
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭模板广场"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Search + Industry Categories */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                aria-label="搜索行业或岗位模板"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索行业、岗位或技能，如：自动化、PLC、游戏策划、会计、护理、销售、外贸、BIM、嵌入式..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  aria-label="清空搜索"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {trimmedQuery && (
              <button
                type="button"
                onClick={() => handleGenerateRole(trimmedQuery)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" />
                按「{trimmedQuery}」一键生成定制骨架
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {INDUSTRY_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Grid + Custom Niche Role Creator */}
        <div className="flex-1 overflow-y-auto p-5 studio-scroll space-y-5">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center space-y-3">
              <div className="text-sm font-semibold text-slate-900">
                暂未直接命中「{trimmedQuery}」的预置行业模板
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                点击下方按钮，系统将自动根据「{trimmedQuery}」的岗位属性匹配最合适的版式、色彩主题与模块结构，为你生成专属空白骨架！
              </p>
              <button
                type="button"
                onClick={() => handleGenerateRole(trimmedQuery)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Sparkles className="h-3.5 w-3.5" />
                立即生成「{trimmedQuery}」定制简历骨架
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 transition-shadow hover:shadow-md"
                >
                  <TemplateCardThumbnail entry={entry} />

                  <div className="mt-3 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-blue-700">
                        {entry.categoryLabel}
                      </span>
                      <span className="text-[10.5px] font-medium text-slate-500">
                        {entry.styleTag}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">{entry.title}</h3>
                    <div className="text-[10.5px] text-slate-500">{entry.subtitle}</div>
                    <p className="text-[11px] leading-relaxed text-slate-500 pt-0.5">
                      适用：{entry.recommendedFor}
                    </p>
                  </div>

                  <div className="mt-3.5 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        onUseAsNewResume(entry.doc, entry.title);
                        onClose();
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      基于此模板新建简历
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyStyleOnly(entry.doc, entry.title);
                        onClose();
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Paintbrush className="h-3.5 w-3.5" />
                      仅套用该风格（保留我现有内容）
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Persistent Niche Role Generator Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[200px] flex-1">
              <div className="text-xs font-semibold text-slate-900">
                细分冷门岗位？输入任意目标职位，智能匹配版式生成专属骨架
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                例如：化工工艺工程师、无人机飞手、农业技术员、酒店前厅经理、游戏音频设计、跨境物流专员...
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                aria-label="输入任意自定义细分岗位名称"
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customRoleInput.trim()) {
                    e.preventDefault();
                    handleGenerateRole(customRoleInput);
                  }
                }}
                placeholder="输入任意岗位名称..."
                className="flex-1 sm:w-52 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                disabled={!customRoleInput.trim()}
                onClick={() => handleGenerateRole(customRoleInput)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" />
                生成骨架
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
