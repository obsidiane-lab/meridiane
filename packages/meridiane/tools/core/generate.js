import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson, writeJson } from './json.js';
import { findRootTsconfig } from './paths.js';
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

function buildAngularProjectConfig(libName) {
  return {
    root: `projects/${libName}`,
    sourceRoot: `projects/${libName}/src`,
    projectType: 'library',
    architect: {
      build: {
        builder: '@angular/build:ng-packagr',
        configurations: {
          production: {
            tsConfig: `projects/${libName}/tsconfig.lib.prod.json`,
          },
          development: {
            tsConfig: `projects/${libName}/tsconfig.lib.json`,
          },
        },
        defaultConfiguration: 'production',
      },
      test: {
        builder: '@angular/build:karma',
        options: {
          tsConfig: `projects/${libName}/tsconfig.spec.json`,
        },
      },
    },
  };
}

async function patchAngularJson({ cwd, libName }) {
  const angularJsonPath = path.join(cwd, 'angular.json');
  const ng = await readJson(angularJsonPath);
  if (!ng.projects || typeof ng.projects !== 'object') ng.projects = {};
  ng.projects[libName] = buildAngularProjectConfig(libName);
  await writeJson(angularJsonPath, ng);
}

async function patchTsconfigPaths({ cwd, libName, packageName }) {
  const tsconfigPath = await findRootTsconfig(cwd);
  if (!tsconfigPath) return;

  const cfg = await readJson(tsconfigPath);
  if (!cfg.compilerOptions || typeof cfg.compilerOptions !== 'object') cfg.compilerOptions = {};
  if (!cfg.compilerOptions.paths || typeof cfg.compilerOptions.paths !== 'object') cfg.compilerOptions.paths = {};

  const key1 = packageName;
  const key2 = `${packageName}/*`;
  const val1 = [`./projects/${libName}/src/public-api.ts`];
  const val2 = [`./projects/${libName}/src/*`];

  const prev1 = cfg.compilerOptions.paths[key1];
  const prev2 = cfg.compilerOptions.paths[key2];
  const same1 = Array.isArray(prev1) && prev1.length === 1 && prev1[0] === val1[0];
  const same2 = Array.isArray(prev2) && prev2.length === 1 && prev2[0] === val2[0];
  if (same1 && same2) return;

  cfg.compilerOptions.paths[key1] = val1;
  cfg.compilerOptions.paths[key2] = val2;

  await writeJson(tsconfigPath, cfg);
}

async function generateLibrary({ cwd, libName, packageName, version, debug }) {
  const tplDir = path.resolve(pkgRoot, 'templates/_lib_template');
  const targetDir = path.resolve(cwd, 'projects', libName);

  if (debug) {
    console.log('[meridiane] generate lib', {
      libName,
      packageName,
      version,
      targetDir: path.relative(cwd, targetDir),
    });
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await fs.cp(tplDir, targetDir, { recursive: true });

  await replacePlaceholdersInDir(targetDir, { '__LIB_NAME__': libName });

  const libPackageJsonPath = path.join(targetDir, 'package.json');
  if (existsSync(libPackageJsonPath)) {
    const libPkg = await readJson(libPackageJsonPath);
    libPkg.name = packageName;
    libPkg.version = version;
    await writeJson(libPackageJsonPath, libPkg);
  }

  await patchAngularJson({ cwd, libName });
  await patchTsconfigPaths({ cwd, libName, packageName });
}

async function generateModels({ cwd, libName, spec, requiredMode, preset, include, exclude, debug }) {
  const outDir = path.resolve(cwd, 'projects', libName, 'src', 'models');
  const templatesDir = path.resolve(pkgRoot, 'tools', 'generator', 'models', 'templates');

  if (debug) {
    console.log('[meridiane] generate models', {
      outDir: path.relative(cwd, outDir),
      requiredMode,
      preset,
      includeCount: include.length,
      excludeCount: exclude.length,
    });
  }

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
  } = params;

  await generateLibrary({ cwd, libName, packageName, version, debug });

  if (noModels) {
    if (debug) console.log('[meridiane] --no-models enabled, skipping models generation');
    return;
  }

  if (!spec) throw new Error('Internal error: spec is required when noModels=false');
  await generateModels({ cwd, libName, spec, requiredMode, preset, include, exclude, debug });
}
