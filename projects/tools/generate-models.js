#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {renderTemplateToFile} from './generator/models/handlebars.js';
import {buildModelsFromOpenAPI} from './generator/models/openapi-to-models.js';
import {ensureCleanDir} from './generator/models/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getArg(name, def) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
}

async function readSpec(spec) {
  if (/^https?:\/\//.test(spec)) {
    const res = await fetch(spec);
    if (!res.ok) throw new Error(`Impossible de télécharger la spec: ${res.status} ${res.statusText}`);
    return await res.json();
  }
  const src = await fs.readFile(spec, 'utf8');
  return JSON.parse(src);
}

async function main() {
  const specUrl = process.argv[2];
  if (!specUrl) {
    console.error('Usage: generate-models.js <OpenAPI spec (url|fichier)> [--item-import=../lib/ports/resource-repository.port] [--out=models] [--no-index]');
    process.exit(1);
  }

  const workDir = process.cwd();
  const outDir = path.resolve(workDir, getArg('out', 'models'));
  const writeIndex = !('' + process.argv.join(' ')).includes('--no-index');

  console.log(`📥 Spec OpenAPI: ${specUrl}`);
  const spec = await readSpec(specUrl);


  console.log('🔧 Construction des interfaces…');
  const {models} = buildModelsFromOpenAPI(spec);

  const templatesDir = path.join(__dirname, 'generator', 'models', 'templates');
  await ensureCleanDir(outDir);

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
