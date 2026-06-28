import { BaseProvider } from './BaseProvider';
import type { AIRequestOptions } from '../types';

export class OpenRouterProvider extends BaseProvider {
  constructor() {
    super('openrouter', import.meta.env.VITE_OPENROUTER_API_KEY);
  }

  async generateContent(prompt: string, options?: AIRequestOptions): Promise<string> {
    const key = this.keyManager.getNextKey();
    if (!key) throw new Error('No API keys available for OpenRouter.');

    const modelName = options?.model || 'google/gemini-2.5-flash';
    
    const messages: any[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    
    if (options?.image) {
      messages.push({ 
        role: 'user', 
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${options.image.mimeType};base64,${options.image.base64}` } }
        ] 
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const body: any = {
      model: modelName,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    };
    
    if (options?.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }
}
