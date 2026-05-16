import { ScrapperService } from './scrapper.service';

describe('ScrapperService', () => {
  let service: ScrapperService;

  beforeAll(async () => {
    service = new ScrapperService();
    await service.onModuleInit();
  });

  afterAll(async () => {
    await (service as any).browser.close();
  });

  // ✅ Test 1: print facebook login page content
  it('should print page content', async () => {
    const page = await (service as any).browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto('https://www.facebook.com/login', {
      waitUntil: 'networkidle2',
    });

    const html = await page.content();

    console.log('=== URL ===', page.url());

    // Print all input fields found on the page
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
      }))
    );
    console.log('=== INPUTS FOUND ===', JSON.stringify(inputs, null, 2));

    // Print all buttons found on the page
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

  // ✅ Test 2: basic scrape
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should login to facebook', async () => {
    const page = await (service as any).login(
      'ziadmohomar123@gmail.com',  // ← replace
      '1m2a3n456789',          // ← replace
    );

    const url = page.url();
    console.log('=== AFTER LOGIN URL ===', url);

    // Print what's on the page after login
    const title = await page.title();
    console.log('=== PAGE TITLE ===', title);

    expect(url).not.toContain('login');
    expect(url).not.toContain('checkpoint');

  }, 30000);

  // ✅ NEW: test scraping post comments
  it('should scrape post comments', async () => {
    const result = await service.scrapePostComments(
      'https://www.facebook.com/share/p/1Dy3rbx25y/',
      'ziadmohomar123@gmail.com',  // ← replace
      '1m2a3n456789',          // ← replace
    );

    console.log('=== POST CONTENT ===', result.postContent);
    console.log('=== COMMENTS ===', JSON.stringify(result.comments, null, 2));

    expect(result).toBeDefined();
    expect(Array.isArray(result.comments)).toBe(true);
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.comments[0].authorUrl).toContain('facebook.com');

  }, 600000);
});