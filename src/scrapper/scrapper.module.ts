import { Module } from '@nestjs/common';
import { ScrapperService } from './scrapper.service';
import { FacebookScraper } from './facebook.scraper';
import { PostsModule } from 'src/posts/posts.module';
import { AnalyzerModule } from 'src/analyzer/analyzer.module';

@Module({
  providers: [ScrapperService, FacebookScraper],
  imports: [PostsModule],
  exports: [ScrapperService, FacebookScraper],

})
export class ScrapperModule {}
