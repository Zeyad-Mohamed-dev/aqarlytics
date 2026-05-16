import { Injectable, OnModuleInit } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface FacebookComment {
  author: string;
  authorUrl: string;
  content: string;
  timestamp: string;
  replies: FacebookReply[];
}

export interface FacebookReply {
  author: string;
  authorUrl: string;
  content: string;
}

@Injectable()
export class ScrapperService implements OnModuleInit {
  private browser: Browser;
  private sessionPage: Page | null = null; // ✅ reuse session

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async login(email: string, password: string): Promise<Page> {
    // ✅ Reuse existing session if already logged in
    if (this.sessionPage && !this.sessionPage.isClosed()) {
      console.log('=== Reusing existing session ===');
      return this.sessionPage;
    }

    const page = await this.browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto('https://www.facebook.com/login', {
      waitUntil: 'networkidle2',
    });

    const emailInput = await page.$('input[name="email"]');
    if (!emailInput) {
      await page.close();
      throw new Error('Login page did not load correctly — email input not found');
    }

    await page.type('input[name="email"]', email, { delay: 50 });
    await page.type('input[name="pass"]', password, { delay: 50 });
    await page.keyboard.press('Enter');

    await Promise.race([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.waitForSelector('[data-testid="royal_login_error"], #error_box, [role="alert"]', { timeout: 15000 }),
    ]).catch(async () => {
      await page.close();
      throw new Error('Login timed out — no navigation or error detected');
    });

    const currentUrl = page.url();
    console.log('=== After login URL ===', currentUrl);

    const errorMessage = await page.evaluate(() => {
      const errorEl =
        document.querySelector('[data-testid="royal_login_error"]') ||
        document.querySelector('#error_box') ||
        document.querySelector('[role="alert"]') ||
        document.querySelector('._9ay7');
      return errorEl?.textContent?.trim() || null;
    });

    if (errorMessage) {
      await page.close();
      throw new Error(`Facebook login error: ${errorMessage}`);
    }

    if (currentUrl.includes('checkpoint')) {
      await page.close();
      throw new Error('Checkpoint triggered — 2FA or suspicious login detected');
    }

    if (currentUrl.includes('/login')) {
      await page.close();
      throw new Error('Login failed — still on login page, check your credentials');
    }

    const isLoggedIn = await page.evaluate(() => {
      return !!(
        document.querySelector('[aria-label="Facebook"]') ||
        document.querySelector('[data-pagelet="LeftRail"]') ||
        document.querySelector('[role="banner"]')
      );
    });

    if (!isLoggedIn) {
      await page.close();
      throw new Error('Login failed — could not verify logged-in state');
    }

    console.log('=== Login successful ===');
    this.sessionPage = page; // ✅ save session
    return page;
  }

  async scrapePostComments(
    postUrl: string,
    email: string,
    password: string,
  ): Promise<{ postContent: string; comments: FacebookComment[] }> {
    // ✅ Get session, copy cookies to a fresh page
    const sessionPage = await this.login(email, password);
    const cookies = await sessionPage.cookies();
    const page = await this.browser.newPage();
    await page.setCookie(...cookies);

    try {
      await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('[role="article"]', { timeout: 10000 });

      await this.showAllComments(page);
      await this.expandSeeMore(page);
      await this.loadMoreComments(page);
      await this.expandReplies(page);

      const result = await page.evaluate(() => {
        const postArticle = document.querySelector('[role="article"]');
        const postContent =
          postArticle?.querySelector('[data-ad-comet-preview="message"], [data-ad-preview="message"]')
            ?.textContent?.trim() || '';

        const commentEls = Array.from(
          document.querySelectorAll('[role="article"] [role="article"]')
        );

        const comments = commentEls.map(el => {
          const authorLink = el.querySelector('a[href*="facebook.com"], a[href^="/"]') as HTMLAnchorElement;
          const author = authorLink?.textContent?.trim() || 'Unknown';
          const authorUrl = (authorLink?.href || '').split('?')[0];
          const content = el.querySelector('[dir="auto"] span')?.textContent?.trim() || '';
          const timeEl = el.querySelector('a[href*="?comment_id"] span, abbr');
          const timestamp = timeEl?.textContent?.trim() || '';
          const replyEls = Array.from(el.querySelectorAll('[role="article"]'));
          const replies = replyEls.map(reply => {
            const replyAuthorLink = reply.querySelector('a[href*="facebook.com"], a[href^="/"]') as HTMLAnchorElement;
            return {
              author: replyAuthorLink?.textContent?.trim() || 'Unknown',
              authorUrl: (replyAuthorLink?.href || '').split('?')[0],
              content: reply.querySelector('[dir="auto"] span')?.textContent?.trim() || '',
            };
          });
          return { author, authorUrl, content, timestamp, replies };
        }).filter(c => c.content.length > 0);

        return { postContent, comments };
      });

      return result;
    } finally {
      await page.close(); // ✅ only close scraping page, keep session alive
    }
  }

  private async showAllComments(page: Page) {
    try {
      const filterBtn = await page.$('[aria-label="Comment filter options"]');
      if (filterBtn) {
        await filterBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const allCommentsOption = await page.$('[role="menuitem"]::-p-text(All comments)');
        if (allCommentsOption) {
          await allCommentsOption.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch { }
  }

  private async loadMoreComments(page: Page, maxClicks = 5) {
    for (let i = 0; i < maxClicks; i++) {
      try {
        const moreBtn = await page.$('[role="button"]::-p-text(View more comments)');
        if (!moreBtn) break;
        await moreBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch {
        break;
      }
    }
  }

  private async expandSeeMore(page: Page) {
    try {
      const buttons = await page.$$('[role="button"]::-p-text(See more)');
      for (const btn of buttons) {
        await btn.click().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch { }
  }

  private async expandReplies(page: Page, maxClicks = 10) {
    for (let i = 0; i < maxClicks; i++) {
      try {
        const replyBtn = await page.$('[role="button"]::-p-text(View replies)');
        if (!replyBtn) break;
        await replyBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch {
        break;
      }
    }
  }

  async scrape(url: string): Promise<string> {
    const page = await this.browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 ...');
      await page.goto(url, { waitUntil: 'networkidle2' });
      return await page.content();
    } finally {
      await page.close();
    }
  }
}