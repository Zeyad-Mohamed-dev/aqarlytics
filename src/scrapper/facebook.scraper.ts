import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { Scraper } from './scraper.interface';
import { FacebookComment } from './types/FacebookComment';
import { randomUUID } from 'crypto';

@Injectable()
export class FacebookScraper
  extends Scraper<{ postContent: string; comments: FacebookComment[]; postUrl: string }>
  implements OnModuleInit, OnModuleDestroy
{
  private browser: Browser;
  private sessionCookies: any[] | null = null;
  private readonly cookiePath = path.resolve(process.cwd(), '.fb_session_cookies.json');

  private readonly seenCommentsByPost = new Map<string, Set<string>>();

  private async randomDelay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    if (fs.existsSync(this.cookiePath)) {
      try {
        const raw = fs.readFileSync(this.cookiePath, 'utf-8');
        this.sessionCookies = JSON.parse(raw);
        console.log('=== Loaded cookies from disk ===');
      } catch {
        this.sessionCookies = null;
      }
    }
  }

  async onModuleDestroy() {
    if (this.browser?.connected) {
      await this.browser.close();
    }
  }

  private async login(email: string, password: string): Promise<void> {
    if (this.sessionCookies) {
      console.log('=== Reusing existing session cookies ===');
      return;
    }

    const page = await this.browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    try {
      await page.goto('https://www.facebook.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await this.randomDelay(500, 1000);

      const emailInput = await page.$('input[name="email"]');
      if (!emailInput) throw new Error('Login page did not load — email input not found');

      for (const char of email) {
        await page.type('input[name="email"]', char, {
          delay: Math.floor(Math.random() * 60) + 30,
        });
      }

      await this.randomDelay(300, 600);

      for (const char of password) {
        await page.type('input[name="pass"]', char, {
          delay: Math.floor(Math.random() * 60) + 30,
        });
      }

      await this.randomDelay(300, 600);
      await page.keyboard.press('Enter');

      await page.waitForFunction(
        () => !window.location.href.includes('/login'),
        { timeout: 30000 }
      );

      await this.randomDelay(800, 1500);

      const currentUrl = page.url();
      if (currentUrl.includes('checkpoint')) {
        throw new Error('Checkpoint triggered — 2FA or suspicious login detected');
      }

      const errorMessage = await page.evaluate(() => {
        const el =
          document.querySelector('[data-testid="royal_login_error"]') ||
          document.querySelector('#error_box') ||
          document.querySelector('._9ay7');
        return el?.textContent?.trim() || null;
      });

      if (errorMessage) throw new Error(`Facebook login error: ${errorMessage}`);

      console.log('=== Login successful ===');
      this.sessionCookies = await page.cookies();
      fs.writeFileSync(this.cookiePath, JSON.stringify(this.sessionCookies), 'utf-8');
      console.log('=== Cookies saved to disk ===');
    } finally {
      await page.close();
    }
  }

  async scrape(
    postUrl: string,
    email: string,
    password: string,
    limit = 10,
  ): Promise<{ postContent: string; comments: FacebookComment[]; postUrl: string }> {
    if (!this.browser?.connected) {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    await this.login(email, password);

    if (!this.seenCommentsByPost.has(postUrl)) {
      this.seenCommentsByPost.set(postUrl, new Set<string>());
    }
    const seenKeys = this.seenCommentsByPost.get(postUrl)!;

    const page = await this.browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setCookie(...this.sessionCookies!);

    try {
      await this.randomDelay(200, 400);
      await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('[role="article"]', { timeout: 15000 });
      await this.randomDelay(800, 1200);

      if (limit <= 5) {
        await this.showAllComments(page);
        await this.randomDelay(400, 700);
        await this.expandSeeMore(page);
        await this.randomDelay(300, 500);
      } else {
        await this.showAllComments(page);
        await this.randomDelay(400, 700);
        await this.scrollToBottom(page);
        await this.randomDelay(300, 500);
        await this.expandSeeMore(page);
        await this.randomDelay(300, 500);
        await this.expandReplies(page);
        await this.randomDelay(300, 500);
      }

      // Extract data without IDs (browser context can't use Node.js crypto)
      const { postContent, comments: allComments } = await this.extractData(page);

      // Generate IDs in Node.js scope
      const commentsWithIds: FacebookComment[] = allComments.map(c => ({
        ...c,
        id: `${c.author}::${randomUUID()}`,
      }));

      const seenThisRun = new Set<string>();
      const uniqueThisRun = commentsWithIds.filter(c => {
        const key = `${c.author}::${c.content}`;
        if (seenThisRun.has(key)) return false;
        seenThisRun.add(key);
        return true;
      });

      const newComments: FacebookComment[] = [];
      for (const c of uniqueThisRun) {
        const key = `${c.author}::${c.content}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          newComments.push(c);
          if (newComments.length >= limit) break;
        }
      }

      console.log(
        `=== Scrape complete: ${newComments.length} new comments ` +
        `(${seenKeys.size} total seen for this post) ===`
      );

      return { postContent, comments: newComments, postUrl };
    } finally {
      if (!page.isClosed()) {
        await page.close();
      }
    }
  }

  private async showAllComments(page: Page) {
    try {
      const filterBtn = await page.$('[aria-label="Comment filter options"]');
      if (!filterBtn) return;

      await this.randomDelay(200, 400);
      await filterBtn.click();
      await this.randomDelay(400, 700);

      const items = await page.$$('[role="menuitem"]');
      if (items.length > 0) {
        await this.randomDelay(150, 300);
        await items[0].click();
        await this.randomDelay(600, 1000);
      }
    } catch {
      // Non-fatal
    }
  }

  private async scrollToBottom(page: Page, rounds = 8) {
    for (let i = 0; i < rounds; i++) {
      const prevHeight = await page.evaluate(() => document.body.scrollHeight);

      await page.evaluate(() => {
        const scrollAmount = Math.floor(Math.random() * 400) + 600;
        window.scrollBy(0, scrollAmount);
      });

      await this.randomDelay(600, 1000);

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      const scrollY = await page.evaluate(() => window.scrollY);
      const innerHeight = await page.evaluate(() => window.innerHeight);

      if (newHeight === prevHeight && scrollY + innerHeight >= newHeight - 50) break;
    }

    await this.randomDelay(300, 500);
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  private async expandSeeMore(page: Page) {
    let found = true;
    while (found) {
      found = false;
      const buttons = await page.$$('[role="button"]');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent?.trim() || '');
        if (text === 'See more') {
          await this.randomDelay(150, 300);
          await btn.click().catch(() => {});
          await this.randomDelay(150, 300);
          found = true;
          break;
        }
      }
    }
  }

  private async expandReplies(page: Page, maxRounds = 15) {
    for (let i = 0; i < maxRounds; i++) {
      const buttons = await page.$$('[role="button"]');
      let clicked = false;
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent?.trim() || '');
        if (text.toLowerCase().includes('repl')) {
          await this.randomDelay(200, 400);
          await btn.click().catch(() => {});
          await this.randomDelay(400, 700);
          clicked = true;
          break;
        }
      }
      if (!clicked) break;
    }
  }

  private async extractData(
    page: Page
  ): Promise<{ postContent: string; comments: Omit<FacebookComment, 'id'>[] }> {
    return page.evaluate(() => {

      const getDepth = (el: Element): number => {
        let d = 0, p = el.parentElement;
        while (p) { if (p.getAttribute('role') === 'article') d++; p = p.parentElement; }
        return d;
      };

      const allArticles = Array.from(document.querySelectorAll('[role="article"]'));
      const postArticle = allArticles[0];

      let postContent =
        postArticle?.querySelector('[data-ad-comet-preview="message"], [data-ad-preview="message"]')
          ?.textContent?.trim() ?? '';

      if (!postContent && postArticle) {
        const dirAutos = Array.from(postArticle.querySelectorAll('[dir="auto"]'));
        for (const el of dirAutos) {
          let parent = el.parentElement;
          let insideComment = false;
          while (parent && parent !== postArticle) {
            if (parent.getAttribute('role') === 'article') {
              insideComment = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (insideComment) continue;
          const text = el.textContent?.trim() || '';
          if (text.length > 10) {
            postContent = text;
            break;
          }
        }
      }

      const isDateText = (t: string) => /^\d+[smhdwy]$|^just now$/i.test(t);

      const parseArticle = (el: Element) => {
        const allLinks = Array.from(
          el.querySelectorAll('a[href*="facebook.com"], a[href^="/"]')
        ) as HTMLAnchorElement[];

        const authorLink = allLinks.find(a => {
          const text = a.textContent?.trim() || '';
          const href = a.href || '';
          return (
            text.length > 0 &&
            !isDateText(text) &&
            !href.includes('/posts/') &&
            !href.includes('/photo') &&
            !href.includes('/video')
          );
        });

        const author = authorLink?.textContent?.trim() || 'Unknown';
        const authorUrl = authorLink ? authorLink.href.split('?')[0] : '';

        const dirAutos = Array.from(el.querySelectorAll('[dir="auto"]'));
        let content = '';
        for (const d of dirAutos) {
          const t = d.textContent?.trim() || '';
          if (!t || t === author) continue;
          content = t;
          break;
        }

        const timestampLink = allLinks.find(a => isDateText(a.textContent?.trim() || ''));
        const timestamp = timestampLink?.textContent?.trim() || '';

        const mentionLink = (Array.from(
          el.querySelectorAll('[dir="auto"] a[href*="facebook.com"], [dir="auto"] a[href^="/"]')
        ) as HTMLAnchorElement[]).find(a => {
          const href = a.href || '';
          const text = a.textContent?.trim() || '';
          return (
            text.length > 0 &&
            !isDateText(text) &&
            !href.includes('/posts/') &&
            !href.includes('/photo') &&
            !href.includes('/video')
          );
        });

        const mentionedAuthor = mentionLink?.textContent?.trim() || '';
        const isMention = mentionedAuthor.length > 0 && mentionedAuthor !== author;

        let cleanContent = content;
        if (isMention && cleanContent.startsWith(mentionedAuthor)) {
          cleanContent = cleanContent.slice(mentionedAuthor.length).trim();
        }

        return {
          author,
          authorUrl,
          content: cleanContent || content,
          timestamp,
          mentionedAuthor,
          isMention,
        };
      };

      const depth1 = allArticles.filter(el => getDepth(el) === 1);

      const comments: {
        author: string;
        authorUrl: string;
        content: string;
        timestamp: string;
        replies: { author: string; authorUrl: string; content: string }[];
      }[] = [];

      for (const el of depth1) {
        const parsed = parseArticle(el);
        if (!parsed.content) continue;

        if (!parsed.isMention) {
          comments.push({
            author: parsed.author,
            authorUrl: parsed.authorUrl,
            content: parsed.content,
            timestamp: parsed.timestamp,
            replies: [],
          });
        } else {
          const target =
            [...comments].reverse().find(c => c.author === parsed.mentionedAuthor) ||
            comments[comments.length - 1];

          if (target) {
            target.replies.push({
              author: parsed.author,
              authorUrl: parsed.authorUrl,
              content: parsed.content,
            });
          }
        }
      }

      return { postContent, comments };
    });
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}