import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListingExtractorService } from '../ListingExtractorService';
import { MarketObservation } from 'src/analytics/entities/market-observation';
import { LocationDimension } from 'src/analytics/entities/location-dimension.entity';
import { type ILLMProvider, LLM_PROVIDER } from 'src/analyzer/providers/llm-provider.interface';
import { Post as TrackedPost } from 'src/posts/post.entity';
import { User } from 'src/users/user.entity';
import { UserRole } from 'src/users/user-role.enum';
import { PropertyType } from 'src/analytics/types/property-type.enum';
import { TransactionType } from 'src/analytics/types/transaction-type.enum';
import { FinishingLevel } from 'src/analytics/types/finishing-level.enum';

let seedCounter = 0;

describe('ListingExtractorService (integration)', () => {
  let testingModule: TestingModule;
  let service: ListingExtractorService;
  let llmProvider: jest.Mocked<ILLMProvider>;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let postRepo: Repository<TrackedPost>;
  let observationRepo: Repository<MarketObservation>;
  let locationRepo: Repository<LocationDimension>;

  beforeAll(async () => {
    llmProvider = {
      complete: jest.fn(),
    };

    testingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: Number(process.env.DATABASE_PORT || 5432),
          username: process.env.DATABASE_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'password',
          database: process.env.DATABASE_NAME || 'aqarlytics',
          entities: [User, TrackedPost, MarketObservation, LocationDimension],
          synchronize: true,
          retryAttempts: 0,
          retryDelay: 0,
        }),
        TypeOrmModule.forFeature([User, TrackedPost, MarketObservation, LocationDimension]),
      ],
      providers: [
        ListingExtractorService,
        { provide: LLM_PROVIDER, useValue: llmProvider },
      ],
    }).compile();

    service = testingModule.get(ListingExtractorService);
    dataSource = testingModule.get(DataSource);
    userRepo = testingModule.get(getRepositoryToken(User));
    postRepo = testingModule.get(getRepositoryToken(TrackedPost));
    observationRepo = testingModule.get(getRepositoryToken(MarketObservation));
    locationRepo = testingModule.get(getRepositoryToken(LocationDimension));
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (dataSource?.isInitialized) {
      await dataSource.query(`
        TRUNCATE TABLE
          "market_observations",
          "post_trackers",
          "posts",
          "users",
          "location_dimensions"
        RESTART IDENTITY CASCADE
      `);
    }
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  async function seedTrackedPost(url: string): Promise<TrackedPost> {
    seedCounter += 1;

    const user = await userRepo.save(
      userRepo.create({
        email: `listing-extractor-test-${seedCounter}@example.com`,
        password: 'hashed-password',
        role: UserRole.SELLER,
        firstName: 'Listing',
        lastName: 'Tester',
        phoneNumber: 1000000000 + seedCounter,
        isActive: true,
      }),
    );

    return postRepo.save(
      postRepo.create({
        url,
        trackers: [user],
        comments: [],
      }),
    );
  }

  it('persists a market observation and creates a normalized location for a full listing', async () => {
    llmProvider.complete.mockResolvedValueOnce(
      JSON.stringify({
        city: 'Cairo',
        district: 'New Cairo',
        compoundOrProject: 'Mountain View',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.SALE,
        askingPrice: 4500000,
        areaSqm: 180,
        bedrooms: 3,
        bathrooms: 2,
        finishingLevel: FinishingLevel.SUPER_LUX,
        furnished: false,
        deliveryStatus: 'ready_to_move',
        floor: 5,
        confidence: 88,
      }),
    );

    const post = await seedTrackedPost('https://facebook.com/post/1');

    const result = await service.extractAndPersist(
      post.id,
      'apartment listing content',
      post.url,
    );

    expect(result).not.toBeNull();
    expect(result?.postId).toBe(post.id);
    expect(Number(result?.askingPrice)).toBe(4500000);
    expect(Number(result?.areaSqm)).toBe(180);
    expect(result?.locationId).toBeTruthy();
    expect(result?.rawPayload).toEqual({
      content: 'apartment listing content',
      url: post.url,
    });

    const savedObservation = await observationRepo.findOne({
      where: { id: result!.id },
    });
    expect(savedObservation).not.toBeNull();

    const savedLocation = await locationRepo.findOne({
      where: { id: result!.locationId! },
    });
    expect(savedLocation).not.toBeNull();
    expect(savedLocation?.normalizedDistrict).toBe('new_cairo');
    expect(savedLocation?.normalizedCompound).toBe('mountain_view');
  });

  it('returns null and does not persist when extraction has no price and no area', async () => {
    llmProvider.complete.mockResolvedValueOnce(
      JSON.stringify({
        city: 'Cairo',
        district: 'Nasr City',
        compoundOrProject: null,
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.SALE,
        askingPrice: null,
        areaSqm: null,
        bedrooms: null,
        bathrooms: null,
        finishingLevel: null,
        furnished: null,
        deliveryStatus: null,
        floor: null,
        confidence: 74,
      }),
    );

    const post = await seedTrackedPost('https://facebook.com/post/2');

    const result = await service.extractAndPersist(
      post.id,
      'vague listing content',
      post.url,
    );

    expect(result).toBeNull();
    expect(await observationRepo.count()).toBe(0);
    expect(await locationRepo.count()).toBe(0);
  });

  it('reuses the same location row for repeated listings in the same district and compound', async () => {
    llmProvider.complete.mockResolvedValue(
      JSON.stringify({
        city: 'Giza',
        district: 'Sheikh Zayed',
        compoundOrProject: 'Beverly Hills',
        propertyType: PropertyType.VILLA,
        transactionType: TransactionType.SALE,
        askingPrice: 8000000,
        areaSqm: 350,
        bedrooms: 4,
        bathrooms: 4,
        finishingLevel: FinishingLevel.FULLY_FINISHED,
        furnished: false,
        deliveryStatus: 'ready_to_move',
        floor: null,
        confidence: 91,
      }),
    );

    const firstPost = await seedTrackedPost('https://facebook.com/post/3');
    const secondPost = await seedTrackedPost('https://facebook.com/post/4');

    const first = await service.extractAndPersist(
      firstPost.id,
      'villa listing content one',
      firstPost.url,
    );
    const second = await service.extractAndPersist(
      secondPost.id,
      'villa listing content two',
      secondPost.url,
    );

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.locationId).toBe(second?.locationId);
    expect(await locationRepo.count()).toBe(1);
    expect(await observationRepo.count()).toBe(2);
  });
});
