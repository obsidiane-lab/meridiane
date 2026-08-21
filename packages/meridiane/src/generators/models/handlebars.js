import fs from 'node:fs/promises';
import * as path from 'node:path';
import Handlebars from 'handlebars';

const templateCache = new Map();

/**
 * Rend un template Handlebars avec un contexte et écrit le fichier.
 * @param {{ templatePath: string, outPath: string, ctx: any }} params
 */
export async function renderTemplateToFile({templatePath, outPath, ctx}) {
  let tpl = templateCache.get(templatePath);
  if (!tpl) {
    const tplSrc = await fs.readFile(templatePath, 'utf8');
    tpl = Handlebars.compile(tplSrc, {noEscape: true});
    templateCache.set(templatePath, tpl);
  }
  const out = tpl(ctx);
  await fs.mkdir(path.dirname(outPath), {recursive: true});
  await fs.writeFile(outPath, out, 'utf8');
}
