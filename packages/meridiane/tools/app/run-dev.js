import { runEngine } from '../engine/run.js';

export async function runDev(packageName, opts) {
  await runEngine({ mode: 'dev', packageNameArg: packageName, opts });
  return 0;
}
