import { Injectable } from '@nestjs/common';
import { ILLMProvider } from './llm-provider.interface';

@Injectable()
export class GroqProvider implements ILLMProvider {
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly apiKey = process.env.GROQ_API_KEY;

  async complete(prompt: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      return '';
    }

    return data.choices?.[0]?.message?.content || '';
  }
}