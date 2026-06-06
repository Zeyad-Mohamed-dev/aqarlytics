import { IsString, IsUrl, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostDto {
    @IsNotEmpty()
    @IsString()
    @IsUrl({}, { message: 'url must be a valid URL' })
    @Transform(({ value }) => value?.trim())
    url: string;
}