import type { CSSProperties, RefObject } from 'react';
import { Compass, EyeOff, Maximize2, Minimize2, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import type {
  CaseItem,
  CustomModule,
  ResumeDoc,
  TitledItem,
} from '../types/resume';
import {
  countResumeChars,
  customHasContent,
  expKpisOf,
  getContactList,
  isShown,
  maskEmail,
  maskPhone,
  resolveBaseFontWeight,
  resolveLineHeight,
  resolvePalette,
  richSegs,
  secTitle,
} from '../utils/resumeLogic';

interface ResumeCanvasProps {
  doc: ResumeDoc;
  activeModule: string;
  showActiveOutline: boolean;
  bwPreview: boolean;
  privacyMask: boolean;
  previewScale: number;
  zoomOffset: number;
  fitScale: number;
  pageCount: number;
  fillPct: number;
  pvPageRef: RefObject<HTMLDivElement | null>;
  pvInnerRef: RefObject<HTMLDivElement | null>;
  onSelectModule: (moduleKey: string) => void;
  onToggleAutofit: () => void;
  onToggleBwPreview: () => void;
  onTogglePrivacyMask: () => void;
  radarOpen?: boolean;
  competitivenessScore?: number;
  onToggleRadar?: () => void;
  onAdjustZoom: (delta: number) => void;
  onResetZoom: () => void;
}

function RichText({ text }: { text: string }) {
  return (
    <>
      {richSegs(text).map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="r-rich-strong">
            {seg.text}
          </strong>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

const SIDEBAR_MODULES = new Set(['education', 'skills', 'certs', 'tags']);

export function ResumeCanvas({
  doc,
  activeModule,
  showActiveOutline,
  bwPreview,
  privacyMask,
  previewScale,
  zoomOffset,
  fitScale,
  pageCount,
  fillPct,
  pvPageRef,
  pvInnerRef,
  onSelectModule,
  onToggleAutofit,
  onToggleBwPreview,
  onTogglePrivacyMask,
  radarOpen,
  competitivenessScore,
  onToggleRadar,
  onAdjustZoom,
  onResetZoom,
}: ResumeCanvasProps) {
  const { meta, data } = doc;
  const isEnDoc = doc.bilingual?.lang === 'en';
  const theme = resolvePalette(meta.theme, meta.customColor);
  const rawContacts = getContactList(data, isEnDoc ? 'en' : 'zh');
  const contacts = privacyMask
    ? rawContacts.map((c) => {
        if (c.key === 'phone') return { ...c, value: maskPhone(c.value) };
        if (c.key === 'email') return { ...c, value: maskEmail(c.value) };
        return c;
      })
    : rawContacts;
  const effectiveScale = Math.max(0.35, Math.min(1.4, previewScale + zoomOffset));
  const showPhoto = Boolean(data.basic.photo || meta.showPhotoSlot);
  const isLightSidebar = meta.sidebarStyle !== 'dark';
  const kpiStyleClass = `kpi-${meta.kpiStyle || 'accent'}`;
  const fontStyleClass = `font-${meta.fontStyle || 'sans'}`;
  const sectionStyleClass = `sec-${meta.sectionStyle || 'bar'}`;
  const singleHeaderClass = `hdr-${meta.headerStyle || 'clean'}`;
  const magHeaderClass = `hdr-${meta.headerStyle || 'tinted'}`;
  const bannerHeaderClass = `hdr-${meta.headerStyle || 'banner'}`;

  const cssVars = {
    '--r-primary': theme.primary,
    '--r-accent': theme.accent,
    '--r-soft': theme.soft,
    '--r-line': theme.line,
    '--r-side-bg': theme.sideBg,
    '--r-side-ink': theme.sideInk,
    '--r-side-muted': theme.sideMuted,
    '--r-side-rule': theme.sideRule,
    '--r-fs': `${meta.fs}px`,
    '--r-fw-base': String(resolveBaseFontWeight(meta.fw)),
    '--r-lh': resolveLineHeight(meta.lh).toFixed(2),
    '--r-pad': `${meta.pad}px`,
  } as CSSProperties;

  const hitClass = (key: string) =>
    `r-hit ${showActiveOutline && activeModule === key ? 'is-active' : ''}`;

  const renderPhoto = () => {
    if (!showPhoto) return null;
    return (
      <div className="r-photo-frame" aria-label="证件照区域">
        {data.basic.photo ? (
          <img src={data.basic.photo} alt={`${data.basic.name || '候选人'}证件照`} />
        ) : (
          <span>证件照</span>
        )}
      </div>
    );
  };

  const renderContactsRow = () => {
    if (!contacts.length) return null;
    return (
      <div className="r-meta-grid">
        {contacts.map((c, idx) => {
          const isWide = c.value.length > 18;
          return (
            <span key={c.key} className={`r-meta-item ${isWide ? 'is-wide' : ''}`}>
              <span className="r-meta-label">{c.label}</span>
              <span className="r-meta-val tabular-nums">{c.value}</span>
              {idx < contacts.length - 1 && (
                <span className="r-meta-sep ml-2" aria-hidden="true">
                  |
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const renderCustomBody = (cm: CustomModule, dark = false) => {
    if (cm.kind === 'tags') {
      const list = (cm.items as string[]).filter((s) => s?.trim());
      return (
        <div className={dark ? 'r-side-tags' : 'r-inline-tags'}>
          {list.map((tag, idx) => (
            <span key={idx} className={dark ? 'r-side-tag' : 'r-tag-chip'}>
              {tag}
            </span>
          ))}
        </div>
      );
    }
    if (cm.kind === 'bullets') {
      const list = (cm.items as string[]).filter((s) => s?.trim());
      if (dark) {
        return (
          <div className="r-side-list">
            {list.map((b, idx) => (
              <div key={idx}>• {b.replace(/\*\*/g, '')}</div>
            ))}
          </div>
        );
      }
      return (
        <ul className="r-bullets">
          {list.map((b, idx) => (
            <li key={idx}>
              <RichText text={b} />
            </li>
          ))}
        </ul>
      );
    }
    if (cm.kind === 'titled') {
      const list = (cm.items as TitledItem[]).filter((it) => it?.title?.trim() || it?.body?.trim());
      return (
        <div className={dark ? 'r-side-list' : 'r-eval-list'}>
          {list.map((it, idx) => (
            <div key={idx} className={dark ? '' : 'r-eval-item'}>
              <strong className={dark ? 'text-white' : ''}>{it.title}</strong>
              {it.title && it.body ? '：' : ''}
              <span>{it.body}</span>
            </div>
          ))}
        </div>
      );
    }
    if (cm.kind === 'cases') {
      const list = (cm.items as CaseItem[]).filter(
        (it) => it?.title?.trim() || it?.bg?.trim() || it?.action?.trim() || it?.result?.trim(),
      );
      return (
        <div>
          {list.map((c, idx) => (
            <div key={idx} className="r-case-card">
              {c.title && <div className="font-semibold text-slate-900">{c.title}</div>}
              {c.bg && (
                <div className="text-slate-600 mt-0.5">
                  {isEnDoc ? 'Context: ' : '背景：'}
                  {c.bg}
                </div>
              )}
              {c.action && (
                <div className="text-slate-700 mt-0.5">
                  {isEnDoc ? 'Action: ' : '行动：'}
                  {c.action}
                </div>
              )}
              {c.result && (
                <div className="text-slate-900 font-medium mt-0.5">
                  {isEnDoc ? 'Result: ' : '结果：'}
                  {c.result}
                </div>
              )}
              {c.evidence && (
                <div className="text-slate-500 text-[0.9em] mt-0.5">
                  {isEnDoc ? 'Evidence: ' : '佐证：'}
                  {c.evidence}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    const paragraphs = (cm.items as string[]).filter((s) => s?.trim());
    return (
      <div className="space-y-1">
        {paragraphs.map((p, idx) => (
          <p key={idx} className={dark ? 'text-white/85' : 'text-slate-700'}>
            {p}
          </p>
        ))}
      </div>
    );
  };

  const renderMainSection = (key: string) => {
    if (!isShown(meta, key)) return null;

    if (key === 'intent') {
      const items = [
        { k: isEnDoc ? 'Target Role' : '目标岗位', v: data.intent.position },
        { k: isEnDoc ? 'Location' : '意向城市', v: data.intent.city },
        { k: isEnDoc ? 'Expected Comp' : '期望薪资', v: data.intent.salary },
        { k: isEnDoc ? 'Availability' : '到岗时间', v: data.intent.availability },
      ].filter((x) => x.v.trim());
      if (!items.length) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass('intent')}`}
          onClick={() => onSelectModule('intent')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{secTitle(meta, 'intent')}</h2>
          </div>
          <div className="r-intent-grid">
            {items.map((it) => (
              <div key={it.k} className="r-intent-item">
                <span className="r-intent-k">{isEnDoc ? `${it.k}: ` : `${it.k}：`}</span>
                <span className="r-intent-v">{it.v}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'experience') {
      if (!data.experience.length) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass('experience')}`}
          onClick={() => onSelectModule('experience')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{secTitle(meta, 'experience')}</h2>
          </div>
          <div className="r-exp-list">
            {data.experience.map((exp) => {
              const kpis = expKpisOf(exp.kpis);
              return (
                <article key={exp.id} className="r-exp-item">
                  <div className="r-exp-top">
                    <div className="min-w-0">
                      <span className="r-exp-company">{exp.company || '未填写公司名称'}</span>
                      {exp.role && <span className="r-exp-role">{exp.role}</span>}
                    </div>
                    {exp.period && <span className="r-exp-period">{exp.period}</span>}
                  </div>
                  {exp.subtitle && <div className="r-exp-sub">{exp.subtitle}</div>}
                  {kpis.length > 0 && (
                    <div className={`r-kpi-strip ${kpiStyleClass}`}>
                      {kpis.map((k, idx) => (
                        <div key={idx} className="r-kpi-cell">
                          <span className="r-kpi-num">{k.num}</span>
                          <span className="r-kpi-lbl">{k.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {exp.bullets.filter((b) => b.trim()).length > 0 && (
                    <ul className="r-bullets">
                      {exp.bullets
                        .filter((b) => b.trim())
                        .map((b, idx) => (
                          <li key={idx}>
                            <RichText text={b} />
                          </li>
                        ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      );
    }

    if (key === 'skills') {
      if (!data.skills.length) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass('skills')}`}
          onClick={() => onSelectModule('skills')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{secTitle(meta, 'skills')}</h2>
          </div>
          <div className="r-skill-list">
            {data.skills.map((sk) => (
              <div key={sk.id} className="r-skill-row">
                <span className="r-skill-cat">{sk.cat}</span>
                <span className="r-skill-items">{sk.items}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'education') {
      if (!data.education.length) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass('education')}`}
          onClick={() => onSelectModule('education')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{secTitle(meta, 'education')}</h2>
          </div>
          <div className="r-edu-list">
            {data.education.map((edu) => (
              <div key={edu.id} className="r-edu-item">
                <div className="r-edu-top">
                  <div>
                    <span className="r-edu-school">{edu.school}</span>
                    <span className="r-edu-meta">
                      {[edu.major, edu.degree].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  {edu.period && <span className="r-exp-period">{edu.period}</span>}
                </div>
                {edu.desc && <div className="r-edu-desc">{edu.desc}</div>}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'certs') {
      const certs = data.certs.filter((c) => c.trim());
      if (!certs.length) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass('certs')}`}
          onClick={() => onSelectModule('certs')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{secTitle(meta, 'certs')}</h2>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
            {certs.map((c, idx) => (
              <span key={idx}>• {c}</span>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'tags') {
      const tags = data.tags.filter((t) => t.trim());
      if (!tags.length) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass('tags')}`}
          onClick={() => onSelectModule('tags')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{secTitle(meta, 'tags')}</h2>
          </div>
          <div className="r-inline-tags">
            {tags.map((t, idx) => (
              <span key={idx} className="r-tag-chip">
                {t}
              </span>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'evals') {
      if (!data.evals.length) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass('evals')}`}
          onClick={() => onSelectModule('evals')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{secTitle(meta, 'evals')}</h2>
          </div>
          <div className="r-eval-list">
            {data.evals.map((ev, idx) => (
              <div key={ev.id || idx} className="r-eval-item">
                {ev.title && <strong>{ev.title}：</strong>}
                <span>{ev.body}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (key.startsWith('custom:')) {
      const cid = key.slice(7);
      const cm = data.custom.find((c) => c.id === cid);
      if (!cm || !cm.show || !customHasContent(cm)) return null;
      return (
        <section
          key={key}
          className={`r-sec ${hitClass(key)}`}
          onClick={() => onSelectModule(key)}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-sec-head">
            <span className="r-sec-bar" />
            <h2 className="r-sec-title">{cm.title}</h2>
          </div>
          {renderCustomBody(cm, false)}
        </section>
      );
    }

    return null;
  };

  const renderSidebarSection = (key: string) => {
    if (!isShown(meta, key)) return null;

    if (key === 'education' && data.education.length > 0) {
      return (
        <div
          key={key}
          className={`r-side-sec ${hitClass('education')}`}
          onClick={() => onSelectModule('education')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-side-title">{secTitle(meta, 'education')}</div>
          <div className="space-y-2">
            {data.education.map((edu) => (
              <div key={edu.id} className="text-[0.92em]">
                <div className="font-semibold r-side-sub-title">{edu.school}</div>
                <div className="r-side-sub-body">
                  {[edu.major, edu.degree].filter(Boolean).join(' · ')}
                </div>
                {edu.period && (
                  <div className="font-mono text-[0.86em] r-side-sub-meta tabular-nums">
                    {edu.period}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'skills' && data.skills.length > 0) {
      return (
        <div
          key={key}
          className={`r-side-sec ${hitClass('skills')}`}
          onClick={() => onSelectModule('skills')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-side-title">{secTitle(meta, 'skills')}</div>
          <div className="space-y-2 text-[0.9em]">
            {data.skills.map((sk) => (
              <div key={sk.id}>
                <div className="font-semibold r-side-sub-title">{sk.cat}</div>
                <div className="r-side-sub-body leading-snug mt-0.5">{sk.items}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'certs' && data.certs.filter((c) => c.trim()).length > 0) {
      return (
        <div
          key={key}
          className={`r-side-sec ${hitClass('certs')}`}
          onClick={() => onSelectModule('certs')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-side-title">{secTitle(meta, 'certs')}</div>
          <div className="r-side-list">
            {data.certs
              .filter((c) => c.trim())
              .map((c, idx) => (
                <div key={idx}>• {c}</div>
              ))}
          </div>
        </div>
      );
    }

    if (key === 'tags' && data.tags.filter((t) => t.trim()).length > 0) {
      return (
        <div
          key={key}
          className={`r-side-sec ${hitClass('tags')}`}
          onClick={() => onSelectModule('tags')}
        >
          <span className="r-hit-tip">点击编辑</span>
          <div className="r-side-title">{secTitle(meta, 'tags')}</div>
          <div className="r-side-tags">
            {data.tags
              .filter((t) => t.trim())
              .map((t, idx) => (
                <span key={idx} className="r-side-tag">
                  {t}
                </span>
              ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderTemplate = () => {
    // 1. SINGLE-COLUMN, 3. TIMELINE, 4. CARD-GRID (Top header + full-width body with distinct visual CSS)
    if (
      meta.template === 'single-column' ||
      meta.template === 'timeline' ||
      meta.template === 'card-grid'
    ) {
      return (
        <div className={`tpl-${meta.template}`}>
          <header
            className={`r-top-header ${singleHeaderClass} ${hitClass('basic')}`}
            onClick={() => onSelectModule('basic')}
          >
            <span className="r-hit-tip">点击编辑基本信息</span>
            <div className="r-header-main">
              <h1 className="r-name">{data.basic.name || '请输入姓名'}</h1>
              {data.basic.headline && <p className="r-headline">{data.basic.headline}</p>}
              {renderContactsRow()}
            </div>
            {renderPhoto()}
          </header>
          <div>{meta.order.map((key) => renderMainSection(key))}</div>
        </div>
      );
    }

    // 2. CENTERED CLASSIC (Academic / Gov / Finance / Legal)
    if (meta.template === 'centered-classic') {
      return (
        <div className="tpl-centered-classic">
          <header
            className={`r-center-header ${singleHeaderClass} ${hitClass('basic')}`}
            onClick={() => onSelectModule('basic')}
          >
            <span className="r-hit-tip">点击编辑基本信息</span>
            <div className="r-header-main">
              <h1 className="r-name">{data.basic.name || '请输入姓名'}</h1>
              {data.basic.headline && <p className="r-headline">{data.basic.headline}</p>}
              {renderContactsRow()}
            </div>
            {renderPhoto()}
          </header>
          <div>{meta.order.map((key) => renderMainSection(key))}</div>
        </div>
      );
    }

    // 5 & 6. TWO-COLUMN CLASSIC & REVERSE
    if (meta.template === 'two-column' || meta.template === 'two-column-reverse') {
      const sideKeys = meta.order.filter((k) => SIDEBAR_MODULES.has(k));
      const mainKeys = meta.order.filter((k) => !SIDEBAR_MODULES.has(k));

      const sidePane = (
        <aside className={`r-side ${isLightSidebar ? 'is-light' : ''}`}>
          <div className={hitClass('basic')} onClick={() => onSelectModule('basic')}>
            <span className="r-hit-tip">点击编辑</span>
            {showPhoto && <div className="mb-3">{renderPhoto()}</div>}
            <h1 className="r-name">{data.basic.name || '请输入姓名'}</h1>
            {data.basic.headline && <p className="r-headline">{data.basic.headline}</p>}
          </div>

          {contacts.length > 0 && (
            <div
              className={`r-side-sec ${hitClass('basic')}`}
              onClick={() => onSelectModule('basic')}
            >
              <div className="r-side-title">基础档案</div>
              <div className="r-side-kv">
                {contacts.map((c) => (
                  <div key={c.key} className="r-side-row">
                    <span className="r-side-k">{c.label}</span>
                    <span className="r-side-v tabular-nums">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sideKeys.map((k) => renderSidebarSection(k))}
        </aside>
      );

      const mainPane = (
        <main className="r-main">{mainKeys.map((k) => renderMainSection(k))}</main>
      );

      return (
        <div
          className={
            meta.template === 'two-column-reverse' ? 'tpl-two-column-reverse' : 'tpl-two-column'
          }
        >
          {meta.template === 'two-column-reverse' ? (
            <>
              {mainPane}
              {sidePane}
            </>
          ) : (
            <>
              {sidePane}
              {mainPane}
            </>
          )}
        </div>
      );
    }

    // 7. MAGAZINE EDITORIAL SPLIT
    if (meta.template === 'magazine') {
      const sideKeys = meta.order.filter((k) => SIDEBAR_MODULES.has(k));
      const mainKeys = meta.order.filter((k) => !SIDEBAR_MODULES.has(k));
      return (
        <div className="tpl-magazine">
          <header
            className={`r-mag-header ${magHeaderClass} ${hitClass('basic')}`}
            onClick={() => onSelectModule('basic')}
          >
            <span className="r-hit-tip">点击编辑基本信息</span>
            <div className="min-w-0 flex-1">
              <h1 className="r-name">{data.basic.name || '请输入姓名'}</h1>
              {data.basic.headline && <p className="r-headline">{data.basic.headline}</p>}
              {renderContactsRow()}
            </div>
            {renderPhoto()}
          </header>

          <div className="r-mag-body">
            <div className="min-w-0">{mainKeys.map((k) => renderMainSection(k))}</div>
            <div className="r-mag-side min-w-0">{sideKeys.map((k) => renderMainSection(k))}</div>
          </div>
        </div>
      );
    }

    // 8. TOP BANNER SPLIT (Full-width Hero Banner + Left Info Column + Right Main Column)
    const sideKeys = meta.order.filter((k) => SIDEBAR_MODULES.has(k));
    const mainKeys = meta.order.filter((k) => !SIDEBAR_MODULES.has(k));
    return (
      <div className="tpl-top-banner-split">
        <header
          className={`r-hero-banner ${bannerHeaderClass} ${hitClass('basic')}`}
          onClick={() => onSelectModule('basic')}
        >
          <span className="r-hit-tip">点击编辑基本信息</span>
          <div className="min-w-0 flex-1">
            <h1 className="r-name">{data.basic.name || '请输入姓名'}</h1>
            {data.basic.headline && <p className="r-headline">{data.basic.headline}</p>}
            {renderContactsRow()}
          </div>
          {renderPhoto()}
        </header>
        <div className="r-banner-body">
          <aside className="r-banner-side">{sideKeys.map((k) => renderMainSection(k))}</aside>
          <main className="r-banner-main">{mainKeys.map((k) => renderMainSection(k))}</main>
        </div>
      </div>
    );
  };

  const effectivePages = !meta.autofit && pageCount > 1 ? pageCount : 1;
  const scaledWidth = Math.round(794 * effectiveScale);
  const scaledHeight = Math.round(1123 * effectivePages * effectiveScale);

  return (
    <div className="print-canvas-host flex min-w-0 flex-1 flex-col overflow-hidden bg-[#e8edf3]">
      <div className="print-scroll-area flex-1 overflow-auto px-4 py-6 sm:px-8 sm:py-7 studio-scroll">
        <div className="mx-auto flex flex-col items-center">
          <div
            className="print-scale-box relative transition-transform duration-150"
            style={{ width: `${scaledWidth}px`, minHeight: `${scaledHeight}px` }}
          >
            <div
              ref={pvPageRef}
              data-testid="resume-a4-page"
              data-template={meta.template}
              data-font={meta.fontStyle || 'sans'}
              data-header={meta.headerStyle || 'clean'}
              data-section-style={meta.sectionStyle || 'bar'}
              data-bw={bwPreview ? '1' : '0'}
              className={`a4-paper ${fontStyleClass} ${sectionStyleClass} ${bwPreview ? 'bw-preview' : ''} ${meta.printSafe !== false ? 'print-safe-on' : ''}`}
              style={{
                ...cssVars,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                ref={pvInnerRef}
                className="a4-inner"
                style={
                  meta.autofit && fitScale < 0.999
                    ? {
                        transform: `scale(${fitScale})`,
                        width: `${(100 / fitScale).toFixed(3)}%`,
                        minHeight: `${Math.ceil(1123 / fitScale)}px`,
                      }
                    : undefined
                }
              >
                {renderTemplate()}
              </div>
              {!meta.autofit &&
                pageCount > 1 &&
                Array.from({ length: pageCount - 1 }, (_, idx) => {
                  const breakIdx = idx + 1;
                  return (
                    <div
                      key={breakIdx}
                      data-testid="a4-page-break-guide"
                      className="no-print a4-page-break-line"
                      style={{ top: `${breakIdx * 1123}px` }}
                      aria-hidden="true"
                    >
                      <span className="a4-page-break-badge">
                        第 {breakIdx} / {pageCount} 页 A4 分页线（打印时自动避开断行）
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Non-Overlapping Bottom Canvas Control Strip */}
      <div className="no-print flex h-10 shrink-0 items-center justify-between gap-2 border-t border-slate-200/90 bg-white/95 px-3 sm:px-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleAutofit}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap ${
              meta.autofit
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {meta.autofit ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            <span>{meta.autofit ? '自动压一页：开' : '自动压一页：关'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleBwPreview}
            title="模拟黑白激光打印机灰度效果，提前排查重色块糊字风险"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap ${
              bwPreview
                ? 'bg-slate-800 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">黑白预览</span>
          </button>

          <button
            type="button"
            onClick={onTogglePrivacyMask}
            title="截图分享或发给朋友/AI 审查时隐藏真实手机号与邮箱"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap ${
              privacyMask
                ? 'bg-amber-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span className="hidden md:inline">隐私脱敏</span>
          </button>

          {onToggleRadar && (
            <button
              type="button"
              onClick={onToggleRadar}
              aria-label="切换简历竞争力雷达图"
              aria-pressed={Boolean(radarOpen)}
              title="展开或收起右侧「简历竞争力雷达图」四维打分面板"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap ${
                radarOpen
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">竞争力雷达</span>
              {typeof competitivenessScore === 'number' && (
                <span className="font-mono text-[10.5px] tabular-nums">
                  {competitivenessScore}分
                </span>
              )}
            </button>
          )}

          <span
            title="A4 单页内容饱满度与字数参考：80%-100% 且 450-900 字阅读体验最佳"
            className={`hidden lg:inline font-mono tabular-nums text-[11px] whitespace-nowrap truncate ${
              fillPct < 65
                ? 'text-amber-600'
                : meta.autofit && fitScale < 0.999
                  ? 'text-blue-700'
                  : fillPct > 103
                    ? 'text-amber-700'
                    : 'text-emerald-700'
            }`}
          >
            {meta.autofit && fitScale < 0.999
              ? `1 页 A4 · 已缩至 ${Math.round(fitScale * 100)}%`
              : pageCount > 1
                ? `约 ${pageCount} 页 A4 · 填充 ${fillPct}%`
                : fillPct < 65
                  ? `1 页 A4 · 填充偏少 ${fillPct}%`
                  : `1 页 A4 · 填充 ${fillPct}%`}
            {` · ${countResumeChars(doc)} 字`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onAdjustZoom(-0.08)}
            aria-label="缩小预览"
            className="rounded p-1 hover:bg-slate-100 text-slate-600"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            title="重置视图缩放"
            className="min-w-[40px] text-center font-mono text-[11px] tabular-nums text-slate-700 hover:text-slate-950"
          >
            {Math.round(effectiveScale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => onAdjustZoom(0.08)}
            aria-label="放大预览"
            className="rounded p-1 hover:bg-slate-100 text-slate-600"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
