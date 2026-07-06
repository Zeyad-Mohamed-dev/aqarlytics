import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { UserRole } from '../../users/user-role.enum';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsString()
  @Matches(/^01[0125][0-9]{8}$/, { message: 'Phone number must be a valid Egyptian phone number (e.g. 01012345678)' })
  phoneNumber!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken?: string;
  user!: {
    id: string;
    email: string;
    role: UserRole;
  };
}
