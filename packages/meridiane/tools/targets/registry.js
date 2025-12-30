import { createAngularTarget } from './angular/target.js';
import { createSymfonyTarget } from './symfony/target.js';

const targets = new Map();

function register(target) {
  targets.set(target.id, target);
}

register(createAngularTarget());
register(createSymfonyTarget());

export function resolveTarget(targetId) {
  const target = targets.get(targetId);
  if (!target) {
    const known = [...targets.keys()].sort().join(', ');
    throw new Error(`Unknown target "${targetId}". Known targets: ${known}`);
  }
  return target;
}

export function listTargets() {
  return [...targets.keys()].sort();
}
