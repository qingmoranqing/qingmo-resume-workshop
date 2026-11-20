import type { StoredResumePayload } from './resumeLogic';

export interface DesktopLoadResult {
  ok?: boolean;
  filePath?: string | null;
  data?: unknown;
  error?: string;
}

export interface DesktopSaveResult {
  ok: boolean;
  filePath?: string | null;
  savedAt?: string;
  error?: string;
}

export interface DesktopPdfExportResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

export interface ElectronDesktopAPI {
  isDesktop: true;
  loadData: () => Promise<DesktopLoadResult | unknown>;
  saveData: (payload: StoredResumePayload) => Promise<DesktopSaveResult>;
  exportPdf: (suggestedFileName: string) => Promise<DesktopPdfExportResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronDesktopAPI;
  }
}

export interface UnifiedStoreLoadResult {
  mode: 'desktop' | 'portable-http' | 'web';
  enabled: boolean;
  filePath: string | null;
  data: unknown;
  error?: string;
}

export interface UnifiedPdfExportResult {
  mode: 'desktop' | 'web';
  ok: boolean;
  canceled: boolean;
  filePath?: string;
  error?: string;
}

export function getElectronAPI(
  win: Pick<Window, 'electronAPI'> | undefined = typeof window !== 'undefined' ? window : undefined,
): ElectronDesktopAPI | null {
  const api = win?.electronAPI;
  if (
    api &&
    api.isDesktop === true &&
    typeof api.loadData === 'function' &&
    typeof api.saveData === 'function' &&
    typeof api.exportPdf === 'function'
  ) {
    return api;
  }
  return null;
}

export function isElectronDesktop(
  win: Pick<Window, 'electronAPI'> | undefined = typeof window !== 'undefined' ? window : undefined,
): boolean {
  return getElectronAPI(win) !== null;
}

function unwrapDesktopLoadResponse(raw: unknown): {
  filePath: string;
  data: unknown;
  error?: string;
} {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const wrapped = raw as DesktopLoadResult;
    return {
      filePath:
        typeof wrapped.filePath === 'string' && wrapped.filePath.trim()
          ? wrapped.filePath
          : 'resumes-data.json',
      data: wrapped.data ?? null,
      error: wrapped.error,
    };
  }
  return {
    filePath: 'resumes-data.json',
    data: raw ?? null,
  };
}

/**
 * Load persisted resumes from either Electron desktop IPC (`resumes-data.json`)
 * or the standalone HTTP local-store endpoint, falling back transparently to browser web mode.
 */
export async function loadPersistedResumeStore(options?: {
  win?: Pick<Window, 'electronAPI'>;
  fetchFn?: typeof fetch;
}): Promise<UnifiedStoreLoadResult> {
  const api = getElectronAPI(options?.win);
  if (api) {
    try {
      const raw = await api.loadData();
      const unwrapped = unwrapDesktopLoadResponse(raw);
      return {
        mode: 'desktop',
        enabled: true,
        filePath: unwrapped.filePath,
        data: unwrapped.data,
        error: unwrapped.error,
      };
    } catch (err) {
      return {
        mode: 'desktop',
        enabled: true,
        filePath: 'resumes-data.json',
        data: null,
        error: err instanceof Error ? err.message : '读取桌面版数据失败',
      };
    }
  }

  const fetchImpl = options?.fetchFn ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!fetchImpl) {
    return { mode: 'web', enabled: false, filePath: null, data: null };
  }

  try {
    const res = await fetchImpl('/api/local-store');
    if (!res.ok) {
      return { mode: 'web', enabled: false, filePath: null, data: null };
    }
    const json = (await res.json()) as {
      enabled?: boolean;
      filePath?: string | null;
      data?: unknown;
    } | null;
    if (!json?.enabled) {
      return { mode: 'web', enabled: false, filePath: null, data: null };
    }
    return {
      mode: 'portable-http',
      enabled: true,
      filePath: json.filePath || 'resumes-data.json',
      data: json.data ?? null,
    };
  } catch {
    return { mode: 'web', enabled: false, filePath: null, data: null };
  }
}

/**
 * Save resumes to Electron desktop IPC (`resumes-data.json`) or the portable HTTP local store.
 */
export async function savePersistedResumeStore(
  payload: StoredResumePayload,
  options?: {
    keepalive?: boolean;
    win?: Pick<Window, 'electronAPI'>;
    fetchFn?: typeof fetch;
  },
): Promise<DesktopSaveResult> {
  const api = getElectronAPI(options?.win);
  if (api) {
    try {
      const res = await api.saveData(payload);
      return res && typeof res === 'object' ? res : { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : '保存桌面版数据失败',
      };
    }
  }

  const fetchImpl = options?.fetchFn ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!fetchImpl) {
    return { ok: false, error: '当前环境不支持网络持久化' };
  }

  try {
    const res = await fetchImpl('/api/local-store', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      ...(options?.keepalive ? { keepalive: true } : {}),
    });
    return { ok: res.ok };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '写入本地数据失败',
    };
  }
}

/**
 * Export PDF via Electron silent zero-margin `printToPDF` when running in desktop mode,
 * or trigger standard browser `window.print()` in web / online preview mode.
 */
export async function exportResumePdfUnified(params: {
  suggestedFileName: string;
  onWebPrint: () => void;
  win?: Pick<Window, 'electronAPI'>;
}): Promise<UnifiedPdfExportResult> {
  const api = getElectronAPI(params.win);
  if (api) {
    try {
      const result = await api.exportPdf(params.suggestedFileName);
      return {
        mode: 'desktop',
        ok: Boolean(result?.ok),
        canceled: Boolean(result?.canceled),
        filePath: result?.filePath,
        error: result?.error,
      };
    } catch (err) {
      return {
        mode: 'desktop',
        ok: false,
        canceled: false,
        error: err instanceof Error ? err.message : '导出 PDF 失败',
      };
    }
  }

  params.onWebPrint();
  return {
    mode: 'web',
    ok: true,
    canceled: false,
  };
}
