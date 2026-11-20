'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DATA_FILENAME = 'resumes-data.json';
const DEFAULT_PDF_BASENAME = '简历工坊-简历';

/**
 * Resolve the portable data directory so single-file portable `.exe` builds
 * always store `resumes-data.json` alongside the real `.exe` rather than a
 * transient NSIS/portable extraction temp directory.
 */
function resolvePortableDataDir(options = {}) {
  const portableEnv =
    typeof options.portableDir === 'string'
      ? options.portableDir.trim()
      : typeof process.env.PORTABLE_EXECUTABLE_DIR === 'string'
        ? process.env.PORTABLE_EXECUTABLE_DIR.trim()
        : '';

  if (portableEnv) {
    return portableEnv;
  }

  const isPackaged = Boolean(options.isPackaged);
  if (isPackaged) {
    const execPath = typeof options.execPath === 'string' && options.execPath
      ? options.execPath
      : process.execPath;
    return path.dirname(execPath);
  }

  return typeof options.cwd === 'string' && options.cwd ? options.cwd : process.cwd();
}

function resolvePortableDataFilePath(options = {}) {
  return path.join(resolvePortableDataDir(options), DATA_FILENAME);
}

/**
 * Read `resumes-data.json` from the portable data directory.
 * Compatible with the existing `{ version, updatedAt, activeId, resumes }` format.
 */
function loadPortableDataFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { ok: true, filePath, data: null };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return { ok: true, filePath, data: null };
    }
    const parsed = JSON.parse(raw);
    return { ok: true, filePath, data: parsed };
  } catch (err) {
    return {
      ok: false,
      filePath,
      data: null,
      error: err instanceof Error ? `读取本地简历文件失败：${err.message}` : '读取本地简历文件失败',
    };
  }
}

/**
 * Atomically write `{ version, updatedAt, activeId, resumes }` to `resumes-data.json`.
 */
function savePortableDataFile(filePath, body) {
  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray(body.resumes) ||
    body.resumes.length === 0
  ) {
    return {
      ok: false,
      filePath,
      error: '无效的简历数据包：resumes 必须为非空数组。',
    };
  }

  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const savedAt = new Date().toISOString();
    const serialized = JSON.stringify(
      {
        version: 1,
        updatedAt: savedAt,
        activeId: typeof body.activeId === 'string' ? body.activeId : '',
        resumes: body.resumes,
      },
      null,
      2,
    );

    const tmpFile = `${filePath}.tmp`;
    fs.writeFileSync(tmpFile, serialized, 'utf8');
    try {
      fs.renameSync(tmpFile, filePath);
    } catch {
      // Fallback for Windows antivirus or file-lock contention during atomic rename
      fs.writeFileSync(filePath, serialized, 'utf8');
      try {
        if (fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile);
        }
      } catch {
        // ignore cleanup errors
      }
    }

    return { ok: true, filePath, savedAt };
  } catch (err) {
    return {
      ok: false,
      filePath,
      error: err instanceof Error ? `写入本地简历文件失败：${err.message}` : '写入本地简历文件失败',
    };
  }
}

/**
 * Sanitize a user-supplied PDF filename for Windows/macOS/Linux filesystems
 * and ensure it always ends with `.pdf`.
 */
function sanitizePdfFileName(suggestedFileName) {
  const raw = typeof suggestedFileName === 'string' ? suggestedFileName.trim() : '';
  const withoutExt = raw.replace(/\.pdf$/i, '');
  const cleaned = withoutExt
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120);
  return `${cleaned || DEFAULT_PDF_BASENAME}.pdf`;
}

module.exports = {
  DATA_FILENAME,
  resolvePortableDataDir,
  resolvePortableDataFilePath,
  loadPortableDataFile,
  savePortableDataFile,
  sanitizePdfFileName,
};
