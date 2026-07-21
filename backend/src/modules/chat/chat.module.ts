import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from '../../entities/Person';
import { PersonSpouse } from '../../entities/PersonSpouse';
import { User } from '../../entities/User';
import { TreesModule } from '../trees/trees.module';
import { PersonsModule } from '../persons/persons.module';
import { StorageModule } from '../storage/storage.module';
import { ChatController } from './chat.controller';
import { PublicChatController } from './public-chat.controller';
import { ChatService } from './chat.service';
import { AiService } from './ai.service';
import { FamilyTreeImportService } from './family-tree-import.service';
import { ChatImageCleanupTask } from './tasks/chat-image-cleanup.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([Person, PersonSpouse, User]),
    TreesModule,
    PersonsModule,
    StorageModule,
  ],
  controllers: [ChatController, PublicChatController],
  providers: [
    ChatService,
    AiService,
    FamilyTreeImportService,
    ChatImageCleanupTask,
  ],
})
export class ChatModule {}
