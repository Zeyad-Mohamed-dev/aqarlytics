import { Module } from '@nestjs/common';
import { ScrapperService } from './scrapper.service';
import { FacebookScraper } from './facebook.scraper';
import { PostsModule } from 'src/posts/posts.module';

@Module({
  providers: [ScrapperService, FacebookScraper],
  imports: [PostsModule]
})
export class ScrapperModule {}
