import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureCleanDir } from '../../infrastructure/files.js';
import { renderTemplateToFile } from './handlebars.js';
import { buildModelsFromOpenAPI } from './openapi-to-models.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(currentDir, 'templates');

export async function writeModelFiles({ projectDir, spec, include, exclude, log }) {
  const outputDir = path.resolve(projectDir, 'src', 'models');
  log.debug('[meridiane] generate models', { outputDir, includeCount: include.length, excludeCount: exclude.length });

  await ensureCleanDir(outputDir);

  const { models } = buildModelsFromOpenAPI(spec, {
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
        extendsTypes: model.extendsTypes,
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

  log.debug(`[meridiane] ${models.length} model(s) generated`);
}
