export class CredentialsPolicy {
  constructor(
    private readonly init: RequestInit | {withCredentials?: boolean} | undefined,
  ) {
  }

  withCredentials(): boolean {
    if (!this.init) return false;
    const c = this.init as RequestInit & {withCredentials?: boolean};
    return c.withCredentials === true || c.credentials === 'include';
  }
}
