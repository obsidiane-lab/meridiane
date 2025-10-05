#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {renderTemplateToFile} from './generator/models/handlebars.js';
import {buildModelsFromOpenAPI} from './generator/models/openapi-to-models.js';
import {ensureCleanDir} from './generator/models/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Récupère un argument CLI de la forme --name=value
 * @param {string} name
 * @param {string|undefined} def
 * @returns {string|undefined}
 */
function getArg(name, def) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
}

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
async function main() {
  const specPathOrUrl = process.argv[2];
  if (!specPathOrUrl) {
    console.error('Usage: generate-models.js <OpenAPI spec (url|fichier)> [--item-import=../lib/ports/resource-repository.port] [--out=models] [--no-index]');
    process.exit(1);
  }

  const workDir = process.cwd();
  const outDir = path.resolve(workDir, getArg('out', 'models'));
  const writeIndex = !('' + process.argv.join(' ')).includes('--no-index');
  const itemImportPath = getArg('item-import', '../lib/ports/resource-repository.port');

  console.log(`📥 Spec OpenAPI: ${specPathOrUrl}`);
  const spec = await readSpec(specPathOrUrl);


  console.log('🔧 Construction des interfaces…');
  const {models} = buildModelsFromOpenAPI(spec);

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
