import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson, writeJsonIfChanged } from '../../infra/json.js';
import { ensureCleanDir } from '../../generator/models/utils.js';

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

function literalPhpDoc(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return 'mixed';
}

function sanitizePhpPropertyName(name) {
  const raw = String(name ?? '');
  let sanitized = raw.replace(/[^A-Za-z0-9_]+/g, '_');
  if (!/^[A-Za-z_]/.test(sanitized)) sanitized = `_${sanitized}`;
  return sanitized || '_';
}

function typeIrToPhpDoc(type, namespaceRoot) {
  if (!type) return 'mixed';
  switch (type.kind) {
    case 'any':
      return 'mixed';
    case 'string':
      return 'string';
    case 'number':
      return 'float';
    case 'boolean':
      return 'bool';
    case 'null':
      return 'null';
    case 'literal':
      return literalPhpDoc(type.value);
    case 'ref':
      return `${namespaceRoot}\\Model\\${type.name}`;
    case 'array':
      return `${typeIrToPhpDoc(type.items, namespaceRoot)}[]`;
    case 'map':
      return `array<string, ${typeIrToPhpDoc(type.values, namespaceRoot)}>`;
    case 'union':
      return type.types.map((t) => typeIrToPhpDoc(t, namespaceRoot)).join('|');
    case 'intersection':
      return type.types.map((t) => typeIrToPhpDoc(t, namespaceRoot)).join('&');
    case 'object':
      return 'array<string, mixed>';
    default:
      return 'mixed';
  }
}

function basePhpType(type, namespaceRoot) {
  if (!type) return 'mixed';
  switch (type.kind) {
    case 'string':
      return 'string';
    case 'number':
      return 'float';
    case 'boolean':
      return 'bool';
    case 'null':
      return 'null';
    case 'ref':
      return `${type.name}`;
    case 'array':
    case 'map':
    case 'object':
      return 'array';
    case 'literal':
      if (type.value === null) return 'null';
      if (typeof type.value === 'string') return 'string';
      if (typeof type.value === 'number' || typeof type.value === 'bigint') return 'float';
      if (typeof type.value === 'boolean') return 'bool';
      return 'mixed';
    case 'union':
    case 'intersection':
      return 'mixed';
    default:
      return 'mixed';
  }
}

function hasNull(type) {
  if (!type) return false;
  if (type.kind === 'null') return true;
  if (type.kind === 'union') return type.types.some((t) => hasNull(t));
  return false;
}

function typeIrToPhp(type, namespaceRoot, optional) {
  const doc = typeIrToPhpDoc(type, namespaceRoot);
  const nullable = optional || hasNull(type);
  const base = basePhpType(type, namespaceRoot);

  let phpType = base;
  if (nullable) {
    if (phpType === 'null') phpType = 'mixed';
    else if (!phpType.includes('|') && phpType !== 'mixed') phpType = `?${phpType}`;
    else if (phpType !== 'mixed' && !phpType.includes('null')) phpType = `${phpType}|null`;
  }

  let phpDoc = doc;
  if (nullable && !phpDoc.includes('null')) phpDoc = `${phpDoc}|null`;

  return { phpType, phpDoc };
}

async function generateLibrary({ projectDir, packageName, version, namespaceRoot, bundleName, debug, log, projectReadmePath }) {
  const tplDir = path.resolve(pkgRoot, 'templates', 'symfony');
  const targetDir = projectDir;

  if (debug) {
    log?.debug?.('[meridiane] generate symfony bundle', {
      packageName,
      version,
      namespaceRoot,
      bundleName,
      targetDir,
    });
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await fs.cp(tplDir, targetDir, { recursive: true });

  await replacePlaceholdersInDir(targetDir, {
    '__PACKAGE_NAME__': packageName,
    '__BUNDLE_NAMESPACE__': namespaceRoot,
    '__BUNDLE_NAME__': bundleName,
    '__VERSION__': version,
  });

  const composerJsonPath = path.join(targetDir, 'composer.json');
  if (existsSync(composerJsonPath)) {
    const composer = await readJson(composerJsonPath);
    composer.name = packageName;
    composer.version = version;
    composer.autoload = composer.autoload || {};
    composer.autoload['psr-4'] = composer.autoload['psr-4'] || {};
    composer.autoload['psr-4'][`${namespaceRoot}\\`] = 'src/';
    await writeJsonIfChanged(composerJsonPath, composer);
  }

  await appendProjectReadme({
    targetReadmePath: path.join(targetDir, 'README.md'),
    projectReadmePath,
    debug,
    log,
  });
}

async function generateModels({ projectDir, models, namespaceRoot, debug, log }) {
  const outDir = path.resolve(projectDir, 'src', 'Model');
  await ensureCleanDir(outDir);

  for (const m of models) {
    const className = m.name;
    const importLines = [];
    const modelImports = m.imports || [];
    for (const imp of modelImports) {
      importLines.push(`use ${namespaceRoot}\\Model\\${imp};`);
    }
    if (m.extendsItem) {
      importLines.push(`use ${namespaceRoot}\\Bridge\\Item;`);
    }

    const extendsTypes = m.extends || [];
    const extendsClass = extendsTypes.length === 1 ? extendsTypes[0] : null;
    const implementsTypes = [];
    if (m.extendsItem) implementsTypes.push('Item');

    const docLines = [];
    if (extendsTypes.length > 1) {
      docLines.push(` * @extends ${extendsTypes.join('&')}`);
    }

    const props = m.props.map((p) => {
      const { phpType, phpDoc } = typeIrToPhp(p.type, namespaceRoot, p.optional);
      const defaultValue = p.optional || phpType.startsWith('?') || phpType.includes('|null') ? ' = null' : '';
      const safeName = sanitizePhpPropertyName(p.name);
      return {
        name: safeName,
        originalName: safeName !== p.name ? p.name : null,
        phpType,
        phpDoc,
        defaultValue,
      };
    });

    const lines = [];
    lines.push('<?php');
    lines.push('');
    lines.push(`namespace ${namespaceRoot}\\Model;`);
    lines.push('');
    if (importLines.length > 0) {
      lines.push(...importLines.sort());
      lines.push('');
    }
    if (docLines.length > 0) {
      lines.push('/**');
      lines.push(...docLines);
      lines.push(' */');
    }
    const extendsClause = extendsClass ? ` extends ${extendsClass}` : '';
    const implementsClause = implementsTypes.length > 0 ? ` implements ${implementsTypes.join(', ')}` : '';
    lines.push(`final class ${className}${extendsClause}${implementsClause}`);
    lines.push('{');
    for (const prop of props) {
      lines.push('    /**');
      lines.push(`     * @var ${prop.phpDoc}`);
      if (prop.originalName) {
        lines.push(`     * @originalName ${prop.originalName}`);
      }
      lines.push('     */');
      lines.push(`    public ${prop.phpType} $${prop.name}${prop.defaultValue};`);
      lines.push('');
    }
    lines.push('}');

    await fs.writeFile(path.join(outDir, `${className}.php`), lines.join('\n'));
  }

  if (debug) log?.debug?.(`[meridiane] ${models.length} model(s) generated (php)`);
}

export async function generateSymfonyBridge({ cwd, projectDir, config, ir, debug, log, projectReadmePath }) {
  log?.step?.(`génération du bundle (${path.relative(cwd, projectDir)})`);
  await generateLibrary({
    projectDir,
    packageName: config.packageName,
    version: config.version,
    namespaceRoot: config.namespaceRoot,
    bundleName: config.bundleName,
    debug,
    log,
    projectReadmePath,
  });

  if (config.noModels) {
    log?.info?.('models ignorés (--no-models)');
    if (debug) log?.debug?.('[meridiane] --no-models enabled, skipping models generation');
    return;
  }

  if (!ir?.models) throw new Error('Internal error: models IR is required when noModels=false');
  log?.step?.('génération des models (OpenAPI)');
  await generateModels({
    projectDir,
    models: ir.models,
    namespaceRoot: config.namespaceRoot,
    debug,
    log,
  });
  log?.success?.('génération terminée');
}
