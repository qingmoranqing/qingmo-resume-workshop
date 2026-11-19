import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CompetitivenessRadarPanel } from './components/CompetitivenessRadarPanel';
import { LeftWorkbench } from './components/LeftWorkbench';
import { ModalDialog, type ModalConfig } from './components/ModalDialog';
import { OnboardingGuideModal } from './components/OnboardingGuideModal';
import { PdfPreflightModal } from './components/PdfPreflightModal';
import { ResumeCanvas } from './components/ResumeCanvas';
import { ResumeImportModal } from './components/ResumeImportModal';
import { SettingsModal } from './components/SettingsModal';
import { TemplateGalleryModal } from './components/TemplateGalleryModal';
import { TopBar } from './components/TopBar';
import { DEFAULT_RESUMES } from './data/defaultResumes';
import {
  applyEnglishTranslation,
  findBilingualPair,
  normalizeBilingual,
} from './utils/bilingual';
import { evaluateResumeCompetitiveness } from './utils/competitiveness';
import type {
  AiConfigSaveResult,
  AiProviderId,
  AiProviderInfo,
  CustomAiConfig,
  ResumeDoc,
  TailorProposal,
  TranslatedResumePayload,
  WorkbenchTab,
} from './types/resume';
import {
  applyTailorProposal,
  applyTemplateStyleOnly,
  buildPdfTitle,
  clearPlaceholderContent,
  cloneResumeDoc,
  createCustomRoleDoc,
  deriveTargetedResumeVersion,
  emptyData,
  formatMarkdown,
  formatPlainText,
  formatWordHtml,
  isCustomAiReady,
  maskEmail,
  maskPhone,
  mergeImportedResumes,
  nid,
  normalizeData,
  normalizeLineage,
  normalizeMeta,
  runLocalAudit,
  runPdfExportPreflight,
  validateCustomAiConfig,
} from './utils/resumeLogic';

const STORAGE_KEY = 'resume_studio_v5_data';
const ONBOARDING_SEEN_KEY = 'resume_studio_onboarding_seen_v1';
const BYOK_AI_CONFIG_KEY = 'resume_studio_byok_ai_config_v1';
const MAX_HISTORY = 30;

const DEFAULT_CUSTOM_AI: CustomAiConfig = {
  enabled: false,
  protocol: 'openai',
  baseUrl: '',
  apiKey: '',
  model: '',
  fetchedModels: [],
  savedModels: [],
};

function loadCustomAiConfig(): CustomAiConfig {
  try {
    const raw = localStorage.getItem(BYOK_AI_CONFIG_KEY);
    if (!raw) return DEFAULT_CUSTOM_AI;
    const parsed = JSON.parse(raw) as Partial<CustomAiConfig>;
    const candidate: CustomAiConfig = {
      enabled: Boolean(parsed.enabled),
      protocol: parsed.protocol === 'anthropic' ? 'anthropic' : 'openai',
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
      fetchedModels: Array.isArray(parsed.fetchedModels)
        ? parsed.fetchedModels.filter((x): x is string => typeof x === 'string')
        : [],
      savedModels: Array.isArray(parsed.savedModels)
        ? parsed.savedModels.filter((x): x is string => typeof x === 'string')
        : [],
      lastVerifiedAt:
        typeof parsed.lastVerifiedAt === 'string' ? parsed.lastVerifiedAt : undefined,
    };
    const check = validateCustomAiConfig(candidate);
    if (candidate.enabled && check.valid) {
      return { ...check.normalized, enabled: true };
    }
    return { ...candidate, enabled: false };
  } catch {
    return DEFAULT_CUSTOM_AI;
  }
}

interface StoredPayload {
  activeId: string;
  resumes: ResumeDoc[];
}

function loadInitialState(): StoredPayload {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        activeId: DEFAULT_RESUMES[0].id,
        resumes: DEFAULT_RESUMES.map(cloneResumeDoc),
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    if (!Array.isArray(parsed.resumes) || parsed.resumes.length === 0) {
      return {
        activeId: DEFAULT_RESUMES[0].id,
        resumes: DEFAULT_RESUMES.map(cloneResumeDoc),
      };
    }
    const normalized = parsed.resumes.map((r) => {
      const lineage = normalizeLineage(r.lineage);
      const bilingual = normalizeBilingual(r.bilingual);
      return {
        id: r.id || nid('resume'),
        name: r.name || '未命名版本',
        meta: normalizeMeta(r.meta),
        data: normalizeData(r.data),
        ...(lineage ? { lineage } : {}),
        ...(bilingual ? { bilingual } : {}),
      };
    });
    const activeExists = normalized.some((r) => r.id === parsed.activeId);
    return {
      activeId: activeExists && parsed.activeId ? parsed.activeId : normalized[0].id,
      resumes: normalized,
    };
  } catch {
    return {
      activeId: DEFAULT_RESUMES[0].id,
      resumes: DEFAULT_RESUMES.map(cloneResumeDoc),
    };
  }
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);
  const [resumes, setResumes] = useState<ResumeDoc[]>(initial.resumes);
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('content');
  const [activeModule, setActiveModule] = useState<string>('basic');
  const [workbenchOpen, setWorkbenchOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [radarOpen, setRadarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true,
  );

  // History stacks per session
  const [past, setPast] = useState<ResumeDoc[][]>([]);
  const [future, setFuture] = useState<ResumeDoc[][]>([]);
  const lastTypingCommitRef = useRef<number>(0);

  // Preview scaling, B&W preview, privacy redaction & autofit measurement
  const [previewScale, setPreviewScale] = useState<number>(0.85);
  const [zoomOffset, setZoomOffset] = useState<number>(0);
  const [fitScale, setFitScale] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(1);
  const [fillPct, setFillPct] = useState<number>(85);
  const [bwPreview, setBwPreview] = useState<boolean>(false);
  const [privacyMask, setPrivacyMask] = useState<boolean>(false);
  const pvPageRef = useRef<HTMLDivElement | null>(null);
  const pvInnerRef = useRef<HTMLDivElement | null>(null);

  // Open-source self-hosted + browser BYOK AI configuration
  const [providers, setProviders] = useState<AiProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId>('auto');
  const [customAiConfig, setCustomAiConfig] = useState<CustomAiConfig>(() => loadCustomAiConfig());

  // Once-only onboarding guide, Template Gallery, Raw Text Importer, Modal & Toast
  const [guideOpen, setGuideOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.location.search.includes('autostart=1')) return false;
    try {
      return !localStorage.getItem(ONBOARDING_SEEN_KEY);
    } catch {
      return false;
    }
  });
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState<boolean>(false);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [pdfPreflightOpen, setPdfPreflightOpen] = useState<boolean>(false);
  const [comparePair, setComparePair] = useState<{
    baseId: string;
    targetId: string;
    nonce: number;
  } | null>(null);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const activeDoc = useMemo(
    () => resumes.find((r) => r.id === activeId) || resumes[0],
    [resumes, activeId],
  );
  const competitivenessReport = useMemo(
    () => evaluateResumeCompetitiveness(activeDoc),
    [activeDoc],
  );

  // Refs for clean top-level state transitions (avoids nested setState inside React updaters)
  const resumesRef = useRef<ResumeDoc[]>(resumes);
  resumesRef.current = resumes;
  const activeIdRef = useRef<string>(activeDoc.id);
  activeIdRef.current = activeDoc.id;
  const pastRef = useRef<ResumeDoc[][]>(past);
  pastRef.current = past;
  const futureRef = useRef<ResumeDoc[][]>(future);
  futureRef.current = future;
  const quotaWarnedRef = useRef<boolean>(false);

  const pushHistorySnapshot = useCallback((snapshot: ResumeDoc[]) => {
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), snapshot.map(cloneResumeDoc)]);
    setFuture([]);
  }, []);

  // Persist to localStorage with visible warning if browser quota is exceeded (e.g. many large photos)
  useEffect(() => {
    try {
      const payload: StoredPayload = { activeId: activeDoc.id, resumes };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      quotaWarnedRef.current = false;
    } catch {
      if (!quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        notify('浏览器本地存储空间已满，请先「导出全部 JSON 备份」并删除冗余版本或更换较小证件照');
      }
    }
  }, [resumes, activeDoc.id, notify]);

  // Validate and persist browser BYOK AI config to localStorage, enabling zero-restart dynamic model switching
  const customAiConfigRef = useRef<CustomAiConfig>(customAiConfig);
  customAiConfigRef.current = customAiConfig;

  const handleSaveCustomAiConfig = useCallback(
    (draft: CustomAiConfig): AiConfigSaveResult => {
      const validation = validateCustomAiConfig({ ...draft, enabled: true });
      if (!validation.valid) {
        return { ok: false, validation };
      }
      const prevSaved = customAiConfigRef.current.savedModels || [];
      const mergedSavedModels = [
        validation.normalized.model,
        ...prevSaved.filter((m) => m && m !== validation.normalized.model),
      ].slice(0, 8);

      const next: CustomAiConfig = {
        ...validation.normalized,
        enabled: true,
        savedModels: mergedSavedModels,
      };
      try {
        localStorage.setItem(BYOK_AI_CONFIG_KEY, JSON.stringify(next));
      } catch {
        notify('浏览器本地存储空间不足，本次配置仅在当前会话生效');
      }
      customAiConfigRef.current = next;
      setCustomAiConfig(next);
      notify(`AI 默认接口已生效：${next.model}（已保存至本地，无需重启）`);
      return {
        ok: true,
        validation: {
          ...validation,
          normalized: next,
        },
      };
    },
    [notify],
  );

  const handleClearCustomAiConfig = useCallback(() => {
    try {
      localStorage.removeItem(BYOK_AI_CONFIG_KEY);
    } catch {
      // ignore storage errors
    }
    customAiConfigRef.current = DEFAULT_CUSTOM_AI;
    setCustomAiConfig(DEFAULT_CUSTOM_AI);
    notify('已清除本地保存的自定义 AI 接口配置');
  }, [notify]);

  const handleDismissGuide = useCallback(() => {
    setGuideOpen(false);
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // ignore storage quota errors
    }
  }, []);

  // Discover available self-hosted server AI providers
  const refreshAiProviders = useCallback(() => {
    fetch('/api/ai/providers')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (Array.isArray(json?.providers)) {
          setProviders(json.providers as AiProviderInfo[]);
        }
      })
      .catch(() => {
        // offline or standalone fallback
      });
  }, []);

  useEffect(() => {
    refreshAiProviders();
  }, [refreshAiProviders]);

  // Responsive previewScale calculation (accounts for left workbench and right radar panel)
  useEffect(() => {
    const computeScale = () => {
      const vw = window.innerWidth;
      const isDesktop = vw >= 1024;
      const isWideDesktop = vw >= 1280;
      const sidebarW = isDesktop && workbenchOpen ? 416 : 0;
      const radarW = isWideDesktop && radarOpen ? 276 : 0;
      const availableW = Math.max(320, vw - sidebarW - radarW - (isDesktop ? 64 : 28));
      const ideal = Math.min(1.0, availableW / 794);
      setPreviewScale(Math.max(0.42, Number(ideal.toFixed(3))));
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, [workbenchOpen, radarOpen]);

  // Auto-fit 1-page measurement (also re-measures after Web Fonts finish loading or privacy mask toggles)
  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const inner = pvInnerRef.current;
      if (!inner) return;
      const prevTransform = inner.style.transform;
      const prevWidth = inner.style.width;
      const prevMinHeight = inner.style.minHeight;
      inner.style.transform = 'none';
      inner.style.width = '100%';
      inner.style.minHeight = '1123px';
      const naturalH = inner.scrollHeight;
      inner.style.transform = prevTransform;
      inner.style.width = prevWidth;
      inner.style.minHeight = prevMinHeight;

      const pages = Math.max(1, Math.ceil((naturalH - 6) / 1123));
      setPageCount(pages);
      setFillPct(Math.max(10, Math.round((naturalH / 1123) * 100)));

      if (activeDoc.meta.autofit && naturalH > 1123) {
        const nextFit = Math.max(0.76, Math.min(1, 1118 / naturalH));
        setFitScale(Number(nextFit.toFixed(4)));
      } else {
        setFitScale(1);
      }
    };
    const raf = window.requestAnimationFrame(measure);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) window.requestAnimationFrame(measure);
      });
    }
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [activeDoc, privacyMask]);

  // Mutate active document with smart history coalescing (pure top-level updates, zero nested setState)
  const handleMutate = useCallback(
    (mutator: (draft: ResumeDoc) => void, recordHistory = true) => {
      const currentResumes = resumesRef.current;
      const currentActiveId = activeIdRef.current;
      const now = Date.now();
      const shouldSnapshot = recordHistory || now - lastTypingCommitRef.current > 1200;
      if (shouldSnapshot) {
        lastTypingCommitRef.current = now;
        pushHistorySnapshot(currentResumes);
      }
      const nextResumes = currentResumes.map((r) => {
        if (r.id !== currentActiveId) return r;
        const next = cloneResumeDoc(r);
        mutator(next);
        return next;
      });
      resumesRef.current = nextResumes;
      setResumes(nextResumes);
    },
    [pushHistorySnapshot],
  );

  const handleUndo = useCallback(() => {
    const currentPast = pastRef.current;
    if (currentPast.length === 0) return;
    const previous = currentPast[currentPast.length - 1];
    const currentResumes = resumesRef.current;
    const nextPast = currentPast.slice(0, -1);
    const nextFuture = [currentResumes.map(cloneResumeDoc), ...futureRef.current.slice(0, MAX_HISTORY - 1)];

    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    resumesRef.current = previous;

    setPast(nextPast);
    setFuture(nextFuture);
    setResumes(previous);
    if (!previous.some((r) => r.id === activeIdRef.current)) {
      activeIdRef.current = previous[0].id;
      setActiveId(previous[0].id);
    }
    notify('已撤销上一步操作');
  }, [notify]);

  const handleRedo = useCallback(() => {
    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return;
    const next = currentFuture[0];
    const currentResumes = resumesRef.current;
    const nextFuture = currentFuture.slice(1);
    const nextPast = [...pastRef.current.slice(-(MAX_HISTORY - 1)), currentResumes.map(cloneResumeDoc)];

    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    resumesRef.current = next;

    setPast(nextPast);
    setFuture(nextFuture);
    setResumes(next);
    if (!next.some((r) => r.id === activeIdRef.current)) {
      activeIdRef.current = next[0].id;
      setActiveId(next[0].id);
    }
    notify('已重做操作');
  }, [notify]);

  // Global keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z / Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isEditingField) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === 'Escape') {
        if (modal) setModal(null);
        else if (pdfPreflightOpen) setPdfPreflightOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else if (importModalOpen) setImportModalOpen(false);
        else if (guideOpen) handleDismissGuide();
        else if (templateGalleryOpen) setTemplateGalleryOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleUndo,
    handleRedo,
    modal,
    pdfPreflightOpen,
    settingsOpen,
    importModalOpen,
    guideOpen,
    handleDismissGuide,
    templateGalleryOpen,
  ]);

  const localChecks = useMemo(
    () => runLocalAudit(activeDoc, pageCount),
    [activeDoc, pageCount],
  );
  const pdfPreflightReport = useMemo(
    () => (pdfPreflightOpen ? runPdfExportPreflight(activeDoc, pageCount, fillPct) : null),
    [pdfPreflightOpen, activeDoc, pageCount, fillPct],
  );
  const auditAlertCount = localChecks.filter((c) => c.lv === 'err' || c.lv === 'warn').length;

  const handleSelectModuleFromCanvas = useCallback((modKey: string) => {
    setActiveModule(modKey);
    setActiveTab('content');
    setWorkbenchOpen(true);
  }, []);

  const handleJumpFromAudit = useCallback((target: string) => {
    setWorkbenchOpen(true);
    if (target === 'design') {
      setActiveTab('design');
      return;
    }
    setActiveModule(target);
    setActiveTab('content');
  }, []);

  const handleUploadPhoto = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 320;
          const ratio = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
          handleMutate((d) => {
            d.data.basic.photo = dataUrl;
          }, true);
          notify('已更新证件照');
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    },
    [handleMutate, notify],
  );

  const handleDeleteCustomModule = useCallback(
    (id: string) => {
      handleMutate((d) => {
        d.data.custom = d.data.custom.filter((c) => c.id !== id);
        d.meta.order = d.meta.order.filter((k) => k !== `custom:${id}`);
      }, true);
      setActiveModule('basic');
      notify('已删除自定义模块');
    },
    [handleMutate, notify],
  );

  const handleApplyTailorProposal = useCallback(
    (proposal: TailorProposal, mode: 'new-version' | 'in-place') => {
      if (mode === 'new-version') {
        const created = applyTailorProposal(activeDoc, proposal, 'new-version');
        setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), resumes.map(cloneResumeDoc)]);
        setFuture([]);
        setResumes((prev) => [...prev, created]);
        setActiveId(created.id);
        notify(`已生成并切换到新版本「${created.name}」`);
      } else {
        const updated = applyTailorProposal(activeDoc, proposal, 'in-place');
        setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), resumes.map(cloneResumeDoc)]);
        setFuture([]);
        setResumes((prev) => prev.map((r) => (r.id === activeDoc.id ? updated : r)));
        notify('已应用换岗改写方案到当前版本（可 Ctrl+Z 撤销）');
      }
    },
    [activeDoc, resumes, notify],
  );

  const handleDuplicateResume = () => {
    const copy = cloneResumeDoc(activeDoc);
    copy.id = nid('resume');
    copy.name = `${activeDoc.name}（副本）`;
    pushHistorySnapshot(resumes);
    setResumes((prev) => [...prev, copy]);
    setActiveId(copy.id);
    notify(`已复制版本「${copy.name}」`);
  };

  const handleDeriveVersion = (sourceDoc: ResumeDoc, targetRole?: string) => {
    const derived = deriveTargetedResumeVersion(sourceDoc, {
      targetRole,
      existingNames: resumes.map((r) => r.name),
    });
    pushHistorySnapshot(resumes);
    setResumes((prev) => [...prev, derived]);
    setActiveId(derived.id);
    notify(
      `已生成「${derived.name}」（已自动标记原版职位：${derived.lineage?.parentPosition || sourceDoc.name}）`
    );
  };

  const handleCompareVersions = (baseId: string, targetId: string) => {
    setComparePair({ baseId, targetId, nonce: Date.now() });
    setActiveId(targetId);
    setActiveTab('compare');
    setWorkbenchOpen(true);
  };

  const handleApplyEnglishTranslation = useCallback(
    (sourceZhDoc: ResumeDoc, translated: TranslatedResumePayload, modelUsed?: string) => {
      const currentList = resumesRef.current;
      const existingPair = findBilingualPair(currentList, sourceZhDoc);
      const existingEnId =
        existingPair.direction === 'to-en' && existingPair.sibling
          ? existingPair.sibling.id
          : undefined;

      const enDoc = applyEnglishTranslation(sourceZhDoc, translated, {
        existingNames: currentList.map((r) => r.name),
        existingEnId,
        modelUsed,
      });

      pushHistorySnapshot(currentList);
      if (existingEnId) {
        setResumes((prev) => prev.map((r) => (r.id === existingEnId ? enDoc : r)));
        setActiveId(enDoc.id);
        notify(`已同步更新英文专业版「${enDoc.name}」（原中文版完整保留）`);
      } else {
        setResumes((prev) => [...prev, enDoc]);
        setActiveId(enDoc.id);
        notify(`已生成英文专业版「${enDoc.name}」（原中文版完整保留，可随时一键切回）`);
      }
    },
    [pushHistorySnapshot, notify],
  );

  const handleCreateBlankResume = () => {
    setModal({
      title: '新建空白简历版本',
      message: '为新投递方向起一个容易分辨的名称（会保留你的基础联系方式）：',
      inputPlaceholder: '例如：产品运营专员 · 广州',
      confirmLabel: '创建并切换',
      onConfirm: (name) => {
        const created: ResumeDoc = {
          id: nid('resume'),
          name: name || '新岗位简历',
          meta: normalizeMeta({ template: activeDoc.meta.template, theme: activeDoc.meta.theme }),
          data: {
            ...emptyData(),
            basic: {
              ...emptyData().basic,
              name: activeDoc.data.basic.name,
              phone: activeDoc.data.basic.phone,
              email: activeDoc.data.basic.email,
              location: activeDoc.data.basic.location,
              age: activeDoc.data.basic.age,
            },
          },
        };
        pushHistorySnapshot(resumes);
        setResumes((prev) => [...prev, created]);
        setActiveId(created.id);
        setActiveTab('content');
        setActiveModule('basic');
        notify(`已创建「${created.name}」`);
      },
    });
  };

  const handleRenameResume = () => {
    setModal({
      title: '重命名当前简历版本',
      message: '修改版本显示名称，不会影响简历正文内容：',
      inputPlaceholder: '输入新版本名称',
      initialValue: activeDoc.name,
      confirmLabel: '保存名称',
      onConfirm: (nextName) => {
        if (!nextName) return;
        handleMutate((d) => {
          d.name = nextName;
        }, true);
        notify('已更新版本名称');
      },
    });
  };

  const handleDeleteResume = () => {
    if (resumes.length <= 1) return;
    setModal({
      title: '删除简历版本',
      message: `确定要删除「${activeDoc.name}」吗？删除后可通过撤销（Ctrl+Z）找回。`,
      confirmLabel: '确认删除',
      danger: true,
      onConfirm: () => {
        pushHistorySnapshot(resumes);
        const remaining = resumes.filter((r) => r.id !== activeDoc.id);
        setResumes(remaining);
        setActiveId(remaining[0].id);
        notify('已删除该简历版本');
      },
    });
  };

  const handleExportSingleJson = () => {
    const blob = new Blob([JSON.stringify({ activeId: activeDoc.id, resumes: [activeDoc] }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${buildPdfTitle(activeDoc)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`已导出单份简历 JSON：「${activeDoc.name}」`);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ activeId: activeDoc.id, resumes }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('已导出全部简历 JSON 备份');
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const list = Array.isArray(parsed?.resumes)
          ? parsed.resumes
          : Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === 'object' && parsed.data
              ? [parsed]
              : null;
        if (!list || list.length === 0) {
          notify('导入失败：JSON 格式不包含有效简历列表');
          return;
        }
        const merged = mergeImportedResumes(resumesRef.current, list);
        pushHistorySnapshot(resumesRef.current);
        setResumes(merged.resumes);
        setActiveId(merged.activeId);
        notify(
          merged.mode === 'append-single'
            ? '已追加导入单份简历版本（原有版本完整保留，可 Ctrl+Z 撤销）'
            : `已恢复多份备份，共 ${merged.importedCount} 份简历版本（可 Ctrl+Z 撤销）`,
        );
      } catch {
        notify('导入失败：文件不是合法的 JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    setModal({
      title: '恢复初始示例模板',
      message: '将重置为内置的 2 个通用行业起始模板（商务单栏 + 人文书卷杂志），当前未导出的修改会被替换（可先导出 JSON 备份）。',
      confirmLabel: '恢复初始模板',
      danger: true,
      onConfirm: () => {
        pushHistorySnapshot(resumes);
        const fresh = DEFAULT_RESUMES.map(cloneResumeDoc);
        setResumes(fresh);
        setActiveId(fresh[0].id);
        notify('已恢复初始示例模板');
      },
    });
  };

  const handleUseTemplateAsNew = (tplDoc: ResumeDoc, label: string) => {
    const created = cloneResumeDoc(tplDoc);
    created.id = nid('resume');
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), resumes.map(cloneResumeDoc)]);
    setFuture([]);
    setResumes((prev) => [...prev, created]);
    setActiveId(created.id);
    setActiveModule('basic');
    setActiveTab('content');
    setTemplateGalleryOpen(false);
    notify(`已基于「${label}」创建新简历，直接改写文字即可`);
  };

  const handleApplyTemplateStyleOnly = (tplDoc: ResumeDoc, label: string) => {
    const restyled = applyTemplateStyleOnly(activeDoc, tplDoc);
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), resumes.map(cloneResumeDoc)]);
    setFuture([]);
    setResumes((prev) => prev.map((r) => (r.id === activeDoc.id ? restyled : r)));
    setTemplateGalleryOpen(false);
    notify(`已套用「${label}」视觉风格（你的个人内容完全保留，可 Ctrl+Z 撤销）`);
  };

  const handleCreateCustomRole = (roleName: string) => {
    const created = createCustomRoleDoc(roleName);
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), resumes.map(cloneResumeDoc)]);
    setFuture([]);
    setResumes((prev) => [...prev, created]);
    setActiveId(created.id);
    setActiveModule('basic');
    setActiveTab('content');
    setWorkbenchOpen(true);
    setTemplateGalleryOpen(false);
    notify(`已按「${roleName}」生成专属简历骨架，直接填入经历即可`);
  };

  const handleImportParsedDoc = (created: ResumeDoc, modeLabel: string) => {
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), resumes.map(cloneResumeDoc)]);
    setFuture([]);
    setResumes((prev) => [...prev, created]);
    setActiveId(created.id);
    setActiveModule('basic');
    setActiveTab('content');
    setWorkbenchOpen(true);
    notify(`已通过「${modeLabel}」导入为新版本，请核对细节并微调版式`);
  };

  const handleClearPlaceholderContent = () => {
    setModal({
      title: '清空示例内容（保留当前版式）',
      message: '将清空当前简历的示例文字与经历，保留当前选择的模板、配色、字体与模块结构，方便你从零填入自己的真实经历。支持 Ctrl+Z 撤销。',
      confirmLabel: '确认清空',
      danger: true,
      onConfirm: () => {
        const cleared = clearPlaceholderContent(activeDoc);
        setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), resumes.map(cloneResumeDoc)]);
        setFuture([]);
        setResumes((prev) => prev.map((r) => (r.id === activeDoc.id ? cleared : r)));
        setActiveTab('content');
        setActiveModule('basic');
        setWorkbenchOpen(true);
        notify('已清空示例文字，保留当前版式风格');
      },
    });
  };

  const getExportableDoc = () =>
    privacyMask
      ? {
          ...activeDoc,
          data: {
            ...activeDoc.data,
            basic: {
              ...activeDoc.data.basic,
              phone: maskPhone(activeDoc.data.basic.phone),
              email: maskEmail(activeDoc.data.basic.email),
            },
          },
        }
      : activeDoc;

  const handleCopyPlainText = async () => {
    const plain = formatPlainText(getExportableDoc());
    try {
      await navigator.clipboard.writeText(plain);
      notify(
        privacyMask
          ? '已复制脱敏版纯文本简历（手机号与邮箱已隐藏）'
          : '已复制纯文本简历（可直接粘贴至网申或发给 AI）',
      );
    } catch {
      notify('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const handleExportWord = () => {
    const html = formatWordHtml(getExportableDoc());
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${buildPdfTitle(activeDoc)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    notify('已导出 Word (.doc) 文件（支持 MS Word / WPS 二次编辑）');
  };

  const handleExportMarkdown = () => {
    const md = formatMarkdown(getExportableDoc());
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${buildPdfTitle(activeDoc)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    notify('已导出 Markdown (.md) 简历文件');
  };

  const triggerPrint = () => {
    const prevTitle = document.title;
    document.title = buildPdfTitle(activeDoc);
    window.print();
    window.setTimeout(() => {
      document.title = prevTitle;
    }, 600);
  };

  const handleExportPdf = () => {
    setToast(null);
    setPdfPreflightOpen(true);
  };

  const handleProceedPdfPrint = () => {
    setPdfPreflightOpen(false);
    window.requestAnimationFrame(() => {
      triggerPrint();
    });
  };

  const handleFixFromPreflight = (moduleKey: string, guideHint: string) => {
    setPdfPreflightOpen(false);
    handleJumpFromAudit(moduleKey);
    notify(guideHint);
  };

  return (
    <div className="print-app-shell flex h-screen flex-col overflow-hidden bg-[#e8edf3]">
      <TopBar
        resumes={resumes}
        activeId={activeDoc.id}
        activeTab={activeTab}
        workbenchOpen={workbenchOpen}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        auditAlertCount={auditAlertCount}
        hasCustomAiReady={isCustomAiReady(customAiConfig)}
        onToggleWorkbench={() => setWorkbenchOpen((v) => !v)}
        onOpenTemplateGallery={() => setTemplateGalleryOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSelectResume={(id) => {
          setActiveId(id);
          setActiveModule('basic');
        }}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setWorkbenchOpen(true);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDuplicateResume={handleDuplicateResume}
        onCreateBlankResume={handleCreateBlankResume}
        onClearPlaceholderContent={handleClearPlaceholderContent}
        onRenameResume={handleRenameResume}
        onDeleteResume={handleDeleteResume}
        onExportSingleJson={handleExportSingleJson}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onOpenTextImport={() => setImportModalOpen(true)}
        onResetDefaults={handleResetDefaults}
        onCopyPlainText={handleCopyPlainText}
        onExportWord={handleExportWord}
        onExportMarkdown={handleExportMarkdown}
        onExportPdf={handleExportPdf}
      />

      {/* Main Split: LEFT Workbench + RIGHT Live A4 Canvas */}
      <div className="print-main-split relative flex min-h-0 flex-1 overflow-hidden">
        <LeftWorkbench
          open={workbenchOpen}
          activeTab={activeTab}
          activeModule={activeModule}
          doc={activeDoc}
          resumes={resumes}
          localChecks={localChecks}
          providers={providers}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          customConfig={customAiConfig}
          onSaveCustomConfig={handleSaveCustomAiConfig}
          onClearCustomConfig={handleClearCustomAiConfig}
          onOpenSettings={() => setSettingsOpen(true)}
          onClose={() => setWorkbenchOpen(false)}
          onChangeTab={setActiveTab}
          onSelectModule={setActiveModule}
          onMutate={handleMutate}
          onUploadPhoto={handleUploadPhoto}
          onDeleteCustomModule={handleDeleteCustomModule}
          onSelectResume={(id) => {
            setActiveId(id);
          }}
          onDuplicateResume={handleDuplicateResume}
          onDeriveVersion={handleDeriveVersion}
          onCompareVersions={handleCompareVersions}
          onApplyEnglishTranslation={handleApplyEnglishTranslation}
          comparePair={comparePair}
          onJumpFromAudit={handleJumpFromAudit}
          onApplyTailorProposal={handleApplyTailorProposal}
          onNotify={notify}
        />

        <ResumeCanvas
          doc={activeDoc}
          activeModule={activeModule}
          showActiveOutline={activeTab === 'content'}
          bwPreview={bwPreview}
          privacyMask={privacyMask}
          previewScale={previewScale}
          zoomOffset={zoomOffset}
          fitScale={fitScale}
          pageCount={pageCount}
          fillPct={fillPct}
          pvPageRef={pvPageRef}
          pvInnerRef={pvInnerRef}
          onSelectModule={handleSelectModuleFromCanvas}
          onToggleAutofit={() =>
            handleMutate((d) => {
              d.meta.autofit = !d.meta.autofit;
            }, true)
          }
          onToggleBwPreview={() => {
            const next = !bwPreview;
            setBwPreview(next);
            notify(next ? '已开启黑白打印预览（实时检查对比度与省墨效果）' : '已切回彩色预览');
          }}
          onTogglePrivacyMask={() => {
            const next = !privacyMask;
            setPrivacyMask(next);
            notify(next ? '已开启隐私脱敏（画布与复制/导出文本将隐藏手机/邮箱）' : '已恢复完整联系方式显示');
          }}
          radarOpen={radarOpen}
          competitivenessScore={competitivenessReport.overallScore}
          onToggleRadar={() => setRadarOpen((v) => !v)}
          onAdjustZoom={(delta) =>
            setZoomOffset((z) => Number(Math.max(-0.35, Math.min(0.45, z + delta)).toFixed(2)))
          }
          onResetZoom={() => setZoomOffset(0)}
        />

        <CompetitivenessRadarPanel
          open={radarOpen}
          docName={activeDoc.name}
          report={competitivenessReport}
          onClose={() => setRadarOpen(false)}
          onJumpToModule={(modKey) => {
            handleJumpFromAudit(modKey);
            if (typeof window !== 'undefined' && window.innerWidth < 1280) {
              setRadarOpen(false);
            }
          }}
        />
      </div>

      <TemplateGalleryModal
        open={templateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
        onUseAsNewResume={handleUseTemplateAsNew}
        onApplyStyleOnly={handleApplyTemplateStyleOnly}
        onCreateCustomRole={handleCreateCustomRole}
      />

      <ResumeImportModal
        open={importModalOpen}
        providers={providers}
        selectedProvider={selectedProvider}
        customConfig={customAiConfig}
        onClose={() => setImportModalOpen(false)}
        onImportDoc={handleImportParsedDoc}
      />

      <OnboardingGuideModal
        open={guideOpen}
        onDismiss={handleDismissGuide}
        onOpenTemplateGallery={() => {
          handleDismissGuide();
          setTemplateGalleryOpen(true);
        }}
      />

      <SettingsModal
        open={settingsOpen}
        providers={providers}
        customConfig={customAiConfig}
        resumeCount={resumes.length}
        onClose={() => setSettingsOpen(false)}
        onSaveCustomConfig={handleSaveCustomAiConfig}
        onClearCustomConfig={handleClearCustomAiConfig}
        onExportBackup={handleExportJson}
        onOpenGuide={() => setGuideOpen(true)}
        onNotify={notify}
      />

      <PdfPreflightModal
        open={pdfPreflightOpen}
        report={pdfPreflightReport}
        pdfTitle={buildPdfTitle(activeDoc)}
        onClose={() => setPdfPreflightOpen(false)}
        onFixModule={handleFixFromPreflight}
        onProceedExport={handleProceedPdfPrint}
      />

      <ModalDialog config={modal} onClose={() => setModal(null)} />

      {/* Subtle Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed top-16 left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-lg bg-slate-900/95 px-4 py-2 text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
