import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PersonService } from './person.service';
import {
  ConfirmImageUploadDto,
  ImageUploadDto,
} from './dto/person.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';

@Controller('trees/:treeId/persons/:personId/image')
export class PersonImageController {
  constructor(private readonly personService: PersonService) {}

  @Get()
  async getImageUrl(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.personService.getImageReadUrl(
      treeId,
      personId,
      user.id,
    );
    return ApiResponse.success(data, 'Image URL generated successfully');
  }

  @Post()
  async generateUploadUrl(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ImageUploadDto,
  ) {
    const data = await this.personService.generateImageUploadUrl(
      treeId,
      personId,
      user.id,
      dto,
    );
    return ApiResponse.success(data, 'Upload URL generated successfully');
  }

  @Patch()
  async confirmUpload(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmImageUploadDto,
  ) {
    const data = await this.personService.confirmImageUpload(
      treeId,
      personId,
      user.id,
      dto,
    );
    return ApiResponse.success(data, 'Profile image confirmed successfully');
  }

  @Delete()
  async deleteImage(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.personService.deleteImage(
      treeId,
      personId,
      user.id,
    );
    return ApiResponse.success(data, 'Profile image deleted successfully');
  }

  @Post('upload')
  async uploadDirect(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Headers('content-type') rawContentType?: string,
  ) {
    if (!rawContentType) {
      throw new ApiError(400, 'Content-Type header is required');
    }

    const contentType = rawContentType.split(';')[0].trim();
    const fileBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body ?? []);

    const data = await this.personService.uploadPersonImageDirect(
      treeId,
      personId,
      user.id,
      fileBuffer,
      contentType,
    );

    return ApiResponse.success(data, 'Profile image uploaded successfully');
  }

  @Get('view')
  async streamImage(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { body, contentType } = await this.personService.streamPersonImage(
      treeId,
      personId,
      user.id,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    body.pipe(res);
  }
}
