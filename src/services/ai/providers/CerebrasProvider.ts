import { BaseProvider } from './BaseProvider';
import type { AIRequestOptions } from '../types';

export class CerebrasProvider extends BaseProvider {
  constructor() {
    super('cerebras', import.meta.env.VITE_CEREBRAS_API_KEY);
  }

  async generateContent(prompt: string, options?: AIRequestOptions): Promise<string> {
    const key = this.keyManager.getNextKey();
    if (!key) throw new Error('No API keys available for Cerebras.');

    const messages: any[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model: options?.model || 'llama3.1-8b',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    };

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Cerebras API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }
}
