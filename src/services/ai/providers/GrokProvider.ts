import { BaseProvider } from './BaseProvider';
import type { AIRequestOptions } from '../types';

export class GrokProvider extends BaseProvider {
  constructor() {
    super('grok', import.meta.env.VITE_GROK_API_KEY);
  }

  async generateContent(prompt: string, options?: AIRequestOptions): Promise<string> {
    const key = this.keyManager.getNextKey();
    if (!key) throw new Error('No API keys available for Grok.');

    const messages: any[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model: options?.model || 'grok-beta',
      messages,
      temperature: options?.temperature ?? 0.7,
      stream: false
    };

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Grok API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }
}
