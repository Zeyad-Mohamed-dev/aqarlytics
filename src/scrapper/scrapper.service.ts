import { Injectable, OnModuleInit } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { FacebookScraper } from './facebook.scraper';

@Injectable()
export class ScrapperService implements OnModuleInit {
  private browser: Browser;

  constructor(private readonly facebookScraper: FacebookScraper) {}

  async onModuleInit() {
    // this.browser = await puppeteer.launch({
    //   headless: false,
    //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // });
  }

  async scrapeFacebook(postUrl: string, email: string, password: string) {
    return this.facebookScraper.scrape(postUrl, email, password);
  }

  
}