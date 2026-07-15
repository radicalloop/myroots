import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../types/common.types';
import { ApiResponse } from '../../utils/ApiResponse';

@Controller('trees/:treeId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ChatMessageDto,
  ) {
    const data = await this.chatService.sendMessage(treeId, user.id, dto);
    return ApiResponse.success(data, 'Chat response generated successfully');
  }
}
