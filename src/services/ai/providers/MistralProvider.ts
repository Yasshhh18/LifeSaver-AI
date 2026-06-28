import { BaseProvider } from './BaseProvider';
import type { AIRequestOptions } from '../types';

export class MistralProvider extends BaseProvider {
  constructor() {
    super('mistral', import.meta.env.VITE_MISTRAL_API_KEY);
  }

  async generateContent(prompt: string, options?: AIRequestOptions): Promise<string> {
    const key = this.keyManager.getNextKey();
    if (!key) throw new Error('No API keys available for Mistral.');

    const messages: any[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model: options?.model || 'mistral-large-latest',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Mistral API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }
}
