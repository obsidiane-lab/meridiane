import fs from 'node:fs/promises';
import * as path from 'node:path';
import Handlebars from 'handlebars';

/**
 * Rend un template Handlebars avec un contexte et écrit le fichier.
 * @param {{ templatePath: string, outPath: string, ctx: any }} params
 */
export async function renderTemplateToFile({templatePath, outPath, ctx}) {
  const tplSrc = await fs.readFile(templatePath, 'utf8');
  const tpl = Handlebars.compile(tplSrc, {noEscape: true});
  const out = tpl(ctx);
  await fs.mkdir(path.dirname(outPath), {recursive: true});
  await fs.writeFile(outPath, out, 'utf8');
}
