import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TreeService } from './tree.service';
import { CreateTreeShareDto, UpdateTreeShareDto } from './dto/share-tree.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';

@Controller('trees/:treeId/shares')
export class TreeShareController {
  constructor(private readonly treeService: TreeService) {}

  @Post()
  async create(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTreeShareDto,
  ) {
    const data = await this.treeService.createShare(treeId, user.id, dto);
    return ApiResponse.created(data, 'Share invite created successfully');
  }

  @Get()
  async findAll(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.treeService.getShares(treeId, user.id);
    return ApiResponse.success(data, 'Shares fetched successfully');
  }

  @Patch(':shareId')
  async update(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTreeShareDto,
  ) {
    const data = await this.treeService.updateShare(
      treeId,
      shareId,
      user.id,
      dto,
    );
    return ApiResponse.success(data, 'Share updated successfully');
  }

  @Delete(':shareId')
  async delete(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.treeService.deleteShare(treeId, shareId, user.id);
    return ApiResponse.success(null, 'Share removed successfully');
  }
}
