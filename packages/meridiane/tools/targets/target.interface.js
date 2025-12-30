export class NotSupportedError extends Error {
  constructor({ target, mode, message }) {
    super(message || `Target "${target}" does not support mode "${mode}".`);
    this.name = 'NotSupportedError';
    this.code = 'NOT_SUPPORTED';
    this.target = target;
    this.mode = mode;
  }
}

export class UnsupportedOptionError extends Error {
  constructor({ target, option, message }) {
    super(message || `Target "${target}" does not support option "${option}".`);
    this.name = 'UnsupportedOptionError';
    this.code = 'UNSUPPORTED_OPTION';
    this.target = target;
    this.option = option;
  }
}
