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
import { CreateTreeDto, UpdateTreeDto } from './dto/tree.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';

@Controller('trees')
export class TreesController {
  constructor(private readonly treeService: TreeService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const data = await this.treeService.findAllByUser(user.id);
    return ApiResponse.success(data, 'Trees fetched successfully');
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTreeDto) {
    const data = await this.treeService.create(user.id, dto);
    return ApiResponse.created(data, 'Tree created successfully');
  }

  @Get(':treeId')
  async findOne(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.treeService.findOne(treeId, user.id);
    return ApiResponse.success(data, 'Tree fetched successfully');
  }

  @Patch(':treeId')
  async update(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTreeDto,
  ) {
    const data = await this.treeService.update(treeId, user.id, dto);
    return ApiResponse.success(data, 'Tree updated successfully');
  }

  @Delete(':treeId')
  async delete(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.treeService.delete(treeId, user.id);
    return ApiResponse.success(null, 'Tree deleted successfully');
  }
}
