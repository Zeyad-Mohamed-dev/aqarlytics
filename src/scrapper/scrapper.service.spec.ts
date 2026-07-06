import { ScrapperService } from './scrapper.service';
import { FacebookScraper } from './facebook.scraper';

describe('ScrapperService', () => {
  let service: ScrapperService;
  let facebookScraper: FacebookScraper;

  beforeAll(async () => {
    facebookScraper = new FacebookScraper();
    await facebookScraper.onModuleInit();
    service = new ScrapperService(facebookScraper);
    await service.onModuleInit();
  });

  afterAll(async () => {
    await facebookScraper.onModuleDestroy();
  });

  // Test 1: print facebook login page content
  it('should print page content', async () => {
    const page = await (facebookScraper as any).browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto('https://www.facebook.com/login', {
      waitUntil: 'domcontentloaded',
    });

    console.log('=== URL ===', page.url());

    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
      }))
    );
    console.log('=== INPUTS FOUND ===', JSON.stringify(inputs, null, 2));

    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText,
        type: b.type,
        name: b.name,
      }))
    );
    console.log('=== BUTTONS FOUND ===', JSON.stringify(buttons, null, 2));

    await page.close();
  }, 30000);

  // Test 2: service is defined
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test 3: login sets session cookies
  it('should login to facebook', async () => {
    // login() returns void and closes the page internally —
    // we verify it worked by checking sessionCookies were populated
    await (facebookScraper as any).login(
      'ziadmohomar123@gmail.com',
      '1m2a3n456789',
    );

    const cookies = (facebookScraper as any).sessionCookies;
    console.log('=== SESSION COOKIES SET ===', cookies?.length ?? 0, 'cookies');

    expect(cookies).not.toBeNull();
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.length).toBeGreaterThan(0);

    // Verify it's actually logged in by opening a page with the cookies
    const page = await (facebookScraper as any).browser.newPage();
    await page.setCookie(...cookies);
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });

    const url = page.url();
    console.log('=== AFTER LOGIN URL ===', url);

    const title = await page.title();
    console.log('=== PAGE TITLE ===', title);

    await page.close();

    expect(url).not.toContain('login');
    expect(url).not.toContain('checkpoint');
  }, 60000);

  // Test 4: scrape post comments
  it('should scrape post comments', async () => {
    const result = await service.scrapeFacebook(
      'https://www.facebook.com/share/p/17mXEjJd3k/',
      'ziadmohomar123@gmail.com',
      '1m2a3n456789',
    );

    console.log('=== POST CONTENT ===', result.postContent);
    console.log('=== POST URL ===', result.postUrl);
    console.log('=== COMMENTS ===', JSON.stringify(result.comments, null, 2));

    expect(result).toBeDefined();
    expect(Array.isArray(result.comments)).toBe(true);
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.comments[0].authorUrl).toContain('facebook.com');
  }, 600000);
});