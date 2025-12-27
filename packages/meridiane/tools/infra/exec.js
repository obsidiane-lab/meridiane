import process from 'node:process';
import { spawn } from 'node:child_process';

export class ExitCodeError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.name = 'ExitCodeError';
    this.exitCode = exitCode;
  }
}

export function runCommand(cmd, args, { cwd, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      env: env ?? process.env,
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}
