import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson, writeJsonIfChanged } from './json.js';
import { renderTemplateToFile } from '../generator/models/handlebars.js';
import { ensureCleanDir } from '../generator/models/utils.js';
import { buildModelsFromOpenAPI } from '../generator/models/openapi-to-models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgRoot = path.resolve(__dirname, '../..'); // packages/meridiane

async function replacePlaceholdersInDir(dir, placeholders) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await replacePlaceholdersInDir(fullPath, placeholders);
    } else if (entry.isFile()) {
      let content = await fs.readFile(fullPath, 'utf8');
      for (const [key, value] of Object.entries(placeholders)) {
        content = content.replaceAll(key, value);
      }
      await fs.writeFile(fullPath, content);
    }
  }
}

async function generateLibrary({ cwd, libName, packageName, version, debug }) {
  const tplDir = path.resolve(pkgRoot, 'templates/_lib_template');
  const targetDir = path.resolve(cwd, 'projects', libName);

  if (debug) console.log('[meridiane] generate lib', { libName, packageName, version, targetDir: path.relative(cwd, targetDir) });

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await fs.cp(tplDir, targetDir, { recursive: true });

  await replacePlaceholdersInDir(targetDir, { '__LIB_NAME__': libName });

  const libPackageJsonPath = path.join(targetDir, 'package.json');
  if (existsSync(libPackageJsonPath)) {
    const libPkg = await readJson(libPackageJsonPath);
    libPkg.name = packageName;
    libPkg.version = version;
    await writeJsonIfChanged(libPackageJsonPath, libPkg);
  }

  // angular.json / workspace patching is intentionally not done here (Meridiane is standalone).
}

async function generateModels({ cwd, libName, spec, requiredMode, preset, include, exclude, debug }) {
  const outDir = path.resolve(cwd, 'projects', libName, 'src', 'models');
  const templatesDir = path.resolve(pkgRoot, 'tools', 'generator', 'models', 'templates');

  if (debug) console.log('[meridiane] generate models', { outDir: path.relative(cwd, outDir), requiredMode, preset, includeCount: include.length, excludeCount: exclude.length });

  await ensureCleanDir(outDir);

  // Write models + index.ts.
  const { models } = buildModelsFromOpenAPI(spec, {
    requiredMode,
    preset,
    includeSchemaNames: include,
    excludeSchemaNames: exclude,
  });

  for (const m of models) {
    await renderTemplateToFile({
      templatePath: path.join(templatesDir, 'model.hbs'),
      outPath: path.join(outDir, `${m.name}.ts`),
      ctx: {
        name: m.name,
        props: m.props,
        imports: m.imports,
        extendsTypes: m.extendsTypes || [],
      },
    });
  }

  await renderTemplateToFile({
    templatePath: path.join(templatesDir, 'index.hbs'),
    outPath: path.join(outDir, 'index.ts'),
    ctx: { models: models.map((m) => ({ name: m.name })) },
  });

  if (debug) console.log(`[meridiane] ${models.length} model(s) generated`);
}

/**
 * @param {{
 *   cwd: string,
 *   libName: string,
 *   packageName: string,
 *   version: string,
 *   noModels: boolean,
 *   spec?: any,
 *   requiredMode: 'all-optional'|'spec',
 *   preset: 'all'|'native',
 *   include: string[],
 *   exclude: string[],
 *   debug: boolean,
 *   log?: { step?: (msg: string) => void, info?: (msg: string) => void, success?: (msg: string) => void, debug?: (msg: string, data?: any) => void },
 *   workspaceMode?: 'angular'|'standalone',
 *   distRoot?: string,
 * }} params
 */
export async function generateBridgeWorkspace(params) {
  const {
    cwd,
    libName,
    packageName,
    version,
    noModels,
    spec,
    requiredMode,
    preset,
    include,
    exclude,
    debug,
    log,
    distRoot,
  } = params;

  log?.step?.(`génération de la librairie (projects/${libName})`);
  await generateLibrary({ cwd, libName, packageName, version, debug });

  // If a dist root is provided, force ng-packagr output to that directory.
  if (distRoot) {
    const ngPackagePath = path.resolve(cwd, 'projects', libName, 'ng-package.json');
    const ngPkg = await readJson(ngPackagePath);
    const desiredDestAbs = path.resolve(distRoot, libName);
    const projectDir = path.dirname(ngPackagePath);
    ngPkg.dest = path.relative(projectDir, desiredDestAbs).split(path.sep).join('/');
    await writeJsonIfChanged(ngPackagePath, ngPkg);
    log?.debug?.('ng-package.json dest overridden', { dest: ngPkg.dest });
  }

  if (noModels) {
    log?.info?.('models ignorés (--no-models)');
    if (debug) console.log('[meridiane] --no-models enabled, skipping models generation');
    return;
  }

  if (!spec) throw new Error('Internal error: spec is required when noModels=false');
  log?.step?.('génération des models (OpenAPI)');
  await generateModels({ cwd, libName, spec, requiredMode, preset, include, exclude, debug });
  log?.success?.('génération terminée');
}
