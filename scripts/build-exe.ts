import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const RELEASE_DIR = path.join(ROOT, 'release');
const EMBEDDED_FILE = path.join(ROOT, 'scripts', 'embeddedAssets.ts');
const APP_ICON_PATH = path.join(ROOT, 'scripts', 'assets', 'app-icon.ico');

const STUB_CONTENT = `// Stub populated temporarily during \`bun run build:exe\` with base64-encoded \`dist/\` assets.
export interface EmbeddedAsset {
  mime: string;
  base64: string;
}

export const EMBEDDED_DIST_ASSETS: Record<string, EmbeddedAsset> = {};
`;

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

type TargetKey = 'win' | 'mac-arm64' | 'mac-x64' | 'linux';

const TARGETS: Record<TargetKey, { bunTarget: string; outFile: string; isWindows: boolean }> = {
  win: {
    bunTarget: 'bun-windows-x64',
    outFile: 'ResumeCraft-win-x64.exe',
    isWindows: true,
  },
  'mac-arm64': {
    bunTarget: 'bun-darwin-arm64',
    outFile: 'ResumeCraft-mac-arm64',
    isWindows: false,
  },
  'mac-x64': {
    bunTarget: 'bun-darwin-x64',
    outFile: 'ResumeCraft-mac-x64',
    isWindows: false,
  },
  linux: {
    bunTarget: 'bun-linux-x64',
    outFile: 'ResumeCraft-linux-x64',
    isWindows: false,
  },
};

function parseArgs(): { target: TargetKey; skipVite: boolean } {
  const args = process.argv.slice(2);
  let target: TargetKey = 'win';
  let skipVite = false;
  for (const arg of args) {
    if (arg === '--skip-vite') {
      skipVite = true;
    } else if (arg.startsWith('--target=')) {
      const val = arg.slice('--target='.length) as TargetKey;
      if (val in TARGETS) {
        target = val;
      } else {
        throw new Error(`Unsupported target "${val}". Use one of: ${Object.keys(TARGETS).join(', ')}`);
      }
    }
  }
  return { target, skipVite };
}

function resolveBunBinary(): string {
  // When invoked via `bun run scripts/build-exe.ts`, process.execPath is the exact bun(.exe) binary.
  if (typeof (process.versions as Record<string, string | undefined>).bun === 'string') {
    return process.execPath;
  }
  return process.platform === 'win32' ? 'bun.exe' : 'bun';
}

function runCommand(cmd: string, args: string[], cwd: string) {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
  return res;
}

function runOrThrow(cmd: string, args: string[], cwd: string) {
  const res = runCommand(cmd, args, cwd);
  if (res.error) {
    throw new Error(`Failed to execute ${cmd}: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`Command failed (${res.status}): ${cmd} ${args.join(' ')}`);
  }
}

function collectDistFiles(dir: string, baseDir: string, out: Array<{ route: string; absPath: string }>) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    const relPosix = path.relative(baseDir, absPath).split(path.sep).join('/');
    // Skip temporary chat media attachments if present under public/assets/aistudio
    if (relPosix.startsWith('assets/aistudio/')) continue;
    if (entry.isDirectory()) {
      collectDistFiles(absPath, baseDir, out);
    } else if (entry.isFile()) {
      out.push({ route: `/${relPosix}`, absPath });
    }
  }
}

function generateEmbeddedAssetsModule() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html not found. Run Vite build first.');
  }

  const files: Array<{ route: string; absPath: string }> = [];
  collectDistFiles(DIST_DIR, DIST_DIR, files);

  const lines: string[] = [
    '// Auto-generated during single-file executable build. Do not commit.',
    'export interface EmbeddedAsset {',
    '  mime: string;',
    '  base64: string;',
    '}',
    '',
    'export const EMBEDDED_DIST_ASSETS: Record<string, EmbeddedAsset> = {',
  ];

  let totalBytes = 0;
  for (const f of files) {
    const buf = fs.readFileSync(f.absPath);
    totalBytes += buf.length;
    const ext = path.extname(f.absPath).toLowerCase();
    const mime = MIME_MAP[ext] || 'application/octet-stream';
    lines.push(`  ${JSON.stringify(f.route)}: { mime: ${JSON.stringify(mime)}, base64: ${JSON.stringify(buf.toString('base64'))} },`);
  }
  lines.push('};');
  lines.push('');

  fs.writeFileSync(EMBEDDED_FILE, lines.join('\n'), 'utf8');
  console.log(`[build-exe] Embedded ${files.length} frontend asset(s) (${(totalBytes / 1024).toFixed(1)} KB)`);
}

function main() {
  const { target, skipVite } = parseArgs();
  const cfg = TARGETS[target];
  const bunBin = resolveBunBinary();

  if (!skipVite) {
    console.log('[build-exe] Step 1/3: Building production frontend via Vite...');
    runOrThrow(bunBin, ['run', 'build'], ROOT);
  }

  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const outPath = path.join(RELEASE_DIR, cfg.outFile);

  try {
    console.log('[build-exe] Step 2/3: Embedding frontend assets into single-file entry...');
    generateEmbeddedAssetsModule();

    console.log(`[build-exe] Step 3/3: Compiling standalone binary (${cfg.bunTarget})...`);
    const entryFile = path.join(ROOT, 'scripts', 'exe-entry.ts');
    const baseCompileArgs = [
      'build',
      '--compile',
      '--minify',
      `--target=${cfg.bunTarget}`,
      `--outfile=${outPath}`,
      entryFile,
    ];

    if (cfg.isWindows && process.platform === 'win32') {
      const iconFlags = fs.existsSync(APP_ICON_PATH) ? [`--windows-icon=${APP_ICON_PATH}`] : [];
      const withMetaArgs = [
        'build',
        '--compile',
        '--minify',
        ...iconFlags,
        '--windows-title=ResumeCraft',
        '--windows-description=Resume Craft Portable Edition',
        `--target=${cfg.bunTarget}`,
        `--outfile=${outPath}`,
        entryFile,
      ];
      const metaRes = runCommand(bunBin, withMetaArgs, ROOT);
      if (metaRes.error || metaRes.status !== 0) {
        console.warn(
          '[build-exe] Windows PE metadata/icon flags failed; retrying standalone compile without metadata flags...',
        );
        runOrThrow(bunBin, baseCompileArgs, ROOT);
      }
    } else {
      runOrThrow(bunBin, baseCompileArgs, ROOT);
    }

    const stat = fs.statSync(outPath);
    console.log(
      `[build-exe] Done! Output: ${path.relative(ROOT, outPath)} (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`,
    );
  } finally {
    // Always restore clean typed stub so git status & tsc stay pristine
    fs.writeFileSync(EMBEDDED_FILE, STUB_CONTENT, 'utf8');
  }
}

main();
