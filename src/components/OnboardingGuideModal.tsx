import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  LayoutGrid,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';

interface OnboardingGuideModalProps {
  open: boolean;
  onDismiss: () => void;
  onOpenTemplateGallery: () => void;
}

const STEPS = [
  {
    icon: LayoutGrid,
    badge: '第 1 步 / 3',
    title: '全行业 12 大模板 + 任意细分岗位骨架',
    desc: '覆盖工业自动化/PLC、游戏策划、财务审计、B2B 销售外贸、临床护理、供应链、建筑 BIM、文科教培、国企行政与互联网研发。支持关键词检索，找不到的小众岗位也可输入职位名一键生成专属结构骨架。',
    tips: [
      '「基于模板新建」快速套用行业示范写法',
      '「仅套用风格」一键换皮且 100% 保留你已写内容',
      '顶部「版本」菜单内可一键清空示例内容（保留版式），从零填入真实经历',
    ],
  },
  {
    icon: Palette,
    badge: '第 2 步 / 3',
    title: '8 大差异化版式 × 自定义配色 × 黑白打印保护',
    desc: '告别千篇一律单调简历：提供经典单栏、学术政务居中、工程时间轴、现代卡片流、双栏/反转双栏、杂志双列与视觉横幅双栏，搭配 10 套主题色、自定义取色器与 4 种标题装饰风格。',
    tips: [
      '点击右侧 A4 简历任意区域，左侧立即定位编辑该模块',
      '底部一键开启「黑白预览」提前排查黑白激光打印糊字风险',
      '支持导出高清 PDF（单页智能压紧）、Word (.doc) 与 Markdown',
    ],
  },
  {
    icon: Sparkles,
    badge: '第 3 步 / 3',
    title: '纯开源自带 AI 协作 + 离线 JD 关键词体检',
    desc: '所有简历数据纯本地存储在你的浏览器中，零商业收费与额度限制。内置「本地离线 JD 关键词扫描器」免配置即用；深度体检与跨岗改写支持免费对接你自己的 DeepSeek / Kimi / Claude / 本地 Ollama。',
    tips: [
      '无需填写 API Key：一键复制结构化 Prompt 发给常用 AI，粘回 JSON 即可渲染卡片',
      '开源自托管用户可在服务器 .env 配置 OpenAI 兼容 / 本地 Ollama / Claude 直连',
      '随时可通过顶部「?」按钮再次打开本引导，后续打开不再重复打扰',
    ],
  },
];

export function OnboardingGuideModal({
  open,
  onDismiss,
  onOpenTemplateGallery,
}: OnboardingGuideModalProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="新手快速上手引导"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Compass className="h-4 w-4 text-blue-600" />
            <span>欢迎使用简历工坊 · 30 秒速览</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="跳过引导"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <span>跳过</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-medium text-blue-600">{current.badge}</div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">{current.title}</h2>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-600">{current.desc}</p>

          <ul className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
            {current.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          {/* Step progress indicators */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {STEPS.map((s, idx) => (
              <button
                key={s.title}
                type="button"
                aria-label={`切换到第 ${idx + 1} 步`}
                onClick={() => setStep(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step ? 'w-6 bg-slate-900' : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            我喜欢自己摸索，直接跳过（不再弹出）
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                上一步
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                <span>下一步</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onDismiss();
                    onOpenTemplateGallery();
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  去模板广场挑一份
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  开始编辑
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
