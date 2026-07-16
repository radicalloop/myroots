import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../entities/User';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, verifyPassword, sanitizeUser } from './helpers/auth.helper';
import { SignupDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase(), deletedAt: IsNull() },
    });

    if (existing) {
      throw new ApiError(409, 'Email already exists');
    }

    const saltRounds = Number(
      this.configService.get('BCRYPT_SALT_ROUNDS') ?? 10,
    );
    const password = await hashPassword(dto.password, saltRounds);
    const user = this.userRepo.create({
      email: dto.email.toLowerCase(),
      password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    const saved = await this.userRepo.save(user);
    const accessToken = this.signAccessToken(saved.id, saved.email);

    return {
      user: sanitizeUser(saved),
      accessToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase(), deletedAt: IsNull() },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const valid = await verifyPassword(dto.password, user.password);
    if (!valid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const accessToken = this.signAccessToken(user.id, user.email);

    return {
      user: sanitizeUser(user),
      accessToken,
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.firstName = dto.firstName;
    user.lastName = dto.lastName;

    const saved = await this.userRepo.save(user);
    return sanitizeUser(saved);
  }

  private signAccessToken(userId: string, email: string): string {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
    return this.jwtService.sign(
      { sub: userId, email },
      { expiresIn },
    );
  }
}
