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
import { PersonService } from './person.service';
import {
  AddParentDto,
  AddSpouseDto,
  CreatePersonDto,
  UpdatePersonDto,
} from './dto/person.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';

@Controller('trees/:treeId/persons')
export class PersonsController {
  constructor(private readonly personService: PersonService) {}

  @Get()
  async findAll(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.personService.findAll(treeId, user.id);
    return ApiResponse.success(data, 'Persons fetched successfully');
  }

  @Post()
  async create(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePersonDto,
  ) {
    const data = await this.personService.create(treeId, user.id, dto);
    return ApiResponse.created(data, 'Person created successfully');
  }

  @Post(':personId/parent')
  async addParent(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddParentDto,
  ) {
    const data = await this.personService.addParent(
      treeId,
      personId,
      user.id,
      dto,
    );
    return ApiResponse.created(data, 'Parent added successfully');
  }

  @Post(':personId/spouse')
  async addSpouse(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddSpouseDto,
  ) {
    const data = await this.personService.addSpouse(
      treeId,
      personId,
      user.id,
      dto,
    );
    return ApiResponse.created(data, 'Spouse added successfully');
  }

  @Delete(':personId/spouse')
  async removeSpouse(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.personService.removeSpouse(
      treeId,
      personId,
      user.id,
    );
    return ApiResponse.success(data, 'Spouse removed successfully');
  }

  @Get(':personId')
  async findOne(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.personService.findOne(treeId, personId, user.id);
    return ApiResponse.success(data, 'Person fetched successfully');
  }

  @Patch(':personId')
  async update(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePersonDto,
  ) {
    const data = await this.personService.update(
      treeId,
      personId,
      user.id,
      dto,
    );
    return ApiResponse.success(data, 'Person updated successfully');
  }

  @Delete(':personId')
  async delete(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.personService.delete(treeId, personId, user.id);
    return ApiResponse.success(null, 'Person deleted successfully');
  }
}
