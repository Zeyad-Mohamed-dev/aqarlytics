import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto, AuthResponseDto } from './dtos/auth.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}


async login(loginDto: LoginDto): Promise<AuthResponseDto> {
  const user = await this.usersService.findByEmail(loginDto.email);
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  const payload = { sub: user.id, email: user.email };

  return {
    accessToken: this.jwtService.sign(payload),
    user: {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    },
  };
}

async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
  const existingUser = await this.usersService.findByEmail(registerDto.email);
  if (existingUser) {
    throw new UnauthorizedException('Email already in use');
  }

  const newUser = await this.usersService.saveUser({
    email: registerDto.email,
    password: registerDto.password,
    role: registerDto.role || UserRole.SELLER,
  } as any);

  const payload = { sub: newUser.id, email: newUser.email };

  return {
    accessToken: this.jwtService.sign(payload),
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
    },
  };
}
  async validateUser(id: string): Promise<any> {
    return this.usersService.findById(id);
  }
}
