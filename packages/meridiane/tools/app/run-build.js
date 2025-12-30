import { runEngine } from '../engine/run.js';

export async function runBuild(packageName, opts) {
  await runEngine({ mode: 'build', packageNameArg: packageName, opts });
  return 0;
}
