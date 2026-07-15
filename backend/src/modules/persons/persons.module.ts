import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from '../../entities/Person';
import { PersonSpouse } from '../../entities/PersonSpouse';
import { TreesModule } from '../trees/trees.module';
import { StorageModule } from '../storage/storage.module';
import { PersonService } from './person.service';
import { PersonsController } from './persons.controller';
import { PersonImageController } from './person-image.controller';
import { TreeViewController } from './tree-view.controller';
import { PublicTreeController } from './public-tree.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Person, PersonSpouse]),
    TreesModule,
    StorageModule,
  ],
  controllers: [PersonsController, PersonImageController, TreeViewController, PublicTreeController],
  providers: [PersonService],
  exports: [PersonService],
})
export class PersonsModule {}
