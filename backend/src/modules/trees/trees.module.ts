import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tree } from '../../entities/Tree';
import { TreeShare } from '../../entities/TreeShare';
import { User } from '../../entities/User';
import { Person } from '../../entities/Person';
import { TreeService } from './tree.service';
import { TreesController } from './trees.controller';
import { TreeShareController } from './tree-share.controller';
import { SharedTreesController } from './shared-trees.controller';
import { ShareEmailService } from './share-email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tree, TreeShare, User, Person])],
  controllers: [TreesController, TreeShareController, SharedTreesController],
  providers: [TreeService, ShareEmailService],
  exports: [TreeService],
})
export class TreesModule {}
