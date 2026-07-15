import { IsEmail, IsEnum } from 'class-validator';
import { TreeSharePermission } from '../../../entities/TreeShare';

export class CreateTreeShareDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  sharedWithEmail!: string;

  @IsEnum(TreeSharePermission, { message: 'Permission must be VIEW or EDIT' })
  permission!: TreeSharePermission;
}

export class UpdateTreeShareDto {
  @IsEnum(TreeSharePermission, { message: 'Permission must be VIEW or EDIT' })
  permission!: TreeSharePermission;
}
