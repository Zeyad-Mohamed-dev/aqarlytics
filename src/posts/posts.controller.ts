import { Body, Controller, Delete, Get, Post, Req, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    public async getPosts(@Request() req) {
        const user = req.user;
        return this.postsService.findByTracker(user.id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    public async createPost(@Request() req, @Body() postUrl: string) {
        const user = req.user;
        return this.postsService.create(postUrl, user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    public async removeTracker(@Request() req) {
        const user = req.user;
        const id = req.params.id;
        const removeTrackerDto = { postId: id };
        return this.postsService.removeTracker(removeTrackerDto.postId, user.id);
    }

}
