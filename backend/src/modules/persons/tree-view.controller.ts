import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PersonService } from './person.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';

@Controller('trees/:treeId')
export class TreeViewController {
  constructor(private readonly personService: PersonService) {}

  @Get('tree-view')
  async getTreeView(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.personService.getTreeView(treeId, user.id);
    return ApiResponse.success(data, 'Tree view fetched successfully');
  }
}
