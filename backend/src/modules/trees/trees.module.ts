import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tree } from '../../entities/Tree';
import { TreeShare } from '../../entities/TreeShare';
import { User } from '../../entities/User';
import { TreeService } from './tree.service';
import { TreesController } from './trees.controller';
import { TreeShareController } from './tree-share.controller';
import { SharedTreesController } from './shared-trees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tree, TreeShare, User])],
  controllers: [TreesController, TreeShareController, SharedTreesController],
  providers: [TreeService],
  exports: [TreeService],
})
export class TreesModule {}
