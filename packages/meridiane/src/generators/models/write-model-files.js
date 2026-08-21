import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderTemplateToFile } from './handlebars.js';
import { buildModelsFromOpenAPI } from './openapi-to-models.js';
import { ensureCleanDir } from './utils.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(currentDir, 'templates');

export async function writeModelFiles({ projectDir, spec, requiredMode, formats, include, exclude, debug, log }) {
  const outputDir = path.resolve(projectDir, 'src', 'models');
  if (debug) {
    log?.debug?.('[meridiane] generate models', {
      outputDir,
      requiredMode,
      formats: Array.isArray(formats) ? formats : [],
      includeCount: include.length,
      excludeCount: exclude.length,
    });
  }

  await ensureCleanDir(outputDir);

  const { models } = buildModelsFromOpenAPI(spec, {
    requiredMode,
    formats: Array.isArray(formats) ? formats : [],
    includeSchemaNames: include,
    excludeSchemaNames: exclude,
  });

  for (const model of models) {
    await renderTemplateToFile({
      templatePath: path.join(templatesDir, model.isAlias ? 'type-alias.hbs' : 'model.hbs'),
      outPath: path.join(outputDir, `${model.name}.ts`),
      ctx: {
        name: model.name,
        props: model.props,
        imports: model.imports,
        extendsTypes: model.extendsTypes || [],
        extendsItem: model.extendsItem === true,
        type: model.type,
        separator: model.imports.length > 0 ? '\n' : '',
      },
    });
  }

  await renderTemplateToFile({
    templatePath: path.join(templatesDir, 'index.hbs'),
    outPath: path.join(outputDir, 'index.ts'),
    ctx: { models: models.map(({ name }) => ({ name })) },
  });

  if (debug) log?.debug?.(`[meridiane] ${models.length} model(s) generated`);
}
