export class CredentialsPolicy {
  constructor(private readonly init: unknown) {
  }

  withCredentials(): boolean {
    const c = this.init as any;
    return c?.withCredentials === true || c?.credentials === 'include';
  }
}
