import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Copy,
  Download,
  Eraser,
  FileCode2,
  FileText,
  FolderPlus,
  GitCompareArrows,
  HelpCircle,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Redo2,
  RotateCcw,
  Settings,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import type { ResumeDoc, WorkbenchTab } from '../types/resume';

interface TopBarProps {
  resumes: ResumeDoc[];
  activeId: string;
  activeTab: WorkbenchTab;
  workbenchOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  auditAlertCount: number;
  hasCustomAiReady: boolean;
  onToggleWorkbench: () => void;
  onOpenTemplateGallery: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onSelectResume: (id: string) => void;
  onChangeTab: (tab: WorkbenchTab) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicateResume: () => void;
  onCreateBlankResume: () => void;
  onClearPlaceholderContent: () => void;
  onRenameResume: () => void;
  onDeleteResume: () => void;
  onExportSingleJson: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onOpenTextImport: () => void;
  onResetDefaults: () => void;
  onCopyPlainText: () => void;
  onExportWord: () => void;
  onExportMarkdown: () => void;
  onExportPdf: () => void;
}

const TABS: Array<{ id: WorkbenchTab; label: string }> = [
  { id: 'content', label: '内容编辑' },
  { id: 'design', label: '外观排版' },
  { id: 'audit', label: '简历体检' },
  { id: 'helper', label: '投递与换岗' },
  { id: 'compare', label: '版本对比' },
];

export function TopBar({
  resumes,
  activeId,
  activeTab,
  workbenchOpen,
  canUndo,
  canRedo,
  auditAlertCount,
  hasCustomAiReady,
  onToggleWorkbench,
  onOpenTemplateGallery,
  onOpenGuide,
  onOpenSettings,
  onSelectResume,
  onChangeTab,
  onUndo,
  onRedo,
  onDuplicateResume,
  onCreateBlankResume,
  onClearPlaceholderContent,
  onRenameResume,
  onDeleteResume,
  onExportSingleJson,
  onExportJson,
  onImportJson,
  onOpenTextImport,
  onResetDefaults,
  onCopyPlainText,
  onExportWord,
  onExportMarkdown,
  onExportPdf,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <header className="no-print sticky top-0 z-40 flex h-14 items-center justify-between gap-1.5 sm:gap-3 border-b border-slate-200 bg-white px-2.5 sm:px-4">
      {/* Zone 1: Left Workbench Toggle + Brand + Version Switcher + Template Gallery */}
      <div className="flex min-w-0 flex-1 lg:flex-initial items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleWorkbench}
          aria-label={workbenchOpen ? '收起左侧工作台' : '展开左侧工作台'}
          title={workbenchOpen ? '收起左侧工作台' : '展开左侧工作台'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          {workbenchOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          简历工坊
        </span>

        <span className="hidden sm:inline text-slate-300 select-none" aria-hidden="true">
          /
        </span>

        <div className="flex min-w-0 flex-1 lg:flex-initial items-center gap-1">
          <select
            aria-label="切换简历版本"
            value={activeId}
            onChange={(e) => onSelectResume(e.target.value)}
            className="w-full min-w-0 max-w-[120px] sm:max-w-[185px] truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 focus:border-blue-600 focus:bg-white focus:outline-none"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="版本管理菜单"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              <span className="hidden xl:inline">版本</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-40">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicateResume();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  复制当前版本
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onChangeTab('compare');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <GitCompareArrows className="h-3.5 w-3.5 text-slate-400" />
                  版本对比（高亮差异）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onCreateBlankResume();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-slate-400" />
                  新建空白版本
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenTextImport();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-blue-700 hover:bg-blue-50/70"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  粘贴旧简历文本一键导入
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onClearPlaceholderContent();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Eraser className="h-3.5 w-3.5 text-slate-400" />
                  清空示例内容（保留版式）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRenameResume();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  重命名当前版本
                </button>
                {resumes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteResume();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除当前版本
                  </button>
                )}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportSingleJson();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  导出当前单份 JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportJson();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  导出全部 JSON 备份
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    importInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-400" />
                  导入 JSON 备份
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    设置 · AI 接口配置
                  </span>
                  {hasCustomAiReady && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenGuide();
                  }}
                  className="flex sm:hidden w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  查看使用引导
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onResetDefaults();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  恢复初始示例模板
                </button>
              </div>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportJson(file);
                e.target.value = '';
              }}
            />
          </div>

          <button
            type="button"
            onClick={onOpenTemplateGallery}
            title="浏览 12 大行业简历模板，支持关键词搜索与冷门岗位一键生成骨架"
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100/80 whitespace-nowrap shrink-0"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">模板广场</span>
          </button>
        </div>
      </div>

      {/* Zone 2: Center Studio Mode Tabs (Desktop) */}
      <nav aria-label="工作台模式切换" className="hidden lg:flex items-center gap-0.5 rounded-lg bg-slate-100 p-1 shrink-0">
        {TABS.map((t) => {
          const active = activeTab === t.id && workbenchOpen;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTab(t.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{t.label}</span>
              {t.id === 'audit' && auditAlertCount > 0 && (
                <span className="ml-1 font-mono text-[11px] tabular-nums text-amber-700">
                  ({auditAlertCount})
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Undo/Redo + Help + Multi-Format Export Dropdown + Primary Export PDF */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <div className="hidden sm:flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="撤销"
            title="撤销 (Ctrl+Z)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="重做"
            title="重做 (Ctrl+Shift+Z)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="应用设置与 AI 接口配置"
          title={hasCustomAiReady ? '设置 · 自定义 AI 接口已生效' : '设置 · 配置 AI 接口（Base URL / API Key / Model ID）'}
          className="relative hidden sm:inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shrink-0 whitespace-nowrap"
        >
          <Settings className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden xl:inline">设置</span>
          {hasCustomAiReady && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"
            />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenGuide}
          aria-label="使用引导"
          title="查看新手引导（随时可重开）"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 shrink-0"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            aria-expanded={exportOpen}
            aria-label="更多导出（Word / Markdown / 纯文本）"
            title="导出 Word / Markdown / 复制纯文本"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 md:px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">更多导出</span>
            <ChevronDown className="hidden md:inline h-3 w-3 text-slate-400" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-50">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportWord();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                导出 Word (.doc)
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportMarkdown();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <FileCode2 className="h-3.5 w-3.5 text-slate-500" />
                导出 Markdown (.md)
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onCopyPlainText();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                复制纯文本（网申/AI）
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onExportPdf}
          aria-label="导出 PDF"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>
            <span className="hidden min-[420px]:inline">导出 </span>PDF
          </span>
        </button>
      </div>
    </header>
  );
}
