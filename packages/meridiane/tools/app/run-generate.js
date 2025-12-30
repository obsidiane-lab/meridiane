import { runEngine } from '../engine/run.js';

export async function runGenerate(packageName, opts) {
  await runEngine({ mode: 'generate', packageNameArg: packageName, opts });
  return 0;
}
