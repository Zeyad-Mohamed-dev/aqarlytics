import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzerService } from './analyzer.service';
import { FacebookComment } from 'src/scrapper/types/FacebookComment';
import { LLM_PROVIDER } from './providers/llm-provider.interface';
import { GroqProvider } from './providers/GroqProvider';

const mockComments: FacebookComment[] = [
  {
    id: 'c1',
    author: 'Ahmed Mohamed',
    authorUrl: 'https://facebook.com/ahmed.mohamed',
    content: 'كام سعر المتر؟ وفيه تقسيط؟',
    timestamp: '2h',
    replies: [],
  },
  {id: 'c1',
    author: 'Sara Ali',
    authorUrl: 'https://facebook.com/sara.ali',
    content: 'ماشاء الله 😍',
    timestamp: '1h',
    replies: [],
  },
  {
    id: 'c1',
    author: 'Mohamed Hassan',
    authorUrl: 'https://facebook.com/mohamed.hassan',
    content: 'عايز أعمل معاينة امتى ممكن؟ رقمك كام؟',
    timestamp: '30m',
    replies: [],
  },
  {
    id: 'c1',
    author: 'Nour Khaled',
    authorUrl: 'https://facebook.com/nour.khaled',
    content: 'تم التواصل مع حضرتك 👍',
    timestamp: '20m',
    replies: [],
  },
  {
    id: 'c1',
    author: 'Omar Samy',
    authorUrl: 'https://facebook.com/omar.samy',
    content: 'الشقة دي فين بالظبط؟ وفيه اسانسير؟',
    timestamp: '15m',
    replies: [],
  },
  // ── Spam ────────────────────────────────────────────────────────────
  {
    id: 'c1',
    author: 'Real Estate Ads',
    authorUrl: 'https://facebook.com/realestate.ads',
    content: 'عندنا شقق أحسن بأسعار أرخص! تواصل معانا دلوقتي 01xxxxxxxx',
    timestamp: '10m',
    replies: [],
  },
  {
    id: 'c1',
    author: 'Youssef Broker',
    authorUrl: 'https://facebook.com/youssef.broker',
    content: 'أنا وسيط عقاري معايا وحدات أفضل في نفس المنطقة، تواصل معايا',
    timestamp: '8m',
    replies: [],
  },
  // ── Generic reactions ───────────────────────────────────────────────
  {
    id: 'c1',
    author: 'Layla Hassan',
    authorUrl: 'https://facebook.com/layla.hassan',
    content: '❤️❤️❤️',
    timestamp: '7m',
    replies: [],
  },
  {
    id: 'c1',
    author: 'Karim Adel',
    authorUrl: 'https://facebook.com/karim.adel',
    content: 'ربنا يوفق الجميع 🙏',
    timestamp: '6m',
    replies: [],
  },
  // ── Tagging friends with no intent ──────────────────────────────────
  {
    id: 'c1',
    author: 'Mona Tarek',
    authorUrl: 'https://facebook.com/mona.tarek',
    content: 'يا @حسن شوف الشقة دي',
    timestamp: '5m',
    replies: [],
  },
  {
    id: 'c1',
    author: 'Hana Mostafa',
    authorUrl: 'https://facebook.com/hana.mostafa',
    content: '@سارة @ريم تعالوا شوفوا 😂',
    timestamp: '4m',
    replies: [],
  },
  // ── Irrelevant / off topic ───────────────────────────────────────────
  {
    id: 'c1',
    author: 'Ahmed Fawzy',
    authorUrl: 'https://facebook.com/ahmed.fawzy',
    content: 'الأسعار دي مش مناسبة خالص للناس العادية، غلاء فاحش',
    timestamp: '3m',
    replies: [],
  },
  {
    id: 'c1',
    author: 'Dina Ramzy',
    authorUrl: 'https://facebook.com/dina.ramzy',
    content: 'اللي عنده فلوس يشتري 😂 احنا بنحلم بإيجار',
    timestamp: '2m',
    replies: [],
  },
];
const mockPostContent =
  'شقة للبيع في التجمع الخامس 180 متر تشطيب سوبر لوكس بسعر 4,500,000 جنيه إمكانية التقسيط متاحة';

describe('AnalyzerService (integration)', () => {
  let service: AnalyzerService;

  beforeAll(async () => {
    // GEMINI_API_KEY must be set in your .env or environment
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set — cannot run integration tests');
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyzerService,
        {
          provide: LLM_PROVIDER,
          useClass: GroqProvider,
        },
      ],
    }).compile();

    service = module.get<AnalyzerService>(AnalyzerService);
  });

  it('should return an array', async () => {
    const result = await service.analyzeComments(mockPostContent, mockComments);
    expect(Array.isArray(result)).toBe(true);
  }, 15000);

  it('should return empty array for empty comments', async () => {
    const result = await service.analyzeComments(mockPostContent, []);
    expect(result).toEqual([]);
  });

  it('should only return comments with interestScore >= 60', async () => {
    const result = await service.analyzeComments(mockPostContent, mockComments);
    result.forEach(lead => {
      expect(lead.interestScore).toBeGreaterThanOrEqual(60);
    });
  }, 15000);

  it('should correctly identify interested comments and ignore generic ones', async () => {
    const result = await service.analyzeComments(mockPostContent, mockComments);

    const authors = result.map(r => r.author);

    // These are clearly interested — Gemini should catch them
    expect(authors).toContain('Ahmed Mohamed');   // asking about price & installment
    expect(authors).toContain('Mohamed Hassan');  // requesting viewing & contact
    expect(authors).toContain('Omar Samy');       // asking about location & elevator

    // These are not interested — Gemini should exclude them
    expect(authors).not.toContain('Sara Ali');    // just an emoji reaction
    expect(authors).not.toContain('Nour Khaled'); // vague acknowledgment
  }, 15000);

  it('should preserve original comment fields on each lead', async () => {
    const result = await service.analyzeComments(mockPostContent, mockComments);

    result.forEach(lead => {
      expect(lead).toHaveProperty('author');
      expect(lead).toHaveProperty('authorUrl');
      expect(lead).toHaveProperty('content');
      expect(lead).toHaveProperty('timestamp');
      expect(lead).toHaveProperty('replies');
      expect(lead).toHaveProperty('interestScore');
      expect(lead).toHaveProperty('reason');
    });
  }, 15000);

  it('should return a reason string for each lead', async () => {
    const result = await service.analyzeComments(mockPostContent, mockComments);
    console.log('=== ANALYZED LEADS ===', JSON.stringify(result, null, 2));

    result.forEach(lead => {
      expect(typeof lead.reason).toBe('string');
      expect(lead.reason.length).toBeGreaterThan(0);
    });
  }, 15000);
});