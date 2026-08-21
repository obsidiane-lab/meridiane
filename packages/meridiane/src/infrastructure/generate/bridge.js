import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {readJson, writeJsonIfChanged} from '../json.js';
import {renderTemplateToFile} from '../../generators/models/handlebars.js';
import {ensureCleanDir} from '../../generators/models/utils.js';
import {buildModelsFromOpenAPI} from '../../generators/models/openapi-to-models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgRoot = path.resolve(__dirname, '../../..'); // packages/meridiane
const bridgeTemplateDir = path.join(pkgRoot, 'templates', 'angular-bridge');
const modelTemplatesDir = path.join(pkgRoot, 'src', 'generators', 'models', 'templates');

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

  const combined = `${targetReadme.trimEnd()}\n\n---\n\n## Documentation du projet\n\n${projectReadme.trimStart()}`;
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
      const content = await fs.readFile(fullPath, 'utf8');
      let next = content;
      for (const [key, value] of Object.entries(placeholders)) {
        next = next.replaceAll(key, value);
      }
      if (next !== content) await fs.writeFile(fullPath, next);
    }
  }
}

async function generateLibrary({projectDir, libName, packageName, version, debug, log, projectReadmePath}) {
  if (debug) {
    log?.debug?.('[meridiane] generate lib', {
      libName,
      packageName,
      version,
      targetDir: projectDir,
    });
  }

  await fs.rm(projectDir, {recursive: true, force: true});
  await fs.mkdir(projectDir, {recursive: true});
  await fs.cp(bridgeTemplateDir, projectDir, {recursive: true});

  await replacePlaceholdersInDir(projectDir, {
    '__LIB_NAME__': libName,
    '__PACKAGE_NAME__': packageName,
  });

  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  packageJson.name = packageName;
  packageJson.version = version;
  await writeJsonIfChanged(packageJsonPath, packageJson);

  await appendProjectReadme({
    targetReadmePath: path.join(projectDir, 'README.md'),
    projectReadmePath,
    debug,
    log,
  });

  // angular.json / workspace patching is intentionally not done here.
}

async function generateModels({projectDir, spec, requiredMode, formats, include, exclude, debug, log}) {
  const outDir = path.resolve(projectDir, 'src', 'models');

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

  const {models} = buildModelsFromOpenAPI(spec, {
    requiredMode,
    formats: Array.isArray(formats) ? formats : [],
    includeSchemaNames: include,
    excludeSchemaNames: exclude,
  });

  for (const m of models) {
    await renderTemplateToFile({
      templatePath: path.join(modelTemplatesDir, 'model.hbs'),
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
    templatePath: path.join(modelTemplatesDir, 'index.hbs'),
    outPath: path.join(outDir, 'index.ts'),
    ctx: {models: models.map((m) => ({name: m.name}))},
  });

  if (debug) log?.debug?.(`[meridiane] ${models.length} model(s) generated`);
}

async function configurePackageOutput(projectDir, distRoot, libName, log) {
  const ngPackagePath = path.join(projectDir, 'ng-package.json');
  const ngPackage = await readJson(ngPackagePath);
  const outputDir = path.join(distRoot, libName);

  ngPackage.dest = path.relative(projectDir, outputDir).split(path.sep).join('/');
  await writeJsonIfChanged(ngPackagePath, ngPackage);
  log?.debug?.('ng-package.json dest overridden', {dest: ngPackage.dest});
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

  if (distRoot) {
    await configurePackageOutput(projectDir, distRoot, libName, log);
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
