import { X } from 'lucide-react';
import type {
  AiConfigSaveResult,
  AiProviderId,
  AiProviderInfo,
  CustomAiConfig,
  LocalCheckItem,
  ResumeDoc,
  TailorProposal,
  TranslatedResumePayload,
  WorkbenchTab,
} from '../types/resume';
import { AuditPanel } from './AuditPanel';
import { ContentEditor } from './ContentEditor';
import { DesignPanel } from './DesignPanel';
import { HelperPanel } from './HelperPanel';
import { LeftWorkbenchVersionBar } from './LeftWorkbenchVersionBar';
import { VersionComparePanel } from './VersionComparePanel';

interface LeftWorkbenchProps {
  open: boolean;
  activeTab: WorkbenchTab;
  activeModule: string;
  doc: ResumeDoc;
  resumes: ResumeDoc[];
  localChecks: LocalCheckItem[];
  providers: AiProviderInfo[];
  selectedProvider: AiProviderId;
  onSelectProvider: (provider: AiProviderId) => void;
  customConfig: CustomAiConfig;
  onSaveCustomConfig: (draft: CustomAiConfig) => AiConfigSaveResult;
  onClearCustomConfig: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  onChangeTab: (tab: WorkbenchTab) => void;
  onSelectModule: (moduleKey: string) => void;
  onMutate: (mutator: (draft: ResumeDoc) => void, recordHistory?: boolean) => void;
  onUploadPhoto: (file: File) => void;
  onDeleteCustomModule: (id: string) => void;
  onSelectResume: (id: string) => void;
  onDuplicateResume: () => void;
  onDeriveVersion: (sourceDoc: ResumeDoc, targetRole?: string) => void;
  onCompareVersions: (baseId: string, targetId: string) => void;
  onApplyEnglishTranslation: (
    sourceZhDoc: ResumeDoc,
    translated: TranslatedResumePayload,
    modelUsed?: string,
  ) => void;
  comparePair: { baseId: string; targetId: string; nonce: number } | null;
  onJumpFromAudit: (target: string) => void;
  onApplyTailorProposal: (proposal: TailorProposal, mode: 'new-version' | 'in-place') => void;
  onNotify: (msg: string) => void;
}

const TAB_META: Record<WorkbenchTab, { title: string; sub: string }> = {
  content: { title: '内容编辑', sub: '含 6 大行业写作参考库，修改实时同步右侧 A4 画布' },
  design: { title: '外观排版', sub: '8 大版式 × 10 主题色 + 自定义主色与黑白打印保护' },
  audit: { title: '简历体检', sub: '离线 JD 关键词扫描 + 开源自带 AI 深度体检' },
  helper: { title: '投递与换岗', sub: '开源自带 AI 跨岗重构 + 可编辑投递助手' },
  compare: { title: '版本对比', sub: '选择两份简历高亮对比文字增删，快速评估修改优劣' },
};

const MOBILE_TABS: Array<{ id: WorkbenchTab; label: string }> = [
  { id: 'content', label: '内容' },
  { id: 'design', label: '排版' },
  { id: 'audit', label: '体检' },
  { id: 'helper', label: '投递' },
  { id: 'compare', label: '对比' },
];

export function LeftWorkbench({
  open,
  activeTab,
  activeModule,
  doc,
  resumes,
  localChecks,
  providers,
  selectedProvider,
  onSelectProvider,
  customConfig,
  onSaveCustomConfig,
  onClearCustomConfig,
  onOpenSettings,
  onClose,
  onChangeTab,
  onSelectModule,
  onMutate,
  onUploadPhoto,
  onDeleteCustomModule,
  onSelectResume,
  onDuplicateResume,
  onDeriveVersion,
  onCompareVersions,
  onApplyEnglishTranslation,
  comparePair,
  onJumpFromAudit,
  onApplyTailorProposal,
  onNotify,
}: LeftWorkbenchProps) {
  if (!open) return null;

  const meta = TAB_META[activeTab];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className="no-print fixed inset-0 top-14 z-20 bg-slate-900/35 lg:hidden"
        aria-hidden="true"
      />

      {/* LEFT-ANCHORED WORKBENCH SIDEBAR */}
      <aside
        aria-label="左侧编辑工作台"
        className="no-print fixed inset-y-0 left-0 top-14 z-30 flex w-[90vw] max-w-[420px] flex-col border-r border-slate-200 bg-white shadow-xl lg:static lg:top-0 lg:z-10 lg:w-[416px] lg:shrink-0 lg:shadow-none"
      >
        {/* Mobile 5-tab bar */}
        <div className="grid grid-cols-5 gap-1 border-b border-slate-200 bg-slate-50 p-1.5 lg:hidden">
          {MOBILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTab(t.id)}
              className={`rounded-md py-1.5 text-xs font-medium whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{meta.title}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{meta.sub}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="收起工作台"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Left Workbench Version Switcher List + Bilingual Toggle + Clone & Derive */}
        <LeftWorkbenchVersionBar
          resumes={resumes}
          activeDoc={doc}
          selectedProvider={selectedProvider}
          customConfig={customConfig}
          onSelectResume={onSelectResume}
          onDeriveVersion={onDeriveVersion}
          onCompareVersions={onCompareVersions}
          onApplyEnglishTranslation={onApplyEnglishTranslation}
          onOpenSettings={onOpenSettings}
          onNotify={onNotify}
        />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 studio-scroll">
          {activeTab === 'content' && (
            <ContentEditor
              doc={doc}
              activeModule={activeModule}
              providers={providers}
              selectedProvider={selectedProvider}
              customConfig={customConfig}
              onOpenSettings={onOpenSettings}
              onSelectModule={onSelectModule}
              onMutate={onMutate}
              onUploadPhoto={onUploadPhoto}
              onDeleteCustomModule={onDeleteCustomModule}
              onNotify={onNotify}
            />
          )}

          {activeTab === 'design' && (
            <DesignPanel
              doc={doc}
              onMutate={onMutate}
              onSelectModuleAndEdit={(modKey) => {
                onSelectModule(modKey);
                onChangeTab('content');
              }}
            />
          )}

          {activeTab === 'audit' && (
            <AuditPanel
              doc={doc}
              localChecks={localChecks}
              providers={providers}
              selectedProvider={selectedProvider}
              onSelectProvider={onSelectProvider}
              customConfig={customConfig}
              onSaveCustomConfig={onSaveCustomConfig}
              onClearCustomConfig={onClearCustomConfig}
              onOpenSettings={onOpenSettings}
              onMutate={onMutate}
              onJumpToModule={onJumpFromAudit}
              onNotify={onNotify}
            />
          )}

          {activeTab === 'helper' && (
            <HelperPanel
              doc={doc}
              providers={providers}
              selectedProvider={selectedProvider}
              onSelectProvider={onSelectProvider}
              customConfig={customConfig}
              onSaveCustomConfig={onSaveCustomConfig}
              onClearCustomConfig={onClearCustomConfig}
              onOpenSettings={onOpenSettings}
              onMutate={onMutate}
              onApplyTailorProposal={onApplyTailorProposal}
              onNotify={onNotify}
            />
          )}

          {activeTab === 'compare' && (
            <VersionComparePanel
              resumes={resumes}
              activeId={doc.id}
              preferredPair={comparePair}
              onSelectResume={onSelectResume}
              onDuplicateResume={onDuplicateResume}
              onJumpToModule={onJumpFromAudit}
            />
          )}
        </div>
      </aside>
    </>
  );
}
