import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createApiApp } from '../serverApp.ts';
import { EMBEDDED_DIST_ASSETS } from './embeddedAssets.ts';

function loadExternalEnvFile(): string | null {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(exeDir, '.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return envPath;
    }
  }
  return null;
}

function isDirWritable(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.resume-craft-write-test-${process.pid}`);
    fs.writeFileSync(probe, 'ok', 'utf8');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function resolvePortableDataFilePath(): string {
  const overridePath = (process.env.RESUME_CRAFT_DATA_FILE || '').trim();
  if (overridePath) return path.resolve(overridePath);

  // Prefer storing resumes-data.json right beside the portable .exe so copying the folder carries all resumes
  const exeDir = path.dirname(process.execPath);
  if (isDirWritable(exeDir)) {
    return path.join(exeDir, 'resumes-data.json');
  }
  // Fallback to user home folder if .exe is placed inside a read-only folder (e.g. Program Files)
  return path.join(os.homedir(), '.resume-craft', 'resumes-data.json');
}

function probeResumeCraftInstance(host: string, port: number, timeoutMs = 350): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: host === '0.0.0.0' ? '127.0.0.1' : host,
        port,
        path: '/api/health',
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(false);
          return;
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
          if (raw.length > 8192) res.destroy();
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw) as { ok?: boolean; app?: string };
            resolve(Boolean(parsed?.ok && parsed?.app === 'resume-craft'));
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findExistingInstanceUrl(
  host: string,
  preferredPort: number,
  maxScan = 6,
): Promise<string | null> {
  if (process.env.RESUME_CRAFT_ALLOW_MULTI === '1') return null;
  const connectHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  for (let offset = 0; offset < maxScan; offset += 1) {
    const candidatePort = preferredPort + offset;
    if (await probeResumeCraftInstance(connectHost, candidatePort)) {
      return `http://${connectHost}:${candidatePort}`;
    }
  }
  return null;
}

function openBrowser(url: string) {
  if (process.env.RESUME_CRAFT_NO_BROWSER === '1') return;
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    // Non-fatal: user can open the printed URL manually
  }
}

function listenOnAvailablePort(
  server: http.Server,
  preferredPort: number,
  host: string,
  maxAttempts = 50,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const tryListen = (port: number) => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.off('listening', onListening);
        if (err.code === 'EADDRINUSE' && attempt < maxAttempts) {
          attempt += 1;
          tryListen(preferredPort + attempt);
          return;
        }
        reject(err);
      };

      const onListening = () => {
        server.off('error', onError);
        const addr = server.address();
        const boundPort = typeof addr === 'object' && addr ? addr.port : port;
        resolve(boundPort);
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    };

    tryListen(preferredPort);
  });
}

async function main() {
  const loadedEnv = loadExternalEnvFile();
  const preferredPort = Number(process.env.PORT || 3000) || 3000;
  const host = process.env.HOST || '127.0.0.1';

  // Single-instance check: if Resume Craft is already running locally, open it directly instead of spawning a duplicate
  const existingUrl = await findExistingInstanceUrl(host, preferredPort);
  if (existingUrl) {
    console.log('');
    console.log(`[简历工坊] 检测到服务已在运行（${existingUrl}），正在为您打开现有页面...`);
    openBrowser(existingUrl);
    return;
  }

  const localDataFilePath = resolvePortableDataFilePath();
  const app = createApiApp({ localDataFilePath });

  // Pre-decode embedded dist/ assets into memory Buffers for instant serving
  const decodedAssets = new Map<string, { mime: string; body: Buffer }>();
  for (const [routePath, asset] of Object.entries(EMBEDDED_DIST_ASSETS)) {
    decodedAssets.set(routePath, {
      mime: asset.mime,
      body: Buffer.from(asset.base64, 'base64'),
    });
  }

  // Serve embedded static files and SPA fallback (completely self-contained, zero dist/ folder needed)
  app.get('*', (req, res) => {
    const cleanPath = (req.path || '/').replace(/\/+$/, '') || '/';
    const direct = decodedAssets.get(cleanPath === '/' ? '/index.html' : cleanPath);
    if (direct) {
      res.setHeader('Content-Type', direct.mime);
      if (cleanPath.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
      res.send(direct.body);
      return;
    }

    const indexAsset = decodedAssets.get('/index.html');
    if (indexAsset) {
      res.setHeader('Content-Type', indexAsset.mime);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(indexAsset.body);
      return;
    }

    res.status(500).send('Embedded frontend assets missing. Please rebuild with `bun run build:exe`.');
  });

  const server = http.createServer(app);
  const boundPort = await listenOnAvailablePort(server, preferredPort, host);
  const url = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${boundPort}`;

  console.log('');
  console.log('==============================================================');
  console.log('  简历工坊（Resume Craft）· 便携一体版已启动');
  console.log('==============================================================');
  console.log(`  本地访问地址：${url}`);
  console.log(`  简历数据文件：${localDataFilePath}`);
  console.log(`  配置文件状态：${loadedEnv ? `已加载 ${loadedEnv}` : '离线/浏览器直连模式（可在右上角「设置」中配置 AI 接口）'}`);
  console.log('  数据安全提示：所有简历均自动落盘至上述本地 JSON 文件，不上传云端。');
  console.log('  退出方式：直接关闭本窗口，或按 Ctrl + C 停止服务。');
  console.log('==============================================================');
  console.log('');

  openBrowser(url);
}

main().catch((err) => {
  console.error('[简历工坊] 启动失败：', err);
  process.exit(1);
});
