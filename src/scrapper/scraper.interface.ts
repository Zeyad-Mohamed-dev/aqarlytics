export abstract class Scraper<T = any> {
  abstract scrape(...args: any[]): Promise<T>;
}
