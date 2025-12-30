import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson, writeJsonIfChanged } from '../../infra/json.js';
import { renderTemplateToFile } from '../../generator/models/handlebars.js';
import { ensureCleanDir, quoteKeyIfNeeded } from '../../generator/models/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgRoot = path.resolve(__dirname, '../../../..'); // packages/meridiane

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

async function appendProjectReadme({ targetReadmePath, projectReadmePath, debug, log }) {
  if (!projectReadmePath) return;

  const projectReadme = await readTextIfExists(projectReadmePath);
  if (!projectReadme || projectReadme.trim().length === 0) return;

  const targetReadme = await readTextIfExists(targetReadmePath);
  if (!targetReadme || targetReadme.trim().length === 0) {
    await fs.writeFile(targetReadmePath, projectReadme);
    if (debug) log?.debug?.('[meridiane] project README copied', { source: projectReadmePath });
    return;
  }

  const combined =
    `${targetReadme.trimEnd()}\n\n---\n\n` +
    `## Documentation du projet\n\n` +
    `${projectReadme.trimStart()}`;
  await fs.writeFile(targetReadmePath, combined);
  if (debug) log?.debug?.('[meridiane] project README appended', { source: projectReadmePath });
}

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

function escapeTsStringLiteral(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function typeIrToTs(type) {
  if (!type) return 'any';
  switch (type.kind) {
    case 'any':
      return 'any';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'literal':
      if (type.value === null) return 'null';
      if (typeof type.value === 'string') return `'${escapeTsStringLiteral(type.value)}'`;
      if (typeof type.value === 'number' || typeof type.value === 'bigint') return String(type.value);
      if (typeof type.value === 'boolean') return type.value ? 'true' : 'false';
      return 'any';
    case 'ref':
      return type.name;
    case 'array':
      return `${typeIrToTs(type.items)}[]`;
    case 'map':
      return `{ [key: string]: ${typeIrToTs(type.values)} }`;
    case 'union':
      return type.types.map(typeIrToTs).join(' | ');
    case 'intersection':
      return type.types.map(typeIrToTs).join(' & ');
    case 'object': {
      const props = Array.isArray(type.props) ? type.props : [];
      const entries = props.map((p) => {
        const key = quoteKeyIfNeeded(p.name);
        const opt = p.optional ? '?' : '';
        return `${key}${opt}: ${typeIrToTs(p.type)};`;
      });
      if (type.additionalProperties) {
        entries.push(`[key: string]: ${typeIrToTs(type.additionalProperties)};`);
      }
      return `{ ${entries.join(' ')} }`;
    }
    default:
      return 'any';
  }
}

async function generateLibrary({ projectDir, libName, packageName, version, debug, log, projectReadmePath }) {
  const tplDir = path.resolve(pkgRoot, 'templates', 'angular');
  const targetDir = projectDir;

  if (debug) {
    log?.debug?.('[meridiane] generate lib', {
      libName,
      packageName,
      version,
      targetDir,
    });
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await fs.cp(tplDir, targetDir, { recursive: true });

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
}

async function generateModels({ projectDir, models, debug, log }) {
  const outDir = path.resolve(projectDir, 'src', 'models');
  const templatesDir = path.resolve(pkgRoot, 'tools', 'generator', 'models', 'templates');

  if (debug) {
    log?.debug?.('[meridiane] generate models', { outDir, count: models.length });
  }

  await ensureCleanDir(outDir);

  for (const m of models) {
    await renderTemplateToFile({
      templatePath: path.join(templatesDir, 'model.hbs'),
      outPath: path.join(outDir, `${m.name}.ts`),
      ctx: {
        name: m.name,
        props: m.props.map((p) => ({
          tsKey: quoteKeyIfNeeded(p.name),
          type: typeIrToTs(p.type),
          optional: p.optional,
        })),
        imports: m.imports || [],
        extendsTypes: m.extends || [],
        extendsItem: m.extendsItem === true,
      },
    });
  }

  await renderTemplateToFile({
    templatePath: path.join(templatesDir, 'index.hbs'),
    outPath: path.join(outDir, 'index.ts'),
    ctx: { models: models.map((m) => ({ name: m.name })) },
  });

  if (debug) log?.debug?.(`[meridiane] ${models.length} model(s) generated`);
}

export async function generateAngularBridge({ cwd, projectDir, libName, packageName, version, noModels, ir, debug, log, projectReadmePath, distRoot }) {
  log?.step?.(`génération de la librairie (${path.relative(cwd, projectDir)})`);
  await generateLibrary({ projectDir, libName, packageName, version, debug, log, projectReadmePath });

  if (distRoot) {
    const ngPackagePath = path.resolve(projectDir, 'ng-package.json');
    const ngPkg = await readJson(ngPackagePath);
    const desiredDestAbs = path.resolve(distRoot, libName);
    const projectRoot = path.dirname(ngPackagePath);
    ngPkg.dest = path.relative(projectRoot, desiredDestAbs).split(path.sep).join('/');
    await writeJsonIfChanged(ngPackagePath, ngPkg);
    log?.debug?.('ng-package.json dest overridden', { dest: ngPkg.dest });
  }

  if (noModels) {
    log?.info?.('models ignorés (--no-models)');
    if (debug) log?.debug?.('[meridiane] --no-models enabled, skipping models generation');
    return;
  }

  if (!ir?.models) throw new Error('Internal error: models IR is required when noModels=false');
  log?.step?.('génération des models (OpenAPI)');
  await generateModels({ projectDir, models: ir.models, debug, log });
  log?.success?.('génération terminée');
}
