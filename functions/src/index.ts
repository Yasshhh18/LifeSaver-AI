import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Firebase App
import * as admin from 'firebase-admin';
admin.initializeApp();

export const aiProxy = functions.https.onCall(async (data, context) => {
  const { provider, prompt, options } = data;
  
  if (!provider || !prompt) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing provider or prompt');
  }

  try {
    switch (provider) {
      case 'gemini':
        return { text: await handleGemini(prompt, options) };
      case 'cerebras':
        return { text: await handleCerebras(prompt, options) };
      case 'grok':
        return { text: await handleGrok(prompt, options) };
      case 'openrouter':
        return { text: await handleOpenRouter(prompt, options) };
      case 'mistral':
        return { text: await handleMistral(prompt, options) };
      case 'together':
        return { text: await handleTogether(prompt, options) };
      default:
        throw new functions.https.HttpsError('invalid-argument', `Unknown provider: ${provider}`);
    }
  } catch (error: any) {
    console.error(`Error in ${provider} proxy:`, error);
    throw new functions.https.HttpsError('internal', error.message || 'AI request failed');
  }
});

async function handleGemini(prompt: string, options: any) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');

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

async function handleCerebras(prompt: string, options: any) {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error('Missing CEREBRAS_API_KEY');

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

async function handleGrok(prompt: string, options: any) {
  const key = process.env.GROK_API_KEY;
  if (!key) throw new Error('Missing GROK_API_KEY');

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

async function handleOpenRouter(prompt: string, options: any) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('Missing OPENROUTER_API_KEY');

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

async function handleMistral(prompt: string, options: any) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('Missing MISTRAL_API_KEY');

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

async function handleTogether(prompt: string, options: any) {
  const key = process.env.TOGETHER_API_KEY || '';
  if (!key) throw new Error('Missing TOGETHER_API_KEY');

  const messages: any[] = [];
  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model: options?.model || 'meta-llama/Llama-3-8b-chat-hf',
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  };
  
  if (options?.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Together API error: ${response.status} - ${await response.text()}`);
  const data = await response.json();
  return data.choices[0].message.content;
}
