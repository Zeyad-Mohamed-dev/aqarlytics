import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { User } from 'src/users/user.entity';
import { SocialMediaPlatform } from './types/social-media-platform';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async findAll(): Promise<Post[]> {
    return this.postRepository.find({ relations: ['trackers'] });
  }

  async findByPlatform(platform: SocialMediaPlatform): Promise<Post[]> {
    return this.postRepository.find({ where: { platform }, relations: ['trackers'] });
  }

  async findById(id: string): Promise<Post> {
  const post = await this.postRepository.findOne({ where: { id }, relations: ['trackers'] });
  if (!post) throw new NotFoundException(`Post ${id} not found`);
  return post;
}

  async findByTracker(userId: string): Promise<Post[]> {
    return this.postRepository
      .createQueryBuilder('post')
      .innerJoin('post.trackers', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }

  async findByUrl(url: string): Promise<Post | null> {
    return this.postRepository.findOne({ where: { url } });
  }

  async create(url: string, tracker: User): Promise<Post> {
    const existingPost = await this.findByUrl(url);
    if (existingPost) {
      return this.addTracker(existingPost.id, tracker);
    }
    const post = this.postRepository.create({
      url,
      trackers: [tracker],
    });
    return this.postRepository.save(post);
  }

  async addTracker(postId: string, user: User): Promise<Post> {
    const post = await this.findById(postId);
    const alreadyTracking = post.trackers.some(t => t.id === user.id);
    if (!alreadyTracking) {
      post.trackers.push(user);
      await this.postRepository.save(post);
    }
    return post;
  }

  async removeTracker(postId: string, userId: string): Promise<Post> {
    const post = await this.findById(postId);
    post.trackers = post.trackers.filter(t => t.id !== userId);
    return this.postRepository.save(post);
  }
}