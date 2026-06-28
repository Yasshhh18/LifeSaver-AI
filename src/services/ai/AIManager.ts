import { GeminiProvider } from './providers/GeminiProvider';
import { GrokProvider } from './providers/GrokProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { CerebrasProvider } from './providers/CerebrasProvider';
import { TogetherProvider } from './providers/TogetherProvider';
import { MistralProvider } from './providers/MistralProvider';
import { CacheManager } from './utils/CacheManager';
import { HealthMonitor } from './utils/HealthMonitor';
import { AnalyticsLogger } from './utils/AnalyticsLogger';
import type { AIProvider, AIRequestOptions, ProviderName } from './types';

export class AIManager {
  private static instance: AIManager;
  
  private providers: AIProvider[] = [];
  private cache: CacheManager;
  private health: HealthMonitor;
  private analytics: AnalyticsLogger;

  // Order of preference
  private readonly PROVIDER_ORDER: ProviderName[] = [
    'cerebras',
    'mistral',
    'openrouter',
    'gemini',
    'grok',
    'together'
  ];

  private constructor() {
    this.cache = new CacheManager();
    this.health = new HealthMonitor(this.PROVIDER_ORDER);
    this.analytics = new AnalyticsLogger();

    // Register providers
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenRouterProvider());
    this.registerProvider(new CerebrasProvider());
    this.registerProvider(new MistralProvider());
    this.registerProvider(new GrokProvider());
    this.registerProvider(new TogetherProvider());
  }

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  private registerProvider(provider: AIProvider) {
    if (provider.isAvailable()) {
      this.providers.push(provider);
    }
  }

  private getOrderedAvailableProviders(preferJson = false): AIProvider[] {
    // For JSON tasks, prioritize providers with native JSON mode (Gemini, Mistral)
    const order = preferJson
      ? ['gemini', 'mistral', 'openrouter', 'cerebras', 'grok', 'together'] as ProviderName[]
      : this.PROVIDER_ORDER;
    return order
      .map(name => this.providers.find(p => p.name === name))
      .filter((p): p is AIProvider => p !== undefined && this.health.isHealthy(p.name));
  }

  public async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    const cacheKey = this.cache.generateKey(prompt, options);
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      this.analytics.logRequest({
        provider: 'gemini', // pseudo provider for cache
        durationMs: 0,
        success: true,
        isCacheHit: true
      });
      return cached;
    }

    const isJsonRequest = options?.responseFormat === 'json';
    const availableProviders = this.getOrderedAvailableProviders(isJsonRequest);
    if (availableProviders.length === 0) {
      throw new Error('All AI providers are currently unavailable or in cooldown.');
    }

    let lastError: Error | null = null;

    for (const provider of availableProviders) {
      const MAX_RETRIES_PER_PROVIDER = 1;
      
      for (let attempt = 0; attempt <= MAX_RETRIES_PER_PROVIDER; attempt++) {
        const startTime = Date.now();
        try {
          const result = await provider.generateContent(prompt, options);
          
          this.health.recordSuccess(provider.name);
          this.analytics.logRequest({
            provider: provider.name,
            durationMs: Date.now() - startTime,
            success: true,
            isCacheHit: false
          });

          await this.cache.set(cacheKey, result);
          return result;
          
        } catch (error: any) {
          lastError = error;
          
          this.health.recordFailure(provider.name);
          this.analytics.logRequest({
            provider: provider.name,
            durationMs: Date.now() - startTime,
            success: false,
            isCacheHit: false,
            error: error.message
          });

          // Wait before retry if it's not the last attempt for this provider
          if (attempt < MAX_RETRIES_PER_PROVIDER) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  public async generateJSON<T>(prompt: string, options?: AIRequestOptions): Promise<T> {
    const jsonOptions = { ...options, responseFormat: 'json' as const };
    
    // Try up to 2 times for JSON generation
    for (let jsonAttempt = 0; jsonAttempt < 2; jsonAttempt++) {
      const rawResult = await this.generateText(prompt, jsonOptions);
      
      try {
        let cleanJson = rawResult.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const firstBrace = cleanJson.search(/[\[{]/);
        const lastBrace = cleanJson.search(/[\]}][^\]}]*$/);
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }
        // Remove trailing commas which break JSON.parse
        cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');
        const parsed = JSON.parse(cleanJson) as T;
        console.log('[AIManager] JSON parsed successfully');
        return parsed;
      } catch (e) {
        console.error(`[AIManager] JSON parse attempt ${jsonAttempt + 1} failed. Raw response:`, rawResult.substring(0, 500));
        // Invalidate the cache so the next attempt doesn't get the same bad response
        const cacheKey = this.cache.generateKey(prompt, jsonOptions);
        this.cache.invalidate(cacheKey);
        
        if (jsonAttempt === 1) {
          throw new Error(`Invalid JSON returned by AI provider after 2 attempts`);
        }
        // Brief pause before retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error('JSON generation failed unexpectedly');
  }

  public async chat(systemPrompt: string, history: { role: string, content: string }[], message: string, options?: AIRequestOptions): Promise<string> {
    let fullPrompt = `${systemPrompt}\n\n`;
    for (const msg of history) {
      fullPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
    }
    fullPrompt += `USER: ${message}`;
    
    return this.generateText(fullPrompt, options);
  }
}
