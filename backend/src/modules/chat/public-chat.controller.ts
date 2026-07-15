import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ApiResponse } from '../../utils/ApiResponse';

@Public()
@Controller('public/trees/:treeId/chat')
export class PublicChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(
    @Param('treeId', ParseUUIDPipe) treeId: string,
    @Body() dto: ChatMessageDto,
  ) {
    const data = await this.chatService.sendPublicMessage(treeId, dto);
    return ApiResponse.success(data, 'Chat response generated successfully');
  }
}
