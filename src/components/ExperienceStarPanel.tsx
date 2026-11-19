import { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import type { ExperienceStarSuggestion } from '../types/resume';
import { richSegs } from '../utils/resumeLogic';

interface ExperienceStarPanelProps {
  expLabel: string;
  loading: boolean;
  error: string | null;
  showAiFallback: boolean;
  suggestions: ExperienceStarSuggestion[];
  modelUsed?: string;
  existingBullets: string[];
  onAddSuggestion: (bullet: string) => void;
  onAddAllSuggestions: (bullets: string[]) => void;
  onRegenerate: () => void;
  onDismiss: () => void;
  onCopyPrompt: () => void;
  onImportExternalJson: (rawJson: string) => void;
  onOpenSettings?: () => void;
  onNotify: (msg: string) => void;
}

export function ExperienceStarPanel({
  expLabel,
  loading,
  error,
  showAiFallback,
  suggestions,
  modelUsed,
  existingBullets,
  onAddSuggestion,
  onAddAllSuggestions,
  onRegenerate,
  onDismiss,
  onCopyPrompt,
  onImportExternalJson,
  onOpenSettings,
  onNotify,
}: ExperienceStarPanelProps) {
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!loading && !error && suggestions.length === 0) return null;

  const existingSet = new Set(existingBullets.map((b) => b.trim()).filter(Boolean));
  const remainingBullets = suggestions
    .map((s) => s.bullet.trim())
    .filter((b) => b && !existingSet.has(b));

  const handleCopySingle = async (item: ExperienceStarSuggestion) => {
    try {
      await navigator.clipboard.writeText(item.bullet);
      setCopiedId(item.id);
      onNotify('已复制该条 STAR 经历建议');
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 1600);
    } catch {
      onNotify('复制失败，请手动选中复制');
    }
  };

  return (
    <div
      data-testid="exp-star-suggestions"
      className="mt-2.5 rounded-lg border border-blue-200/90 bg-blue-50/45 p-2.5 space-y-2.5"
    >
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2 text-xs text-blue-800">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-blue-600" />
            <span>正在结合「{expLabel}」的公司与岗位职责生成 3 条 STAR 补充经历...</span>
          </div>
        </div>
      )}

      {/* Error / Unconfigured / Validation state */}
      {!loading && error && (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-[11.5px] leading-relaxed text-slate-700 break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="关闭经历扩充提示"
              className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {showAiFallback && (
            <div className="space-y-2 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Settings className="h-3 w-3" />
                    去配置 AI 接口
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCopyPrompt}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Copy className="h-3 w-3" />
                  复制 STAR 扩充 Prompt
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteBox((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                >
                  {showPasteBox ? '收起 JSON 导入' : '粘贴外部 AI 返回的 JSON'}
                </button>
              </div>

              {showPasteBox && (
                <div className="space-y-1.5 rounded-md border border-slate-200 bg-white p-2">
                  <textarea
                    rows={3}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder='将 DeepSeek / Claude / Kimi 返回的 {"suggestions":[...]} 粘贴到此处'
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-[11px] leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!pasteText.trim()}
                      onClick={() => {
                        onImportExternalJson(pasteText);
                        setPasteText('');
                        setShowPasteBox(false);
                      }}
                      className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-45"
                    >
                      解析并生成 3 条卡片
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generated 3 STAR suggestions */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-blue-200/70 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="text-[11.5px] font-semibold text-slate-900">
                STAR 补充经历建议（{suggestions.length} 条）
              </span>
              {modelUsed && (
                <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 border border-blue-100 truncate max-w-[120px]">
                  {modelUsed}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {remainingBullets.length > 0 && (
                <button
                  type="button"
                  onClick={() => onAddAllSuggestions(remainingBullets)}
                  className="inline-flex items-center gap-0.5 rounded-md bg-blue-600 px-2 py-0.5 text-[10.5px] font-medium text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  <Plus className="h-2.5 w-2.5" />
                  全部加入 ({remainingBullets.length})
                </button>
              )}
              <button
                type="button"
                onClick={onRegenerate}
                title="重新生成 3 条 STAR 补充建议"
                className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                重生成
              </button>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="收起 STAR 建议面板"
                className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {suggestions.map((item, sIdx) => {
              const isAdded = existingSet.has(item.bullet.trim());
              const isCopied = copiedId === item.id;
              return (
                <div
                  key={item.id}
                  data-testid="exp-star-card"
                  className="rounded-lg border border-slate-200/90 bg-white p-2.5 space-y-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-semibold text-blue-700 truncate">
                      {sIdx + 1}. {item.focus}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopySingle(item)}
                        aria-label={`复制第 ${sIdx + 1} 条 STAR 建议`}
                        className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap"
                      >
                        {isCopied ? (
                          <Check className="h-2.5 w-2.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                        {isCopied ? '已复制' : '复制'}
                      </button>
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => onAddSuggestion(item.bullet)}
                        aria-label={`加入第 ${sIdx + 1} 条 STAR 建议`}
                        className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
                          isAdded
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default'
                            : 'bg-slate-900 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-2.5 w-2.5" />
                            已添加
                          </>
                        ) : (
                          <>
                            <Plus className="h-2.5 w-2.5" />
                            加入经历
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Full STAR Bullet Preview */}
                  <p className="text-[11.5px] leading-relaxed text-slate-800 break-words">
                    {richSegs(item.bullet).map((seg, i) =>
                      seg.bold ? (
                        <strong key={i} className="font-semibold text-slate-950">
                          {seg.text}
                        </strong>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      ),
                    )}
                  </p>

                  {/* Compact STAR Breakdown */}
                  {(item.situation || item.action || item.result) && (
                    <div className="grid gap-1 rounded bg-slate-50/90 px-2 py-1.5 text-[10.5px] leading-snug text-slate-600 border border-slate-100">
                      {item.situation && (
                        <div>
                          <span className="font-mono font-semibold text-slate-800 mr-1.5">S/T</span>
                          <span>{item.situation}</span>
                        </div>
                      )}
                      {item.action && (
                        <div>
                          <span className="font-mono font-semibold text-blue-700 mr-1.5">A</span>
                          <span>{item.action}</span>
                        </div>
                      )}
                      {item.result && (
                        <div>
                          <span className="font-mono font-semibold text-emerald-700 mr-1.5">R</span>
                          <span>{item.result}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
