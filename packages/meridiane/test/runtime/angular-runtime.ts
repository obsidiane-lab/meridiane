import '@angular/compiler';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const bridge = new URL('../../templates/angular-bridge/src/', import.meta.url).href;

// The CLI ships Angular templates as TypeScript; compile their decorators for these Node tests.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(bridge) && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(bridge) || !url.endsWith('.ts')) return nextLoad(url, context);
    return {
      format: 'module',
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url),
        compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true},
      }).outputText,
      shortCircuit: true,
    };
  },
});
