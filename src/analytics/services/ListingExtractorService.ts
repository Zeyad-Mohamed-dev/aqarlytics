import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { type ILLMProvider, LLM_PROVIDER } from 'src/analyzer/providers/llm-provider.interface';
import { MarketObservation } from '../entities/market-observation';
import { LocationDimension } from '../entities/location-dimension.entity';
import { PropertyType } from '../types/property-type.enum';
import { TransactionType } from '../types/transaction-type.enum';
import { FinishingLevel } from '../types/finishing-level.enum';

interface ExtractedListing {
  city: string | null;
  district: string | null;
  compoundOrProject: string | null;
  propertyType: PropertyType | null;
  transactionType: TransactionType | null;
  askingPrice: number | null;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  finishingLevel: FinishingLevel | null;
  furnished: boolean | null;
  deliveryStatus: string | null;
  floor: number | null;
  confidence: number;
}

@Injectable()
export class ListingExtractorService {
  private readonly logger = new Logger(ListingExtractorService.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: ILLMProvider,
    @InjectRepository(MarketObservation)
    private readonly observationRepo: Repository<MarketObservation>,
    @InjectRepository(LocationDimension)
    private readonly locationRepo: Repository<LocationDimension>,
  ) {}

  async extractAndPersist(postId: string, postContent: string, postUrl: string): Promise<MarketObservation | null> {
    const extracted = await this.extract(postContent);

    if (!extracted) return null;

    if (extracted.confidence < 50) {
      this.logger.debug(`Skipping post ${postId} — low confidence: ${extracted.confidence}`);
      return null;
    }

    if (!extracted.askingPrice && !extracted.areaSqm) {
      this.logger.debug(`Skipping post ${postId} — no price or area extracted`);
      return null;
    }

    const location = extracted.district
      ? await this.findOrCreateLocation({
          ...extracted,
          district: extracted.district,
        })
      : null;

    const observationData: DeepPartial<MarketObservation> = {
      postId,
      locationId: location?.id ?? null,
      propertyType: extracted.propertyType,
      transactionType: extracted.transactionType,
      askingPrice: extracted.askingPrice,
      areaSqm: extracted.areaSqm,
      bedrooms: extracted.bedrooms,
      bathrooms: extracted.bathrooms,
      finishingLevel: extracted.finishingLevel,
      furnished: extracted.furnished,
      deliveryStatus: extracted.deliveryStatus,
      floor: extracted.floor,
      extractorConfidence: extracted.confidence,
      rawPayload: { content: postContent, url: postUrl },
      observedAt: new Date(),
    };

    const observation = this.observationRepo.create(observationData);

    return this.observationRepo.save(observation);
  }

  private async extract(postContent: string): Promise<ExtractedListing | null> {
    const prompt = `You are a real estate data extractor for Egyptian property listings. Extract structured listing data from the following Facebook post content.

Post content: "${postContent}"

Extract the following fields if present. For location, use the most specific geographic info available (compound/project name, district, city).

Property types: apartment, villa, townhouse, duplex, studio, office, shop, land, warehouse
Transaction types: sale, rent
Finishing levels: core_shell, semi_finished, fully_finished, furnished, super_lux

Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "city": "string or null",
  "district": "string or null",
  "compoundOrProject": "string or null",
  "propertyType": "enum value or null",
  "transactionType": "enum value or null",
  "askingPrice": "number in EGP or null",
  "areaSqm": "number or null",
  "bedrooms": "number or null",
  "bathrooms": "number or null",
  "finishingLevel": "enum value or null",
  "furnished": "boolean or null",
  "deliveryStatus": "string or null",
  "floor": "number or null",
  "confidence": "0-100 integer reflecting how complete and clear the listing data is"
}

If the post is not a property listing at all, return: {"confidence": 0}`;

    const text = await this.llmProvider.complete(prompt);
    if (!text) return null;

    const clean = text.replace(/```json|```/g, '').trim();

    try {
      // check parsed object has all required keys with correct data types
      const parsed = JSON.parse(clean) as ExtractedListing;
      return parsed;
    } catch {
      this.logger.error('Failed to parse listing extraction response:', clean);
      return null;
    }
  }

  private async findOrCreateLocation(
    extracted: ExtractedListing & { district: string },
  ): Promise<LocationDimension> {
    const normalizedDistrict = this.normalize(extracted.district);
    const normalizedCompound = extracted.compoundOrProject
      ? this.normalize(extracted.compoundOrProject)
      : null;

    const existing = await this.locationRepo.findOne({
      where: normalizedCompound
        ? { normalizedDistrict, normalizedCompound }
        : { normalizedDistrict },
    });

    if (existing) return existing;

    const locationData: DeepPartial<LocationDimension> = {
      city: extracted.city ?? '',
      district: extracted.district,
      compoundOrProject: extracted.compoundOrProject ?? null,
      normalizedCity: this.normalize(extracted.city ?? ''),
      normalizedDistrict,
      normalizedCompound,
      aliases: [],
    };

    const location = this.locationRepo.create(locationData);

    return this.locationRepo.save(location);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\u0600-\u06FF]/g, '');
  }
}
