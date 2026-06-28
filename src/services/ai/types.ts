export type ProviderName = 'gemini' | 'grok' | 'openrouter' | 'cerebras' | 'together' | 'mistral';

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  systemPrompt?: string;
  image?: { base64: string; mimeType: string };
}

export interface AIProvider {
  name: ProviderName;
  generateContent(prompt: string, options?: AIRequestOptions): Promise<string>;
  isAvailable(): boolean;
}

export interface ProviderHealth {
  failures: number;
  successes: number;
  lastUsed: number;
  cooldownUntil: number;
}

export interface AnalyticsData {
  provider: ProviderName;
  durationMs: number;
  success: boolean;
  tokensUsed?: number;
  error?: string;
  isCacheHit: boolean;
}
