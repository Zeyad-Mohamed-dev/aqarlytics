import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { AnalyzedComment } from 'src/analyzer/analyzer.service';
import { DemandSignal } from '../entities/demand-signals.entity';
import { MarketObservation } from '../entities/market-observation';

@Injectable()
export class DemandSignalService {
  constructor(
    @InjectRepository(DemandSignal)
    private readonly demandSignalRepo: Repository<DemandSignal>,
    @InjectRepository(MarketObservation)
    private readonly marketObservationRepo: Repository<MarketObservation>,
  ) {}

  async persistMany(postId: string, comments: AnalyzedComment[]): Promise<DemandSignal[]> {
    if (comments.length === 0) return [];

    const postObservation: MarketObservation | null = await this.marketObservationRepo.findOne({
      where: { postId },
      order: { observedAt: 'DESC' },
    });

    const persisted: DemandSignal[] = [];

    for (const comment of comments) {
      const existing = await this.demandSignalRepo.findOne({
        where: { postId, commentId: comment.id },
      });

      if (existing) {
        persisted.push(existing);
        continue;
      }

      const signalData: DeepPartial<DemandSignal> = {
        postId,
        locationId: postObservation?.locationId ?? null,
        propertyType: postObservation?.propertyType ?? null,
        commentId: comment.id,
        commentAuthor: comment.author,
        commentAuthorUrl: comment.authorUrl,
        commentContent: comment.content,
        commentTimestamp: comment.timestamp,
        interestScore: comment.interestScore,
        reason: comment.reason,
        intentCategory: this.categorizeIntent(comment.content, comment.reason),
        observedAt: new Date(),
      };

      const signal = this.demandSignalRepo.create(signalData);

      const saved: DemandSignal = await this.demandSignalRepo.save(signal);
      persisted.push(saved);
    }

    return persisted;
  }

  private categorizeIntent(content: string, reason: string): string {
    const text = `${content} ${reason}`.toLowerCase();

    if (/(price|سعر|كام|تقسيط|installment)/i.test(text)) {
      return 'pricing';
    }

    if (/(location|فين|عنوان|منطقة|district|compound)/i.test(text)) {
      return 'location';
    }

    if (/(size|area|مساحة|متر|sqm|غرف|حمام)/i.test(text)) {
      return 'specifications';
    }

    if (/(call|contact|phone|رقم|تواصل|واتساب|whatsapp|viewing|معاينة)/i.test(text)) {
      return 'contact';
    }

    return 'general_interest';
  }
}
