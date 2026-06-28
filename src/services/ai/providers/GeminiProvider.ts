import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider';
import type { AIRequestOptions } from '../types';

export class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini', import.meta.env.VITE_GEMINI_API_KEY);
  }

  async generateContent(prompt: string, options?: AIRequestOptions): Promise<string> {
    const key = this.keyManager.getNextKey();
    if (!key) throw new Error('No API keys available for Gemini.');

    const genAI = new GoogleGenerativeAI(key);
    const modelName = options?.model || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const contentParts: any[] = [{ text: prompt }];
    if (options?.image) {
      contentParts.push({
        inlineData: {
          data: options.image.base64,
          mimeType: options.image.mimeType
        }
      });
    }

    const requestOptions: any = {
      contents: [{ role: 'user', parts: contentParts }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      }
    };
    
    if (options?.responseFormat === 'json') {
      requestOptions.generationConfig.responseMimeType = 'application/json';
    }

    const result = await model.generateContent(requestOptions);
    return result.response.text();
  }
}
