import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { PersonService } from './person.service';
import { Public } from '../../common/decorators/public.decorator';
import { ApiResponse } from '../../utils/ApiResponse';

@Public()
@Controller('public/trees/:treeId')
export class PublicTreeController {
  constructor(private readonly personService: PersonService) {}

  @Get()
  async getPublicTreeView(@Param('treeId', ParseUUIDPipe) treeId: string) {
    const data = await this.personService.getPublicTreeView(treeId);
    return ApiResponse.success(data, 'Tree view fetched successfully');
  }

  @Get('persons/:personId/image')
  async getPublicImageUrl(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ) {
    const data = await this.personService.getPublicPersonImageUrl(
      treeId,
      personId,
    );
    return ApiResponse.success(data, 'Image URL generated successfully');
  }

  @Get('persons/:personId/image/view')
  async streamPublicImage(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Res() res: Response,
  ) {
    const { body, contentType } =
      await this.personService.streamPublicPersonImage(treeId, personId);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    body.pipe(res);
  }
}
