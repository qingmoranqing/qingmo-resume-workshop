import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DEFAULT_RESUMES } from '../data/defaultResumes';
import {
  exportResumePdfUnified,
  isElectronDesktop,
  loadPersistedResumeStore,
  savePersistedResumeStore,
  type ElectronDesktopAPI,
} from './desktopBridge';
import type { StoredResumePayload } from './resumeLogic';

const require = createRequire(import.meta.url);
const portableStore = require('../../electron/portableStore.cjs') as {
  resolvePortableDataDir: (options?: {
    portableDir?: string;
    isPackaged?: boolean;
    execPath?: string;
    cwd?: string;
  }) => string;
  resolvePortableDataFilePath: (options?: {
    portableDir?: string;
    isPackaged?: boolean;
    execPath?: string;
    cwd?: string;
  }) => string;
  loadPortableDataFile: (filePath: string) => {
    ok: boolean;
    filePath: string;
    data: unknown;
    error?: string;
  };
  savePortableDataFile: (
    filePath: string,
    body: unknown,
  ) => {
    ok: boolean;
    filePath: string;
    savedAt?: string;
    error?: string;
  };
  sanitizePdfFileName: (suggestedFileName: unknown) => string;
};

test('isElectronDesktop returns false without bridge and true with valid electronAPI', () => {
  assert.equal(isElectronDesktop(undefined), false);
  assert.equal(isElectronDesktop({}), false);

  const validApi: ElectronDesktopAPI = {
    isDesktop: true,
    loadData: async () => ({ ok: true, filePath: 'D:/ResumeCraft/resumes-data.json', data: null }),
    saveData: async () => ({ ok: true }),
    exportPdf: async () => ({ ok: true, canceled: false, filePath: 'D:/resume.pdf' }),
  };
  assert.equal(isElectronDesktop({ electronAPI: validApi }), true);
});

test('loadPersistedResumeStore & savePersistedResumeStore route to Electron IPC when desktop', async () => {
  const savedPayloads: StoredResumePayload[] = [];
  const samplePayload: StoredResumePayload = {
    activeId: DEFAULT_RESUMES[0].id,
    resumes: [DEFAULT_RESUMES[0]],
  };

  const mockWin = {
    electronAPI: {
      isDesktop: true as const,
      loadData: async () => ({
        ok: true,
        filePath: 'D:\\Portable\\resumes-data.json',
        data: { version: 1, updatedAt: '2026-01-01T00:00:00.000Z', ...samplePayload },
      }),
      saveData: async (payload: StoredResumePayload) => {
        savedPayloads.push(payload);
        return { ok: true, filePath: 'D:\\Portable\\resumes-data.json' };
      },
      exportPdf: async () => ({ ok: true, canceled: false, filePath: 'D:\\Portable\\cv.pdf' }),
    },
  };

  let fetchCalled = false;
  const fakeFetch = (async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called in Electron desktop mode');
  }) as unknown as typeof fetch;

  const loaded = await loadPersistedResumeStore({ win: mockWin, fetchFn: fakeFetch });
  assert.equal(fetchCalled, false);
  assert.equal(loaded.mode, 'desktop');
  assert.equal(loaded.enabled, true);
  assert.equal(loaded.filePath, 'D:\\Portable\\resumes-data.json');
  assert.ok(loaded.data);

  const saved = await savePersistedResumeStore(samplePayload, { win: mockWin, fetchFn: fakeFetch });
  assert.equal(fetchCalled, false);
  assert.equal(saved.ok, true);
  assert.equal(savedPayloads.length, 1);
  assert.equal(savedPayloads[0].activeId, samplePayload.activeId);
});

test('exportResumePdfUnified invokes Electron exportPdf in desktop mode and window.print callback in web mode', async () => {
  let webPrintCalls = 0;
  let capturedName = '';

  const desktopResult = await exportResumePdfUnified({
    suggestedFileName: '林知远-产品经理.pdf',
    onWebPrint: () => {
      webPrintCalls += 1;
    },
    win: {
      electronAPI: {
        isDesktop: true,
        loadData: async () => ({ ok: true, data: null }),
        saveData: async () => ({ ok: true }),
        exportPdf: async (name: string) => {
          capturedName = name;
          return { ok: true, canceled: false, filePath: 'C:\\Users\\Demo\\林知远-产品经理.pdf' };
        },
      },
    },
  });

  assert.equal(desktopResult.mode, 'desktop');
  assert.equal(desktopResult.ok, true);
  assert.equal(capturedName, '林知远-产品经理.pdf');
  assert.equal(webPrintCalls, 0);

  const webResult = await exportResumePdfUnified({
    suggestedFileName: '林知远-产品经理.pdf',
    onWebPrint: () => {
      webPrintCalls += 1;
    },
    win: {},
  });

  assert.equal(webResult.mode, 'web');
  assert.equal(webResult.ok, true);
  assert.equal(webPrintCalls, 1);
});

test('electron/portableStore resolves PORTABLE_EXECUTABLE_DIR first, then packaged execPath, then cwd', () => {
  assert.equal(
    portableStore.resolvePortableDataDir({
      portableDir: '  D:/USB/ResumeCraft  ',
      isPackaged: true,
      execPath: 'C:/Temp/app/ResumeCraft.exe',
      cwd: '/fallback',
    }),
    'D:/USB/ResumeCraft',
  );

  assert.equal(
    portableStore.resolvePortableDataDir({
      portableDir: '',
      isPackaged: true,
      execPath: '/opt/ResumeCraft/ResumeCraft',
      cwd: '/fallback',
    }),
    '/opt/ResumeCraft',
  );

  assert.equal(
    portableStore.resolvePortableDataDir({
      portableDir: '',
      isPackaged: false,
      execPath: '/usr/bin/electron',
      cwd: '/workspace/resume-craft',
    }),
    '/workspace/resume-craft',
  );
});

test('electron/portableStore reads and atomically writes resumes-data.json with version/updatedAt/activeId/resumes', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resumecraft-electron-'));
  try {
    const filePath = portableStore.resolvePortableDataFilePath({ portableDir: tmpDir });
    assert.equal(path.basename(filePath), 'resumes-data.json');

    const initialLoad = portableStore.loadPortableDataFile(filePath);
    assert.equal(initialLoad.ok, true);
    assert.equal(initialLoad.data, null);

    const invalidSave = portableStore.savePortableDataFile(filePath, { activeId: 'x', resumes: [] });
    assert.equal(invalidSave.ok, false);

    const saved = portableStore.savePortableDataFile(filePath, {
      activeId: DEFAULT_RESUMES[0].id,
      resumes: [DEFAULT_RESUMES[0]],
    });
    assert.equal(saved.ok, true);
    assert.ok(saved.savedAt);

    const reloaded = portableStore.loadPortableDataFile(filePath);
    assert.equal(reloaded.ok, true);
    const parsed = reloaded.data as {
      version: number;
      updatedAt: string;
      activeId: string;
      resumes: Array<{ id: string }>;
    };
    assert.equal(parsed.version, 1);
    assert.equal(typeof parsed.updatedAt, 'string');
    assert.equal(parsed.activeId, DEFAULT_RESUMES[0].id);
    assert.equal(parsed.resumes.length, 1);
    assert.equal(parsed.resumes[0].id, DEFAULT_RESUMES[0].id);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('electron/portableStore sanitizes Windows-invalid characters in PDF filenames', () => {
  assert.equal(portableStore.sanitizePdfFileName('林知远:高级/产品*经理?.pdf'), '林知远-高级-产品-经理.pdf');
  assert.equal(portableStore.sanitizePdfFileName('Alex Chen Resume'), 'Alex Chen Resume.pdf');
  assert.equal(portableStore.sanitizePdfFileName('   '), '简历工坊-简历.pdf');
});
