import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { User } from 'src/users/user.entity';

@Module({
  providers: [PostsService],
  controllers: [PostsController],
  imports: [TypeOrmModule.forFeature([Post, User])],
  exports: [PostsService]
})
export class PostsModule {}
