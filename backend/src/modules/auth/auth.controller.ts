import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const result = await this.authService.signup(dto);
    return ApiResponse.created(result, 'Account created successfully');
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return ApiResponse.success(result, 'Logged in successfully');
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    const data = await this.authService.getMe(user.id);
    return ApiResponse.success(data, 'User fetched successfully');
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.authService.updateProfile(user.id, dto);
    return ApiResponse.success(data, 'Profile updated successfully');
  }
}
