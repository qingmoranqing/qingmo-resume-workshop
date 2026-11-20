'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {
  resolvePortableDataDir,
  resolvePortableDataFilePath,
  loadPortableDataFile,
  savePortableDataFile,
  sanitizePdfFileName,
} = require('./portableStore.cjs');

let mainWindow = null;

function getDataFilePath() {
  return resolvePortableDataFilePath({
    isPackaged: app.isPackaged,
    execPath: process.execPath,
    cwd: process.cwd(),
  });
}

function getDefaultPdfDir() {
  try {
    return app.getPath('documents');
  } catch {
    return resolvePortableDataDir({
      isPackaged: app.isPackaged,
      execPath: process.execPath,
      cwd: process.cwd(),
    });
  }
}

function isSafeExternalUrl(url) {
  return typeof url === 'string' && /^(https?:|mailto:)/i.test(url.trim());
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    autoHideMenuBar: true,
    title: '简历工坊',
    backgroundColor: '#e8edf3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setMenuBarVisibility(false);

  // Keep consistent desktop window title
  win.on('page-title-updated', (event) => {
    event.preventDefault();
    win.setTitle('简历工坊');
  });

  // Intercept window.open / target="_blank" external links and open in system default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Also prevent top-level navigation to external URLs from replacing the desktop app
  win.webContents.on('will-navigate', (event, url) => {
    if (isSafeExternalUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  const distEntry = path.join(__dirname, '../dist/index.html');
  void win.loadFile(distEntry);

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  mainWindow = win;
  return win;
}

function registerIpcHandlers() {
  ipcMain.handle('data:load', () => {
    return loadPortableDataFile(getDataFilePath());
  });

  ipcMain.handle('data:save', (_event, payload) => {
    return savePortableDataFile(getDataFilePath(), payload);
  });

  ipcMain.handle('pdf:export', async (event, suggestedFileName) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win || win.isDestroyed()) {
      return { ok: false, canceled: false, error: '应用窗口不可用，无法导出 PDF。' };
    }

    const safeFileName = sanitizePdfFileName(suggestedFileName);
    const defaultPath = path.join(getDefaultPdfDir(), safeFileName);

    const saveResult = await dialog.showSaveDialog(win, {
      title: '导出 PDF 简历',
      defaultPath,
      filters: [{ name: 'PDF 文档', extensions: ['pdf'] }],
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { ok: false, canceled: true };
    }

    try {
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      fs.writeFileSync(saveResult.filePath, pdfBuffer);
      return {
        ok: true,
        canceled: false,
        filePath: saveResult.filePath,
      };
    } catch (err) {
      return {
        ok: false,
        canceled: false,
        error: err instanceof Error ? `导出 PDF 失败：${err.message}` : '导出 PDF 失败',
      };
    }
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
