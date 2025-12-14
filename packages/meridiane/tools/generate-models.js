#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {renderTemplateToFile} from './generator/models/handlebars.js';
import {buildModelsFromOpenAPI} from './generator/models/openapi-to-models.js';
import {ensureCleanDir} from './generator/models/utils.js';
import {asBool, getArg, getArgs} from './utils/cli-args.js';
import {loadDotEnv} from './utils/dotenv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lit la specification OpenAPI depuis une URL http(s) ou un chemin fichier JSON.
 * @param {string} specPathOrUrl
 */
async function readSpec(specPathOrUrl) {
  if (/^https?:\/\//.test(specPathOrUrl)) {
    const res = await fetch(specPathOrUrl);
    if (!res.ok) {
      throw new Error(`Impossible de télécharger la spec : ${res.status} ${res.statusText}`);
    }
    return await res.json();
  }

  try {
    const src = await fs.readFile(specPathOrUrl, 'utf8');
    return JSON.parse(src);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Fichier non trouvé : ${specPathOrUrl}`);
    }
    if (err.name === 'SyntaxError') {
      throw new Error(`JSON invalide dans ${specPathOrUrl} : ${err.message}`);
    }
    throw err;
  }
}
/**
 * Charge un fichier de config local `models.config.js` (CWD) s'il existe.
 * Le module peut exporter par défaut ou via export nommé.
 */
async function loadUserConfig() {
  const cfgPath = await findUp(process.cwd(), 'models.config.js');
  try {
    if (!cfgPath) return {};
    const st = await fs.stat(cfgPath);
    if (!st.isFile()) return {};
    const mod = await import(pathToFileURL(cfgPath).href);
    const cfg = mod?.default ?? mod;
    return (cfg && typeof cfg === 'object') ? cfg : {};
  } catch {
    return {};
  }
}

async function findUp(startDir, fileName) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, fileName);
    try {
      const st = await fs.stat(candidate);
      if (st.isFile()) return candidate;
    } catch {
      // ignore
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
async function main() {
  await loadDotEnv();
  const debug = process.argv.includes('--debug') || /^(1|true|yes)$/i.test(process.env.MERIDIANE_DEBUG ?? '');

  const specPathOrUrl = process.argv[2];
  if (!specPathOrUrl) {
    console.error('Usage: generate-models.js <OpenAPI spec (url|fichier)> [--item-import=../lib/ports/resource-repository.port] [--out=models] [--required-mode=all-optional|spec] [--preset=all|native] [--include=<substr>] [--exclude=<substr>] [--index=1|0]');
    process.exit(1);
  }

  const workDir = process.cwd();
  const userCfg = await loadUserConfig();
  const outDir = path.resolve(workDir, getArg('out', userCfg.outDir || process.env.MERIDIANE_MODELS_OUT || 'models'));
  const writeIndex = (() => {
    const cli = getArg('index', undefined);
    if (typeof cli === 'string') return asBool(cli, true);
    if (typeof userCfg.writeIndex === 'boolean') return userCfg.writeIndex;
    return asBool(process.env.MERIDIANE_MODELS_INDEX ?? '1', true);
  })();
  const itemImportPath = getArg(
    'item-import',
    userCfg.itemImportPath || process.env.MERIDIANE_MODELS_ITEM_IMPORT || '../lib/ports/resource-repository.port'
  );
  const requiredMode = (() => {
    const v = getArg('required-mode', userCfg.requiredMode || process.env.MERIDIANE_MODELS_REQUIRED_MODE || 'all-optional');
    return (v === 'spec' || v === 'all-optional') ? v : 'all-optional';
  })();
  const preset = (() => {
    const v = getArg('preset', userCfg.preset || process.env.MERIDIANE_MODELS_PRESET || 'all');
    return (v === 'native' || v === 'all') ? v : 'all';
  })();
  const preferFlavor = userCfg.preferFlavor; // 'jsonld' | 'jsonapi' | 'none'
  const hydraBaseRegex = userCfg.hydraBaseRegex; // RegExp|string
  const includeCli = getArgs('include').flatMap((v) => v.split(',').map((s) => s.trim()).filter(Boolean));
  const excludeCli = getArgs('exclude').flatMap((v) => v.split(',').map((s) => s.trim()).filter(Boolean));
  const includeSchemaNames = [
    ...(Array.isArray(userCfg.includeSchemaNames) ? userCfg.includeSchemaNames : []),
    ...includeCli,
  ];
  const excludeSchemaNames = [
    ...(Array.isArray(userCfg.excludeSchemaNames) ? userCfg.excludeSchemaNames : []),
    ...excludeCli,
  ];

  if (debug) {
    console.log('[meridiane models] debug', {
      outDir: path.relative(workDir, outDir),
      writeIndex,
      itemImportPath,
      requiredMode,
      preset,
      preferFlavor,
      includeCount: includeSchemaNames.length,
      excludeCount: excludeSchemaNames.length,
    });
  }

  console.log(`📥 Spec OpenAPI: ${specPathOrUrl}`);
  const spec = await readSpec(specPathOrUrl);


  console.log('🔧 Construction des interfaces…');
  const {models} = buildModelsFromOpenAPI(spec, {
    requiredMode,
    preset,
    preferFlavor,
    hydraBaseRegex,
    includeSchemaNames,
    excludeSchemaNames,
  });

  const templatesDir = path.join(__dirname, 'generator', 'models', 'templates');
  await ensureCleanDir(outDir);

  for (const m of models) {
    await renderTemplateToFile({
      templatePath: path.join(templatesDir, 'model.hbs'),
      outPath: path.join(outDir, `${m.name}.ts`),
      ctx: {
        itemImportPath,
        name: m.name,
        props: m.props,
        imports: m.imports,
      },
    });
  }

  if (writeIndex) {
    await renderTemplateToFile({
      templatePath: path.join(templatesDir, 'index.hbs'),
      outPath: path.join(outDir, 'index.ts'),
      ctx: {models: models.map((m) => ({name: m.name}))},
    });
  }

  console.log(`✅ ${models.length} modèle(s) écrit(s) dans ${path.relative(workDir, outDir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
