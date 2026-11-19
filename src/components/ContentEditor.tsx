import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Bold, ImagePlus, Loader2, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import {
  BASIC_EXTRA_PRESETS,
  FIXED_MODULE_LABELS,
  INDUSTRY_WRITING_KITS,
  MODULE_PRESETS,
} from '../data/themes';
import type {
  AiProviderId,
  AiProviderInfo,
  CaseItem,
  CustomAiConfig,
  CustomModule,
  CustomModuleKind,
  ExperienceStarSuggestion,
  ResumeDoc,
  TitledItem,
  WritingIndustry,
} from '../types/resume';
import {
  blankCase,
  blankItems,
  buildAiRequestDefaults,
  buildExpandExperiencePrompt,
  defSecTitle,
  detectWeakBulletOpener,
  isCustomAiReady,
  nid,
  normalizeStarSuggestions,
  parseExternalExpandExperienceJson,
  stripBold,
  validateExpandExperienceInput,
  wrapTextWithBold,
} from '../utils/resumeLogic';
import { DateRangePicker } from './DateRangePicker';
import { ExperienceStarPanel } from './ExperienceStarPanel';

const KPI_QUICK_TEMPLATES = [
  { label: '效率提速', num: '80%', desc: '流程耗时压缩' },
  { label: '准确保障', num: '99.8%', desc: '审核交付零差错' },
  { label: '服务规模', num: '300+', desc: '服务客户 / 学员数' },
  { label: '业务增长', num: '35%', desc: '核心指标同比提升' },
];

const WRITING_INDUSTRY_ORDER: WritingIndustry[] = [
  'general',
  'engineering',
  'humanities',
  'creative',
  'business',
  'medical',
];

interface ContentEditorProps {
  doc: ResumeDoc;
  activeModule: string;
  providers: AiProviderInfo[];
  selectedProvider: AiProviderId;
  customConfig: CustomAiConfig;
  onOpenSettings?: () => void;
  onSelectModule: (moduleKey: string) => void;
  onMutate: (mutator: (draft: ResumeDoc) => void, recordHistory?: boolean) => void;
  onUploadPhoto: (file: File) => void;
  onDeleteCustomModule: (id: string) => void;
  onNotify: (msg: string) => void;
}

const FIXED_KEYS = ['basic', 'intent', 'experience', 'skills', 'education', 'certs', 'tags', 'evals'];

const CUSTOM_KIND_OPTIONS: Array<{ value: CustomModuleKind; label: string }> = [
  { value: 'bullets', label: '要点列表' },
  { value: 'titled', label: '标题+正文' },
  { value: 'cases', label: 'STAR 案例卡片' },
  { value: 'tags', label: '标签集合' },
  { value: 'text', label: '纯文本段落' },
];

interface ExpExpandState {
  loading: boolean;
  error: string | null;
  showAiFallback: boolean;
  suggestions: ExperienceStarSuggestion[];
  modelUsed?: string;
}

export function ContentEditor({
  doc,
  activeModule,
  providers,
  selectedProvider,
  customConfig,
  onOpenSettings,
  onSelectModule,
  onMutate,
  onUploadPhoto,
  onDeleteCustomModule,
  onNotify,
}: ContentEditorProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [writingIndustry, setWritingIndustry] = useState<WritingIndustry>('general');
  const [expandedKpiIds, setExpandedKpiIds] = useState<Record<string, boolean>>({});
  const [polishingKey, setPolishingKey] = useState<string | null>(null);
  const [expExpandMap, setExpExpandMap] = useState<Record<string, ExpExpandState>>({});
  const { data, meta } = doc;
  const activeKit = INDUSTRY_WRITING_KITS[writingIndustry];
  const anyAiReady = isCustomAiReady(customConfig) || providers.some((p) => p.configured);

  const handleAiPolishBullet = async (expIdx: number, bulletIdx: number) => {
    const exp = data.experience[expIdx];
    const bullet = (exp?.bullets[bulletIdx] || '').trim();
    if (!bullet) {
      onNotify('请先写一句经历内容，再点击 AI 润色');
      return;
    }

    if (!anyAiReady) {
      const prompt = `请帮我把下面这条简历经历润色得更专业、凝练（保留真实事实，不编造数字，35-65字，可用 **双星号** 加粗 1-2 个重点）：\n行业场景：${activeKit.label}\n机构/职位：${exp.company || '未填'} · ${exp.role || '未填'}\n原文：${bullet}`;
      try {
        await navigator.clipboard.writeText(prompt);
        onNotify('尚未配置 API，已为你复制单条润色 Prompt（或到「简历体检」填好你的 API 即可一键直连润色）');
      } catch {
        onNotify('请先在「简历体检 / 投递与换岗」中配置你的 API URL 与 Key');
      }
      return;
    }

    const key = `${exp.id}-${bulletIdx}`;
    setPolishingKey(key);
    try {
      const resp = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet,
          role: exp.role,
          company: exp.company,
          industryLabel: activeKit.label,
          ...buildAiRequestDefaults(customConfig, selectedProvider),
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        onNotify(json.error || `AI 润色失败 (${resp.status})`);
        return;
      }
      if (typeof json.polished === 'string' && json.polished.trim()) {
        onMutate((d) => {
          d.data.experience[expIdx].bullets[bulletIdx] = json.polished.trim();
        }, true);
        onNotify(`已完成 AI 润色：${json.tip || '表达已精修'}（支持 Ctrl+Z 撤销）`);
      }
    } catch (err: unknown) {
      onNotify(err instanceof Error ? `润色网络异常：${err.message}` : '润色请求失败');
    } finally {
      setPolishingKey(null);
    }
  };

  const handleAiExpandExperience = async (expIdx: number) => {
    const exp = data.experience[expIdx];
    if (!exp) return;

    const validation = validateExpandExperienceInput({
      company: exp.company,
      role: exp.role,
      subtitle: exp.subtitle,
    });
    if (!validation.ok) {
      const errMsg =
        validation.error || '请先填写「公司 / 团队」和「担任职位 / 岗位职责」，再触发经历扩充。';
      setExpExpandMap((prev) => ({
        ...prev,
        [exp.id]: {
          loading: false,
          error: errMsg,
          showAiFallback: false,
          suggestions: [],
        },
      }));
      onNotify(errMsg);
      return;
    }

    setExpExpandMap((prev) => ({
      ...prev,
      [exp.id]: {
        loading: true,
        error: null,
        showAiFallback: false,
        suggestions: prev[exp.id]?.suggestions || [],
        modelUsed: prev[exp.id]?.modelUsed,
      },
    }));

    try {
      const resp = await fetch('/api/ai/expand-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: exp.company,
          role: exp.role,
          subtitle: exp.subtitle,
          existingBullets: exp.bullets,
          industryLabel: activeKit.label,
          ...buildAiRequestDefaults(customConfig, selectedProvider),
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg =
          typeof json.error === 'string' && json.error.trim()
            ? json.error.trim()
            : `AI 经历扩充失败 (HTTP ${resp.status})`;
        setExpExpandMap((prev) => ({
          ...prev,
          [exp.id]: {
            loading: false,
            error: msg,
            showAiFallback: resp.status !== 400,
            suggestions: [],
          },
        }));
        onNotify(msg);
        return;
      }

      const normalized = normalizeStarSuggestions(json);
      if (normalized.length === 0) {
        const emptyMsg = 'AI 返回结果中没有可用的 STAR 经历建议，请重试或换一个模型。';
        setExpExpandMap((prev) => ({
          ...prev,
          [exp.id]: {
            loading: false,
            error: emptyMsg,
            showAiFallback: true,
            suggestions: [],
          },
        }));
        onNotify(emptyMsg);
        return;
      }

      setExpExpandMap((prev) => ({
        ...prev,
        [exp.id]: {
          loading: false,
          error: null,
          showAiFallback: false,
          suggestions: normalized,
          modelUsed: typeof json?.meta?.model === 'string' ? json.meta.model : undefined,
        },
      }));
      onNotify(`已基于 STAR 原则生成 ${normalized.length} 条补充经历建议`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? `AI 经历扩充请求异常：${err.message}`
          : 'AI 经历扩充网络请求失败，请检查网络连接或 AI 接口配置。';
      setExpExpandMap((prev) => ({
        ...prev,
        [exp.id]: {
          loading: false,
          error: msg,
          showAiFallback: true,
          suggestions: [],
        },
      }));
      onNotify(msg);
    }
  };

  const handleCopyExpandPrompt = async (expIdx: number) => {
    const exp = data.experience[expIdx];
    if (!exp) return;
    const prompt = buildExpandExperiencePrompt({
      company: exp.company,
      role: exp.role,
      subtitle: exp.subtitle,
      existingBullets: exp.bullets,
      industryLabel: activeKit.label,
    });
    try {
      await navigator.clipboard.writeText(prompt);
      onNotify('已复制 STAR 经历扩充 Prompt，可粘贴到任意外部 AI 后把 JSON 粘回解析');
    } catch {
      onNotify('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const handleImportExternalExpandJson = (expId: string, rawJson: string) => {
    try {
      const parsed = parseExternalExpandExperienceJson(rawJson);
      setExpExpandMap((prev) => ({
        ...prev,
        [expId]: {
          loading: false,
          error: null,
          showAiFallback: false,
          suggestions: parsed,
          modelUsed: '外部 AI 导入',
        },
      }));
      onNotify(`已导入 ${parsed.length} 条外部 AI 生成的 STAR 补充经历`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'JSON 解析失败';
      setExpExpandMap((prev) => ({
        ...prev,
        [expId]: {
          loading: false,
          error: msg,
          showAiFallback: true,
          suggestions: [],
        },
      }));
      onNotify(msg);
    }
  };

  const handleQuickAddModulePreset = (preset: (typeof MODULE_PRESETS)[number]) => {
    const newId = nid('cm');
    onMutate((d) => {
      d.data.custom.push({
        id: newId,
        title: preset.title,
        kind: preset.kind,
        show: true,
        items: blankItems(preset.kind),
      });
      d.meta.order.push(`custom:${newId}`);
    }, true);
    onSelectModule(`custom:${newId}`);
  };

  const moduleTabs = [
    ...FIXED_KEYS.map((k) => ({ key: k, label: FIXED_MODULE_LABELS[k] })),
    ...data.custom.map((cm) => ({ key: `custom:${cm.id}`, label: cm.title || '自定义模块' })),
  ];

  const isFixedTitled = activeModule !== 'basic' && !activeModule.startsWith('custom:');

  const renderSectionTitleBar = () => {
    if (!isFixedTitled) return null;
    const customTitle = meta.titles?.[activeModule] || '';
    const isHidden = Boolean(meta.hidden?.[activeModule]);
    return (
      <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label
            htmlFor={`sec-title-${activeModule}`}
            className="text-[11px] font-medium text-slate-500 whitespace-nowrap"
          >
            模块标题
          </label>
          <input
            id={`sec-title-${activeModule}`}
            type="text"
            value={customTitle}
            placeholder={defSecTitle(activeModule)}
            onChange={(e) => {
              const v = e.target.value;
              onMutate((d) => {
                d.meta.titles[activeModule] = v;
              }, false);
            }}
            className="w-full min-w-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap shrink-0">
          <input
            type="checkbox"
            checked={!isHidden}
            onChange={(e) => {
              const visible = e.target.checked;
              onMutate((d) => {
                d.meta.hidden[activeModule] = !visible;
              }, true);
            }}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>显示</span>
        </label>
      </div>
    );
  };

  const renderBasicEditor = () => (
    <div className="space-y-4">
      {/* Photo block */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white text-[10px] text-slate-400">
            {data.basic.photo ? (
              <img src={data.basic.photo} alt="证件照缩略图" className="h-full w-full object-cover" />
            ) : (
              '无照片'
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-800">证件照（可选）</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              未上传时自动隐藏占位框，保持眉首干净利落。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            上传
          </button>
          {data.basic.photo && (
            <button
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.data.basic.photo = '';
                }, true)
              }
              aria-label="移除证件照"
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadPhoto(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Core inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="basic-name" className="block text-xs font-medium text-slate-700 mb-1">
            姓名
          </label>
          <input
            id="basic-name"
            type="text"
            value={data.basic.name}
            onChange={(e) =>
              onMutate((d) => {
                d.data.basic.name = e.target.value;
              }, false)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="basic-age" className="block text-xs font-medium text-slate-700 mb-1">
            年龄
          </label>
          <input
            id="basic-age"
            type="text"
            value={data.basic.age}
            placeholder="例如 26 岁"
            onChange={(e) =>
              onMutate((d) => {
                d.data.basic.age = e.target.value;
              }, false)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="basic-headline" className="block text-xs font-medium text-slate-700 mb-1">
          一句话定位标语
        </label>
        <input
          id="basic-headline"
          type="text"
          value={data.basic.headline}
          placeholder="目标岗位 | 核心背景 · 2项最强卖点"
          onChange={(e) =>
            onMutate((d) => {
              d.data.basic.headline = e.target.value;
            }, false)
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="basic-phone" className="block text-xs font-medium text-slate-700 mb-1">
            电话
          </label>
          <input
            id="basic-phone"
            type="text"
            value={data.basic.phone}
            onChange={(e) =>
              onMutate((d) => {
                d.data.basic.phone = e.target.value;
              }, false)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="basic-location" className="block text-xs font-medium text-slate-700 mb-1">
            现居城市
          </label>
          <input
            id="basic-location"
            type="text"
            value={data.basic.location}
            onChange={(e) =>
              onMutate((d) => {
                d.data.basic.location = e.target.value;
              }, false)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="basic-email" className="block text-xs font-medium text-slate-700 mb-1">
          电子邮箱
        </label>
        <input
          id="basic-email"
          type="email"
          value={data.basic.email}
          onChange={(e) =>
            onMutate((d) => {
              d.data.basic.email = e.target.value;
            }, false)
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
        />
      </div>

      {/* Extras */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-800">眉首附加信息</span>
          <button
            type="button"
            onClick={() =>
              onMutate((d) => {
                d.data.basic.extras.push({ id: nid('ex'), label: '', value: '' });
              }, true)
            }
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            新增字段
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {BASIC_EXTRA_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.data.basic.extras.push({ id: nid('ex'), label: p.label, value: p.placeholder });
                }, true)
              }
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              + {p.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {data.basic.extras.map((ex, idx) => (
            <div key={ex.id} className="flex items-center gap-1.5">
              <input
                type="text"
                aria-label={`附加字段名称 ${idx + 1}`}
                value={ex.label}
                placeholder="标签"
                onChange={(e) =>
                  onMutate((d) => {
                    d.data.basic.extras[idx].label = e.target.value;
                  }, false)
                }
                className="w-24 shrink-0 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              />
              <input
                type="text"
                aria-label={`附加字段内容 ${idx + 1}`}
                value={ex.value}
                placeholder="填写内容"
                onChange={(e) =>
                  onMutate((d) => {
                    d.data.basic.extras[idx].value = e.target.value;
                  }, false)
                }
                className="flex-1 min-w-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                aria-label={`删除附加字段 ${ex.label || idx + 1}`}
                onClick={() =>
                  onMutate((d) => {
                    d.data.basic.extras.splice(idx, 1);
                  }, true)
                }
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderIntentEditor = () => (
    <div className="space-y-3">
      <div>
        <label htmlFor="intent-pos" className="block text-xs font-medium text-slate-700 mb-1">
          目标岗位
        </label>
        <input
          id="intent-pos"
          type="text"
          value={data.intent.position}
          onChange={(e) =>
            onMutate((d) => {
              d.data.intent.position = e.target.value;
            }, false)
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="intent-city" className="block text-xs font-medium text-slate-700 mb-1">
          期望城市 / 区域
        </label>
        <input
          id="intent-city"
          type="text"
          value={data.intent.city}
          onChange={(e) =>
            onMutate((d) => {
              d.data.intent.city = e.target.value;
            }, false)
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="intent-salary" className="block text-xs font-medium text-slate-700 mb-1">
            期望薪资
          </label>
          <input
            id="intent-salary"
            type="text"
            value={data.intent.salary}
            onChange={(e) =>
              onMutate((d) => {
                d.data.intent.salary = e.target.value;
              }, false)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="intent-avail" className="block text-xs font-medium text-slate-700 mb-1">
            到岗时间
          </label>
          <input
            id="intent-avail"
            type="text"
            value={data.intent.availability}
            onChange={(e) =>
              onMutate((d) => {
                d.data.intent.availability = e.target.value;
              }, false)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  const renderExperienceEditor = () => (
    <div className="space-y-4">
      {/* Industry Writing Scene Switcher */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-800">行业写作辅助场景</span>
          <span className="text-[10px] text-slate-400">自动切换动词与句式提示</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {WRITING_INDUSTRY_ORDER.map((key) => {
            const kit = INDUSTRY_WRITING_KITS[key];
            const active = writingIndustry === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setWritingIndustry(key)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {kit.label}
              </button>
            );
          })}
        </div>
      </div>

      {data.experience.map((exp, idx) => (
        <div key={exp.id} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold text-slate-800">
              经历 {idx + 1} · {exp.company || '未命名'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={idx === 0}
                aria-label={`上移经历 ${idx + 1}`}
                onClick={() =>
                  onMutate((d) => {
                    const arr = d.data.experience;
                    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  }, true)
                }
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === data.experience.length - 1}
                aria-label={`下移经历 ${idx + 1}`}
                onClick={() =>
                  onMutate((d) => {
                    const arr = d.data.experience;
                    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                  }, true)
                }
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`删除经历 ${idx + 1}`}
                onClick={() =>
                  onMutate((d) => {
                    d.data.experience.splice(idx, 1);
                  }, true)
                }
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">公司 / 团队</label>
              <input
                type="text"
                value={exp.company}
                onChange={(e) =>
                  onMutate((d) => {
                    d.data.experience[idx].company = e.target.value;
                  }, false)
                }
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">担任职位</label>
              <input
                type="text"
                value={exp.role}
                onChange={(e) =>
                  onMutate((d) => {
                    d.data.experience[idx].role = e.target.value;
                  }, false)
                }
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">在职时间</span>
            <DateRangePicker
              idPrefix={`exp-${exp.id}`}
              value={exp.period}
              onChange={(val) =>
                onMutate((d) => {
                  d.data.experience[idx].period = val;
                }, false)
              }
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              一句话职责 / 价值概要
            </label>
            <input
              type="text"
              value={exp.subtitle}
              onChange={(e) =>
                onMutate((d) => {
                  d.data.experience[idx].subtitle = e.target.value;
                }, false)
              }
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Collapsible Optional KPI Highlights (cleanly tucked away for humanities/non-quant roles) */}
          <div className="pt-1 space-y-2">
            {(exp.kpis?.length || 0) === 0 && !expandedKpiIds[exp.id] ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-2.5 py-2">
                <span className="text-[10.5px] text-slate-500">{activeKit.kpiHint}</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedKpiIds((prev) => ({
                      ...prev,
                      [exp.id]: true,
                    }))
                  }
                  className="shrink-0 text-[11px] font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  + 添加指标条
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-600">
                    亮点成果指标条（选填，最多 3 项）
                  </span>
                  <div className="flex items-center gap-2">
                    {(exp.kpis?.length || 0) < 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          onMutate((d) => {
                            if (!d.data.experience[idx].kpis) d.data.experience[idx].kpis = [];
                            d.data.experience[idx].kpis!.push({ num: '', label: '' });
                          }, true)
                        }
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                      >
                        + 空白项
                      </button>
                    )}
                    {(exp.kpis?.length || 0) === 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedKpiIds((prev) => ({
                            ...prev,
                            [exp.id]: false,
                          }))
                        }
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        收起
                      </button>
                    )}
                  </div>
                </div>

                {(exp.kpis?.length || 0) < 3 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400 mr-0.5">快捷填入：</span>
                    {KPI_QUICK_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() =>
                          onMutate((d) => {
                            if (!d.data.experience[idx].kpis) d.data.experience[idx].kpis = [];
                            if (d.data.experience[idx].kpis!.length < 3) {
                              d.data.experience[idx].kpis!.push({ num: tpl.num, label: tpl.desc });
                            }
                          }, true)
                        }
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      >
                        + {tpl.label}
                      </button>
                    ))}
                  </div>
                )}

                {(exp.kpis || []).map((k, kIdx) => (
                  <div key={kIdx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label={`指标数值 ${kIdx + 1}`}
                      value={k.num}
                      placeholder="如 85%"
                      onChange={(e) =>
                        onMutate((d) => {
                          d.data.experience[idx].kpis![kIdx].num = e.target.value;
                        }, false)
                      }
                      className="w-20 shrink-0 rounded border border-slate-200 px-2 py-1 text-xs font-semibold tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      aria-label={`指标说明 ${kIdx + 1}`}
                      value={k.label}
                      placeholder="指标说明（6-10字最佳）"
                      onChange={(e) =>
                        onMutate((d) => {
                          d.data.experience[idx].kpis![kIdx].label = e.target.value;
                        }, false)
                      }
                      className="flex-1 min-w-0 rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label={`删除指标 ${kIdx + 1}`}
                      onClick={() =>
                        onMutate((d) => {
                          d.data.experience[idx].kpis!.splice(kIdx, 1);
                        }, true)
                      }
                      className="rounded p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Bullets with Industry-Aware Writing Assistance Toolbar */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[11px] font-medium text-slate-600">
                核心经历要点（{activeKit.label}辅助）
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={Boolean(expExpandMap[exp.id]?.loading)}
                  aria-label={`经历扩充 ${exp.company || `经历 ${idx + 1}`}`}
                  onClick={() => handleAiExpandExperience(idx)}
                  title="调用 AI 根据公司名称与岗位职责，自动生成 3 条 STAR 原则补充经历建议"
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-55 whitespace-nowrap transition-colors"
                >
                  {expExpandMap[exp.id]?.loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  经历扩充
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onMutate((d) => {
                      d.data.experience[idx].bullets.push('');
                    }, true)
                  }
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  <Plus className="h-3 w-3" />
                  新增要点
                </button>
              </div>
            </div>

            {expExpandMap[exp.id] && (
              <ExperienceStarPanel
                expLabel={exp.company || exp.role || `经历 ${idx + 1}`}
                loading={expExpandMap[exp.id].loading}
                error={expExpandMap[exp.id].error}
                showAiFallback={expExpandMap[exp.id].showAiFallback}
                suggestions={expExpandMap[exp.id].suggestions}
                modelUsed={expExpandMap[exp.id].modelUsed}
                existingBullets={exp.bullets}
                onAddSuggestion={(bullet) => {
                  onMutate((d) => {
                    d.data.experience[idx].bullets.push(bullet);
                  }, true);
                  onNotify('已将 STAR 补充经历加入当前工作要点（支持 Ctrl+Z 撤销）');
                }}
                onAddAllSuggestions={(bullets) => {
                  onMutate((d) => {
                    d.data.experience[idx].bullets.push(...bullets);
                  }, true);
                  onNotify(`已批量加入 ${bullets.length} 条 STAR 补充经历（支持 Ctrl+Z 撤销）`);
                }}
                onRegenerate={() => handleAiExpandExperience(idx)}
                onDismiss={() =>
                  setExpExpandMap((prev) => {
                    const next = { ...prev };
                    delete next[exp.id];
                    return next;
                  })
                }
                onCopyPrompt={() => handleCopyExpandPrompt(idx)}
                onImportExternalJson={(raw) => handleImportExternalExpandJson(exp.id, raw)}
                onOpenSettings={onOpenSettings}
                onNotify={onNotify}
              />
            )}

            <div className="space-y-2.5 mt-2">
              {exp.bullets.map((b, bIdx) => {
                const len = stripBold(b).trim().length;
                const weakHint = detectWeakBulletOpener(b);
                const polishKey = `${exp.id}-${bIdx}`;
                const isPolishing = polishingKey === polishKey;
                const textareaId = `exp-${exp.id}-b-${bIdx}`;
                const handleBoldWrap = () => {
                  const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
                  const s = el?.selectionStart ?? 0;
                  const e = el?.selectionEnd ?? 0;
                  const nextText = wrapTextWithBold(b, s, e);
                  onMutate((d) => {
                    d.data.experience[idx].bullets[bIdx] = nextText;
                  }, true);
                };
                const handleApplySkeleton = () => {
                  onMutate((d) => {
                    const prefix = d.data.experience[idx].bullets[bIdx].trim();
                    d.data.experience[idx].bullets[bIdx] = prefix
                      ? `${prefix}${activeKit.skeletonAppend}`
                      : activeKit.skeletonEmpty;
                  }, true);
                };
                return (
                  <div key={bIdx} className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-2 space-y-1.5">
                    {/* Writing Helper Mini-Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={handleBoldWrap}
                          title="选中文字后点击即可加粗，无需手打星号"
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Bold className="h-2.5 w-2.5" />
                          加粗
                        </button>
                        <button
                          type="button"
                          onClick={handleApplySkeleton}
                          title={`一键套用「${activeKit.label}」推荐句式`}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Wand2 className="h-2.5 w-2.5" />
                          {activeKit.skeletonLabel}
                        </button>
                        <button
                          type="button"
                          disabled={isPolishing}
                          onClick={() => handleAiPolishBullet(idx, bIdx)}
                          title={
                            anyAiReady
                              ? '调用你配置的 AI 一键精修此条表达（绝不编造数字，支持 Ctrl+Z 撤销）'
                              : '未配 API 时自动复制单条润色 Prompt'
                          }
                          className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {isPolishing ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-2.5 w-2.5" />
                          )}
                          AI 润色
                        </button>
                        {activeKit.verbs.slice(0, 3).map((verb) => (
                          <button
                            key={verb}
                            type="button"
                            onClick={() =>
                              onMutate((d) => {
                                d.data.experience[idx].bullets[bIdx] = `${d.data.experience[idx].bullets[bIdx]}${verb}`;
                              }, false)
                            }
                            className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            +{verb}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={bIdx === 0}
                          aria-label={`上移要点 ${bIdx + 1}`}
                          onClick={() =>
                            onMutate((d) => {
                              const arr = d.data.experience[idx].bullets;
                              [arr[bIdx - 1], arr[bIdx]] = [arr[bIdx], arr[bIdx - 1]];
                            }, true)
                          }
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-25"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={bIdx === exp.bullets.length - 1}
                          aria-label={`下移要点 ${bIdx + 1}`}
                          onClick={() =>
                            onMutate((d) => {
                              const arr = d.data.experience[idx].bullets;
                              [arr[bIdx + 1], arr[bIdx]] = [arr[bIdx], arr[bIdx + 1]];
                            }, true)
                          }
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-25"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      id={textareaId}
                      rows={3}
                      value={b}
                      placeholder={activeKit.placeholder}
                      onChange={(e) =>
                        onMutate((d) => {
                          d.data.experience[idx].bullets[bIdx] = e.target.value;
                        }, false)
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                    {weakHint && (
                      <div className="text-[10.5px] text-amber-700 leading-snug">
                        提示：{weakHint}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-mono tabular-nums ${
                          len > 82 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {len} 字{len > 82 ? '（建议精简至 70 字内）' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onMutate((d) => {
                            d.data.experience[idx].bullets.splice(bIdx, 1);
                          }, true)
                        }
                        className="text-slate-400 hover:text-red-600"
                      >
                        删除此条
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onMutate((d) => {
            d.data.experience.push({
              id: nid('exp'),
              company: '新公司名称',
              role: '职位名称',
              period: '2024.01 - 至今',
              subtitle: '',
              kpis: [],
              bullets: ['**核心成果**：补充行动与量化结果。'],
            });
          }, true)
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
      >
        <Plus className="h-3.5 w-3.5" />
        添加一段工作 / 实习经历
      </button>
    </div>
  );

  const renderSkillsEditor = () => (
    <div className="space-y-3">
      {data.skills.map((sk, idx) => (
        <div key={sk.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={sk.cat}
              placeholder="技能分类（如 数据处理）"
              onChange={(e) =>
                onMutate((d) => {
                  d.data.skills[idx].cat = e.target.value;
                }, false)
              }
              className="flex-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              aria-label={`删除技能组 ${idx + 1}`}
              onClick={() =>
                onMutate((d) => {
                  d.data.skills.splice(idx, 1);
                }, true)
              }
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            rows={2}
            value={sk.items}
            placeholder="具体工具与熟练程度"
            onChange={(e) =>
              onMutate((d) => {
                d.data.skills[idx].items = e.target.value;
              }, false)
            }
            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onMutate((d) => {
            d.data.skills.push({ id: nid('sk'), cat: '新技能分类', items: '' });
          }, true)
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        <Plus className="h-3.5 w-3.5" />
        添加技能分组
      </button>
    </div>
  );

  const renderEducationEditor = () => (
    <div className="space-y-3">
      {data.education.map((edu, idx) => (
        <div key={edu.id} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">教育背景 {idx + 1}</span>
            <button
              type="button"
              aria-label={`删除教育背景 ${idx + 1}`}
              onClick={() =>
                onMutate((d) => {
                  d.data.education.splice(idx, 1);
                }, true)
              }
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={edu.school}
              placeholder="学校名称"
              onChange={(e) =>
                onMutate((d) => {
                  d.data.education[idx].school = e.target.value;
                }, false)
              }
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <input
              type="text"
              value={edu.major}
              placeholder="专业名称"
              onChange={(e) =>
                onMutate((d) => {
                  d.data.education[idx].major = e.target.value;
                }, false)
              }
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={edu.degree}
              placeholder="学历（如 全日制本科）"
              onChange={(e) =>
                onMutate((d) => {
                  d.data.education[idx].degree = e.target.value;
                }, false)
              }
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <input
              type="text"
              value={edu.period}
              placeholder="2018.09 - 2022.06"
              onChange={(e) =>
                onMutate((d) => {
                  d.data.education[idx].period = e.target.value;
                }, false)
              }
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <textarea
            rows={2}
            value={edu.desc}
            placeholder="主修课程、荣誉或补充说明（选填）"
            onChange={(e) =>
              onMutate((d) => {
                d.data.education[idx].desc = e.target.value;
              }, false)
            }
            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onMutate((d) => {
            d.data.education.push({
              id: nid('edu'),
              school: '',
              major: '',
              degree: '本科',
              period: '2018.09 - 2022.06',
              desc: '',
            });
          }, true)
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        <Plus className="h-3.5 w-3.5" />
        添加教育背景
      </button>
    </div>
  );

  const renderStringListEditor = (field: 'certs' | 'tags', placeholder: string, addLabel: string) => (
    <div className="space-y-2">
      {data[field].map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(e) =>
              onMutate((d) => {
                d.data[field][idx] = e.target.value;
              }, false)
            }
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
          <button
            type="button"
            aria-label={`删除条目 ${idx + 1}`}
            onClick={() =>
              onMutate((d) => {
                d.data[field].splice(idx, 1);
              }, true)
            }
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onMutate((d) => {
            d.data[field].push('');
          }, true)
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );

  const renderEvalsEditor = () => (
    <div className="space-y-3">
      {data.evals.map((ev, idx) => (
        <div key={ev.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={ev.title}
              placeholder="亮点标题"
              onChange={(e) =>
                onMutate((d) => {
                  d.data.evals[idx].title = e.target.value;
                }, false)
              }
              className="flex-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              aria-label={`删除自我评价 ${idx + 1}`}
              onClick={() =>
                onMutate((d) => {
                  d.data.evals.splice(idx, 1);
                }, true)
              }
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            rows={2}
            value={ev.body}
            placeholder="具体阐述优势与业务价值"
            onChange={(e) =>
              onMutate((d) => {
                d.data.evals[idx].body = e.target.value;
              }, false)
            }
            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onMutate((d) => {
            d.data.evals.push({ id: nid('ev'), title: '', body: '' });
          }, true)
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        <Plus className="h-3.5 w-3.5" />
        添加一条自我评价
      </button>
    </div>
  );

  const renderCustomEditor = (cid: string) => {
    const cmIndex = data.custom.findIndex((c) => c.id === cid);
    if (cmIndex === -1) return null;
    const cm: CustomModule = data.custom[cmIndex];

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cm.title}
              placeholder="自定义模块标题"
              onChange={(e) =>
                onMutate((d) => {
                  d.data.custom[cmIndex].title = e.target.value;
                }, false)
              }
              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onDeleteCustomModule(cm.id)}
              aria-label="删除此自定义模块"
              className="rounded-md border border-red-200 bg-white px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              删除
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <select
              aria-label="模块排版类型"
              value={cm.kind}
              onChange={(e) => {
                const nextKind = e.target.value as CustomModuleKind;
                onMutate((d) => {
                  d.data.custom[cmIndex].kind = nextKind;
                  d.data.custom[cmIndex].items = blankItems(nextKind);
                }, true);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
            >
              {CUSTOM_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={cm.show}
                onChange={(e) =>
                  onMutate((d) => {
                    d.data.custom[cmIndex].show = e.target.checked;
                  }, true)
                }
                className="rounded border-slate-300 text-blue-600"
              />
              <span>在简历上显示</span>
            </label>
          </div>
        </div>

        {(cm.kind === 'tags' || cm.kind === 'bullets' || cm.kind === 'text') && (
          <div className="space-y-2">
            {(cm.items as string[]).map((val, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                {cm.kind === 'tags' ? (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      onMutate((d) => {
                        (d.data.custom[cmIndex].items as string[])[idx] = e.target.value;
                      }, false)
                    }
                    className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                  />
                ) : (
                  <textarea
                    rows={2}
                    value={val}
                    onChange={(e) =>
                      onMutate((d) => {
                        (d.data.custom[cmIndex].items as string[])[idx] = e.target.value;
                      }, false)
                    }
                    className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    onMutate((d) => {
                      d.data.custom[cmIndex].items.splice(idx, 1);
                    }, true)
                  }
                  className="rounded p-1.5 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.data.custom[cmIndex].items.push('');
                }, true)
              }
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              新增一条
            </button>
          </div>
        )}

        {cm.kind === 'titled' && (
          <div className="space-y-2.5">
            {(cm.items as TitledItem[]).map((it, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={it.title}
                    placeholder="标题"
                    onChange={(e) =>
                      onMutate((d) => {
                        (d.data.custom[cmIndex].items as TitledItem[])[idx].title = e.target.value;
                      }, false)
                    }
                    className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onMutate((d) => {
                        d.data.custom[cmIndex].items.splice(idx, 1);
                      }, true)
                    }
                    className="rounded p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={it.body}
                  placeholder="正文内容"
                  onChange={(e) =>
                    onMutate((d) => {
                      (d.data.custom[cmIndex].items as TitledItem[])[idx].body = e.target.value;
                    }, false)
                  }
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.data.custom[cmIndex].items.push({ title: '', body: '' });
                }, true)
              }
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              新增图文条
            </button>
          </div>
        )}

        {cm.kind === 'cases' && (
          <div className="space-y-3">
            {(cm.items as CaseItem[]).map((c, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c.title}
                    placeholder="案例标题"
                    onChange={(e) =>
                      onMutate((d) => {
                        (d.data.custom[cmIndex].items as CaseItem[])[idx].title = e.target.value;
                      }, false)
                    }
                    className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onMutate((d) => {
                        d.data.custom[cmIndex].items.splice(idx, 1);
                      }, true)
                    }
                    className="rounded p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {(['bg', 'action', 'result', 'evidence'] as const).map((field) => (
                  <input
                    key={field}
                    type="text"
                    value={c[field]}
                    placeholder={
                      field === 'bg'
                        ? '背景与痛点'
                        : field === 'action'
                          ? '关键行动与工具'
                          : field === 'result'
                            ? '量化结果'
                            : '作品链接 / 佐证材料'
                    }
                    onChange={(e) =>
                      onMutate((d) => {
                        (d.data.custom[cmIndex].items as CaseItem[])[idx][field] = e.target.value;
                      }, false)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                  />
                ))}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onMutate((d) => {
                  d.data.custom[cmIndex].items.push(blankCase());
                }, true)
              }
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              新增案例卡片
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Horizontal quick-jump module strip */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500">
            选择编辑模块（也可直接点击右侧简历画布定位）
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {moduleTabs.map((tab) => {
            const active = activeModule === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectModule(tab.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 1-click Commercial Industry Module Presets */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[10.5px] text-slate-400 mr-0.5">+ 行业模块：</span>
          {MODULE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.hint}
              onClick={() => handleQuickAddModulePreset(preset)}
              className="rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 text-[10.5px] text-slate-600 hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap"
            >
              + {preset.title}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        {renderSectionTitleBar()}
        {activeModule === 'basic' && renderBasicEditor()}
        {activeModule === 'intent' && renderIntentEditor()}
        {activeModule === 'experience' && renderExperienceEditor()}
        {activeModule === 'skills' && renderSkillsEditor()}
        {activeModule === 'education' && renderEducationEditor()}
        {activeModule === 'certs' &&
          renderStringListEditor('certs', '如：全国计算机二级 / CET-4', '添加资质证书')}
        {activeModule === 'tags' &&
          renderStringListEditor('tags', '如：Python 批处理 / 飞书多维表格', '添加核心标签')}
        {activeModule === 'evals' && renderEvalsEditor()}
        {activeModule.startsWith('custom:') && renderCustomEditor(activeModule.slice(7))}
      </div>
    </div>
  );
}
