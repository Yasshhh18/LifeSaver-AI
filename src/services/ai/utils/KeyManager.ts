export class KeyManager {
  private keys: string[] = [];
  private currentIndex = 0;

  constructor(envKeys: string | undefined) {
    this.keys = (envKeys || '').split(',').map(k => k.trim()).filter(Boolean);
  }

  getNextKey(): string | null {
    if (this.keys.length === 0) return null;
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  hasKeys(): boolean {
    return this.keys.length > 0;
  }
}
