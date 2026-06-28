import type { AIProvider, ProviderName, AIRequestOptions } from '../types';
import { KeyManager } from '../utils/KeyManager';

export abstract class BaseProvider implements AIProvider {
  public name: ProviderName;
  protected keyManager: KeyManager;

  constructor(name: ProviderName, envKeys: string | undefined) {
    this.name = name;
    this.keyManager = new KeyManager(envKeys);
  }

  isAvailable(): boolean {
    return this.keyManager.hasKeys();
  }

  abstract generateContent(prompt: string, options?: AIRequestOptions): Promise<string>;
}
