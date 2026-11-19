import { useEffect, useMemo, useState } from 'react';
import { fmtRange, parseRange } from '../utils/resumeLogic';

interface DateRangePickerProps {
  value: string;
  onChange: (next: string) => void;
  idPrefix: string;
}

const BASE_YEARS = Array.from({ length: 45 }, (_, i) => String(new Date().getFullYear() + 1 - i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

export function DateRangePicker({ value, onChange, idPrefix }: DateRangePickerProps) {
  const parsed = parseRange(value);
  const [manual, setManual] = useState(!parsed.parsed && Boolean(value.trim()));

  useEffect(() => {
    const p = parseRange(value);
    if (!p.parsed && value.trim()) {
      setManual(true);
    } else if (p.parsed) {
      setManual(false);
    }
  }, [value]);

  const startYear = parsed.startYear || '2023';
  const startMonth = parsed.startMonth || '01';
  const endYear = parsed.endYear || '2025';
  const endMonth = parsed.endMonth || '12';
  const ongoing = parsed.ongoing;

  const years = useMemo(() => {
    const set = new Set(BASE_YEARS);
    if (startYear) set.add(startYear);
    if (endYear) set.add(endYear);
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [startYear, endYear]);

  const updateParts = (sy: string, sm: string, ey: string, em: string, og: boolean) => {
    onChange(fmtRange(sy, sm, ey, em, og));
  };

  if (manual) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}-manual`}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="例如 2023.04 - 2025.12 或 2024.06 - 至今"
            className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-xs text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0 px-2 py-1 rounded hover:bg-slate-100"
          >
            切回选择器
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <select
          aria-label="开始年份"
          value={startYear}
          onChange={(e) => updateParts(e.target.value, startMonth, endYear, endMonth, ongoing)}
          className="rounded border border-slate-200 bg-white px-1.5 py-1 font-mono tabular-nums text-slate-800 focus:border-blue-600 focus:outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          aria-label="开始月份"
          value={startMonth}
          onChange={(e) => updateParts(startYear, e.target.value, endYear, endMonth, ongoing)}
          className="rounded border border-slate-200 bg-white px-1.5 py-1 font-mono tabular-nums text-slate-800 focus:border-blue-600 focus:outline-none"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>
        <span className="text-slate-400">—</span>
        {!ongoing && (
          <>
            <select
              aria-label="结束年份"
              value={endYear}
              onChange={(e) => updateParts(startYear, startMonth, e.target.value, endMonth, false)}
              className="rounded border border-slate-200 bg-white px-1.5 py-1 font-mono tabular-nums text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              aria-label="结束月份"
              value={endMonth}
              onChange={(e) => updateParts(startYear, startMonth, endYear, e.target.value, false)}
              className="rounded border border-slate-200 bg-white px-1.5 py-1 font-mono tabular-nums text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </>
        )}
        <label className="inline-flex items-center gap-1 text-slate-600 cursor-pointer ml-1">
          <input
            type="checkbox"
            checked={ongoing}
            onChange={(e) => updateParts(startYear, startMonth, endYear, endMonth, e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>至今</span>
        </label>
        <button
          type="button"
          onClick={() => setManual(true)}
          className="ml-auto text-[11px] text-slate-500 hover:text-slate-900 whitespace-nowrap"
        >
          手动输入
        </button>
      </div>
    </div>
  );
}
