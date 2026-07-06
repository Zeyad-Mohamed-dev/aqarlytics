import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { FacebookComment } from 'src/scrapper/types/FacebookComment';
import { REDIS_CLIENT } from './constants/redis.constants';

@Injectable()
export class RedisService {
  private static readonly COMMENT_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  buildTrackerCommentsKey(postIdOrUrl: string, trackerId: string): string {
    return `post:${postIdOrUrl}:tracker:${trackerId}:comments`;
  }

  async filterNewCommentsForTracker(
    postIdOrUrl: string,
    trackerId: string,
    comments: FacebookComment[],
  ): Promise<FacebookComment[]> {
    if (comments.length === 0) return [];

    const trackerKey = this.buildTrackerCommentsKey(postIdOrUrl, trackerId);
    const pipeline = this.redis.pipeline();

    comments.forEach(comment => {
      pipeline.sadd(trackerKey, comment.id);
    });
    pipeline.expire(trackerKey, RedisService.COMMENT_CACHE_TTL_SECONDS);

    const results = (await pipeline.exec()) ?? [];
    const newComments: FacebookComment[] = [];

    comments.forEach((comment, index) => {
      const entry = results[index];
      if (!entry) return;
      const [err, result] = entry;
      if (!err && result === 1) {
        newComments.push(comment);
      }
    });

    return newComments;
  }

  async delete(key: string): Promise<number> {
    return this.redis.del(key);
  }
}
