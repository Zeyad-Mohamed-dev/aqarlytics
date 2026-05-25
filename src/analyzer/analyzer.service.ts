import { Injectable, Inject } from '@nestjs/common';
import { FacebookComment } from 'src/scrapper/types/FacebookComment';
import {  LLM_PROVIDER } from './providers/llm-provider.interface';
import type { ILLMProvider } from './providers/llm-provider.interface';


export interface AnalyzedComment extends FacebookComment {
  interestScore: number;
  reason: string;
}

@Injectable()
export class AnalyzerService {
  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: ILLMProvider,
  ) {}

  async analyzeComments(
    postContent: string,
    comments: FacebookComment[],
  ): Promise<AnalyzedComment[]> {
    if (comments.length === 0) return [];

    const prompt = `You are a real estate lead qualifier analyzing Facebook comments on an Egyptian real estate post.

Post content: "${postContent}"

Comments:
${comments.map((c, i) => `${i}. ${c.author}: "${c.content}"`).join('\n')}

Identify ONLY genuinely interested buyers or renters.

Interested signals:
- Asking about price, location, size, availability
- Requesting contact or a viewing
- Expressing intent to buy or rent
- Asking specific questions about the property
- Leaving a phone number

NOT interested:
- Generic reactions (حلو, ماشاء الله, emojis only)
- Spam or irrelevant comments
- Just tagging friends with no intent
- Other agents promoting their listings

Respond ONLY with a valid JSON array, no markdown, no extra text:
[{
  "index": 0,
  "interestScore": 85,
  "reason": "asking about price and installment options"
}]

If no interested comments found, return empty array: []`;

    const text = await this.llmProvider.complete(prompt);
    if (!text) return [];

    const clean = text.replace(/```json|```/g, '').trim();

    let results: { index: number; interestScore: number; reason: string }[] = [];
    try {
      results = JSON.parse(clean);
    } catch {
      console.error('Failed to parse LLM response:', clean);
      return [];
    }

    return results
      .filter(r => r.interestScore >= 60)
      .map(r => ({
        ...comments[r.index],
        interestScore: r.interestScore,
        reason: r.reason,
      }));
  }
}