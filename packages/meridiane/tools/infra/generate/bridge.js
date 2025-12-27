import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {readJson, writeJsonIfChanged} from '../json.js';
import {renderTemplateToFile} from '../../generator/models/handlebars.js';
import {ensureCleanDir} from '../../generator/models/utils.js';
import {buildModelsFromOpenAPI} from '../../generator/models/openapi-to-models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgRoot = path.resolve(__dirname, '../../..'); // packages/meridiane

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

async function appendProjectReadme({targetReadmePath, projectReadmePath, debug, log}) {
  if (!projectReadmePath) return;

  const projectReadme = await readTextIfExists(projectReadmePath);
  if (!projectReadme || projectReadme.trim().length === 0) return;

  const targetReadme = await readTextIfExists(targetReadmePath);
  if (!targetReadme || targetReadme.trim().length === 0) {
    await fs.writeFile(targetReadmePath, projectReadme);
    if (debug) log?.debug?.('[meridiane] project README copied', {source: projectReadmePath});
    return;
  }

  const combined =
    `${targetReadme.trimEnd()}\n\n---\n\n` +
    `## Documentation du projet\n\n` +
    `${projectReadme.trimStart()}`;
  await fs.writeFile(targetReadmePath, combined);
  if (debug) log?.debug?.('[meridiane] project README appended', {source: projectReadmePath});
}

async function replacePlaceholdersInDir(dir, placeholders) {
  const entries = await fs.readdir(dir, {withFileTypes: true});
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

async function generateLibrary({projectDir, libName, packageName, version, debug, log, projectReadmePath}) {
  const tplDir = path.resolve(pkgRoot, 'templates/_lib_template');
  const targetDir = projectDir;

  if (debug) {
    log?.debug?.('[meridiane] generate lib', {
      libName,
      packageName,
      version,
      targetDir
    });
  }

  await fs.rm(targetDir, {recursive: true, force: true});
  await fs.mkdir(targetDir, {recursive: true});
  await fs.cp(tplDir, targetDir, {recursive: true});

  await replacePlaceholdersInDir(targetDir, {
    '__LIB_NAME__': libName,
    '__PACKAGE_NAME__': packageName,
  });

  const libPackageJsonPath = path.join(targetDir, 'package.json');
  if (existsSync(libPackageJsonPath)) {
    const libPkg = await readJson(libPackageJsonPath);
    libPkg.name = packageName;
    libPkg.version = version;
    await writeJsonIfChanged(libPackageJsonPath, libPkg);
  }

  await appendProjectReadme({
    targetReadmePath: path.join(targetDir, 'README.md'),
    projectReadmePath,
    debug,
    log,
  });

  // angular.json / workspace patching is intentionally not done here.
}

async function generateModels({projectDir, spec, requiredMode, formats, include, exclude, debug, log}) {
  const outDir = path.resolve(projectDir, 'src', 'models');
  const templatesDir = path.resolve(pkgRoot, 'tools', 'generator', 'models', 'templates');

  if (debug) {
    log?.debug?.('[meridiane] generate models', {
      outDir,
      requiredMode,
      formats: Array.isArray(formats) ? formats : [],
      includeCount: include.length,
      excludeCount: exclude.length,
    });
  }

  await ensureCleanDir(outDir);

  // Write models + index.ts.
  const {models} = buildModelsFromOpenAPI(spec, {
    requiredMode,
    formats: Array.isArray(formats) ? formats : [],
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
        extendsItem: m.extendsItem === true,
      },
    });
  }

  await renderTemplateToFile({
    templatePath: path.join(templatesDir, 'index.hbs'),
    outPath: path.join(outDir, 'index.ts'),
    ctx: {models: models.map((m) => ({name: m.name}))},
  });

  if (debug) log?.debug?.(`[meridiane] ${models.length} model(s) generated`);
}

/**
 * @param {{
 *   cwd: string,
 *   libName: string,
 *   packageName: string,
 *   version: string,
 *   noModels: boolean,
 *   spec?: any,
 *   requiredMode: 'all'|'spec',
 *   formats?: string[],
 *   include: string[],
 *   exclude: string[],
 *   debug: boolean,
 *   log?: { step?: (msg: string) => void, info?: (msg: string) => void, success?: (msg: string) => void, debug?: (msg: string, data?: any) => void },
 *   workspaceMode?: 'angular'|'standalone',
 *   distRoot?: string,
 *   projectDir?: string,
 *   projectReadmePath?: string,
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
    formats,
    include,
    exclude,
    debug,
    log,
    distRoot,
    projectDir: projectDirInput,
    projectReadmePath,
  } = params;

  const projectDir = projectDirInput ?? path.resolve(cwd, 'projects', libName);
  log?.step?.(`génération de la librairie (${path.relative(cwd, projectDir)})`);
  await generateLibrary({projectDir, libName, packageName, version, debug, log, projectReadmePath});

  // If a dist root is provided, force ng-packagr output to that directory.
  if (distRoot) {
    const ngPackagePath = path.resolve(projectDir, 'ng-package.json');
    const ngPkg = await readJson(ngPackagePath);
    const desiredDestAbs = path.resolve(distRoot, libName);
    const projectRoot = path.dirname(ngPackagePath);
    ngPkg.dest = path.relative(projectRoot, desiredDestAbs).split(path.sep).join('/');
    await writeJsonIfChanged(ngPackagePath, ngPkg);
    log?.debug?.('ng-package.json dest overridden', {dest: ngPkg.dest});
  }

  if (noModels) {
    log?.info?.('models ignorés (--no-models)');
    if (debug) log?.debug?.('[meridiane] --no-models enabled, skipping models generation');
    return;
  }

  if (!spec) throw new Error('Internal error: spec is required when noModels=false');
  log?.step?.('génération des models (OpenAPI)');
  await generateModels({projectDir, spec, requiredMode, formats, include, exclude, debug, log});
  log?.success?.('génération terminée');
}
