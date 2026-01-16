import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateRoot = resolve(__dirname, '../templates/base');

export async function run(args) {
  const [command, ...rest] = args;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === '--version' || command === '-v') {
    logInfo('Nova CLI v1.1.0');
    return;
  }

  try {
    switch (command) {
      case 'new':
        await scaffoldProject(rest);
        break;
      case 'dev':
        await runDev();
        break;
      case 'build':
        await runBuild();
        break;
      case 'db:init':
        await runDrizzle('generate');
        break;
      case 'db:push':
        await runDrizzle('push');
        break;
      case 'create:controller':
        await createController(rest[0]);
        break;
      case 'create:middleware':
        await createMiddleware(rest[0]);
        break;
      case 'create:migration':
        await createMigration(rest[0]);
        break;
      default:
        logError(`Unknown command "${command}"`);
        printHelp();
    }
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

function printHelp() {
  console.log(`[nova] Nova CLI
Version: 1.1.0
Node: ${process.version}

Usage:
  nova new <name> [--no-install]
  nova dev
  nova build
  nova db:init
  nova db:push
  nova create:controller <name>
  nova create:middleware <name>
  nova create:migration <name>
`);
}

async function scaffoldProject(args) {
  const [name, ...flags] = args;
  const shouldInstall = !flags.includes('--no-install') && !flags.includes('--skip-install');

  if (!name) {
    throw new Error('project name is required');
  }

  const target = resolve(process.cwd(), name);
  if (await pathExists(target)) {
    const entries = await readdir(target);
    if (entries.length > 0) {
      throw new Error(`directory "${name}" is not empty`);
    }
  } else {
    await mkdir(target, { recursive: true });
  }

  const remoteTemplate = await tryFetchTemplate(
    process.env.NOVA_TEMPLATE_REPO || 'https://github.com/untrustnova/nova',
  );

  const source = remoteTemplate?.path || templateRoot;
  await copyTemplate(source, target, {
    '__APP_NAME__': name,
  });

  await ensureViteConfig(target);

  logSuccess(`Project created at ${target}`);

  if (remoteTemplate?.cleanup) {
    await remoteTemplate.cleanup();
  }

  if (shouldInstall) {
    await runCommand('npm', ['install'], { cwd: target });
    logSuccess('Dependencies installed');
  }
}

async function createController(name) {
  if (!name) {
    throw new Error('controller name is required');
  }

  const fileName = normalizeSuffix(name, '.controller.js');
  const className = toClassName(fileName.replace('.controller.js', ''));
  const target = resolve(process.cwd(), 'app', 'controllers', fileName);

  await ensureDir(dirname(target));
  await ensureNotExists(target);

  const body = `import { Controller } from '@untrustnova/nova-framework/controller';

export default class ${className}Controller extends Controller {
  async index({ response }) {
    response.json({ message: '${className} ready' });
  }
}
`;

  await writeFile(target, body, 'utf8');
  logSuccess(`Controller created: ${relativePath(target)}`);
}

async function createMiddleware(name) {
  if (!name) {
    throw new Error('middleware name is required');
  }

  const fileName = normalizeSuffix(name, '.middleware.js');
  const className = toClassName(fileName.replace('.middleware.js', ''));
  const target = resolve(process.cwd(), 'app', 'middleware', fileName);

  await ensureDir(dirname(target));
  await ensureNotExists(target);

  const body = `export class ${className}Middleware {
  async handle(req, res, next) {
    return next();
  }
}
`;

  await writeFile(target, body, 'utf8');
  logSuccess(`Middleware created: ${relativePath(target)}`);
}

async function createMigration(name) {
  if (!name) {
    throw new Error('migration name is required');
  }

  const stamp = timestamp();
  const fileName = `${stamp}_${sanitizeFileName(name)}.js`;
  const target = resolve(process.cwd(), 'app', 'migrations', fileName);

  await ensureDir(dirname(target));
  await ensureNotExists(target);

  const body = `export async function up(db) {
  // TODO: add migration
}

export async function down(db) {
  // TODO: rollback migration
}
`;

  await writeFile(target, body, 'utf8');
  logSuccess(`Migration created: ${relativePath(target)}`);
}

async function runDrizzle(command) {
  const args = ['drizzle-kit', command];
  await runCommand('npx', args);
}

async function runDev() {
  const config = await loadNovaConfig();
  const { runDev: runViteDev } = await loadFrameworkModule('dev');

  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  let viteServer = null;
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.kill(signal);
    if (viteServer) {
      await viteServer.close();
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    viteServer = await runViteDev(config);
  } catch (error) {
    logError(error.message);
    await shutdown('SIGTERM');
  }
}

async function runBuild() {
  const config = await loadNovaConfig();
  const { runBuild: runViteBuild } = await loadFrameworkModule('dev');
  await runViteBuild(config);
  logSuccess('Build completed');
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      cwd: options.cwd || process.cwd(),
    });

    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`command failed: ${command} ${args.join(' ')}`));
    });
  });
}

async function tryFetchTemplate(repo) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'nova-template-'));
  const cleanup = async () => {
    await rm(tempRoot, { recursive: true, force: true });
  };

  try {
    await runCommand('git', ['clone', '--depth', '1', repo, tempRoot]);
    const basePath = join(tempRoot, 'templates', 'base');
    if (await pathExists(basePath)) {
      return { path: basePath, cleanup };
    }
  } catch (error) {
    await cleanup();
    return null;
  }

  await cleanup();
  return null;
}

async function copyTemplate(src, dest, replacements) {
  const entries = await readdir(src, { withFileTypes: true });
  await ensureDir(dest);

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyTemplate(srcPath, destPath, replacements);
      continue;
    }

    const contents = await readFile(srcPath, 'utf8');
    const replaced = applyReplacements(contents, replacements);
    await writeFile(destPath, replaced, 'utf8');
  }
}

function applyReplacements(contents, replacements) {
  let result = contents;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function ensureNotExists(path) {
  if (await pathExists(path)) {
    throw new Error(`${relativePath(path)} already exists`);
  }
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function normalizeSuffix(name, suffix) {
  if (name.endsWith(suffix)) return name;
  const base = name.replace(/\.[^.]+$/, '');
  if (base.endsWith(suffix.replace('.js', ''))) return `${base}.js`;
  return base + suffix;
}

function toClassName(input) {
  return input
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function sanitizeFileName(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]+/g, '');
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('_');
}

function relativePath(path) {
  return path.replace(process.cwd() + '/', '');
}

async function ensureViteConfig(targetRoot) {
  const viteConfigPath = resolve(targetRoot, 'vite.config.js');
  if (await pathExists(viteConfigPath)) return;

  const contents = `import { defineConfig } from 'vite';\nimport novaConfig from './nova.config.js';\nimport { resolveViteConfig } from '@untrustnova/nova-framework/config/resolveVite';\n\nexport default defineConfig(async () => resolveViteConfig(novaConfig));\n`;
  await writeFile(viteConfigPath, contents, 'utf8');
  logSuccess('vite.config.js generated from nova.config.js');
}

function logInfo(message) {
  console.log(`[nova] ${message}`);
}

function logSuccess(message) {
  console.log(`[nova] ${message}`);
}

function logError(message) {
  console.error(`[nova] ${message}`);
}

async function loadNovaConfig() {
  const configPath = resolve(process.cwd(), 'nova.config.js');
  const module = await import(pathToFileURL(configPath));
  return module.default || module;
}

async function loadFrameworkModule(entry) {
  const require = createRequire(import.meta.url);
  const resolved = require.resolve(`@untrustnova/nova-framework/${entry}`, {
    paths: [process.cwd()],
  });
  return import(pathToFileURL(resolved));
}
