import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { TreeService } from './tree.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';

@Controller()
export class SharedTreesController {
  constructor(private readonly treeService: TreeService) {}

  @Get('shared-trees')
  async getSharedTrees(@CurrentUser() user: AuthUser) {
    const data = await this.treeService.findAllByUser(user.id);
    return ApiResponse.success(
      data.filter((t: any) => t.role !== 'OWNER'),
      'Shared trees fetched successfully',
    );
  }

  @Post('share-accept/:token')
  async acceptShare(
    @Param('token', ParseUUIDPipe) token: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.treeService.acceptShare(token, user.id, user.email);
    return ApiResponse.success(data, 'Share accepted successfully');
  }
}
