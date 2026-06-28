import type { ProviderName, ProviderHealth } from '../types';

export class HealthMonitor {
  private health: Record<string, ProviderHealth> = {};
  private readonly MAX_FAILURES = 3;
  private readonly COOLDOWN_MS = 1000 * 60 * 5; // 5 minutes

  constructor(providers: ProviderName[]) {
    providers.forEach(p => {
      this.health[p] = { failures: 0, successes: 0, lastUsed: 0, cooldownUntil: 0 };
    });
  }

  recordSuccess(provider: ProviderName) {
    if (!this.health[provider]) {
      this.health[provider] = { failures: 0, successes: 0, lastUsed: 0, cooldownUntil: 0 };
    }
    this.health[provider].successes++;
    this.health[provider].failures = 0;
    this.health[provider].lastUsed = Date.now();
  }

  recordFailure(provider: ProviderName) {
    if (!this.health[provider]) {
      this.health[provider] = { failures: 0, successes: 0, lastUsed: 0, cooldownUntil: 0 };
    }
    this.health[provider].failures++;
    this.health[provider].lastUsed = Date.now();

    if (this.health[provider].failures >= this.MAX_FAILURES) {
      this.health[provider].cooldownUntil = Date.now() + this.COOLDOWN_MS;
      console.warn(`[HealthMonitor] Provider ${provider} entered cooldown for 5 minutes.`);
    }
  }

  isHealthy(provider: ProviderName): boolean {
    const data = this.health[provider];
    if (!data) return true; // If not tracked, assume healthy
    
    if (data.cooldownUntil > Date.now()) {
      return false; // Still in cooldown
    }
    
    // Cooldown expired, reset failures so it can be tried again
    if (data.failures >= this.MAX_FAILURES) {
      data.failures = 0;
      data.cooldownUntil = 0;
    }
    
    return true;
  }
}
