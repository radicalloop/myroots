import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../storage/s3.service';

@Injectable()
export class ChatImageCleanupTask {
  private readonly logger = new Logger(ChatImageCleanupTask.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredChatImages(): Promise<void> {
    const retentionHours = Number(
      this.configService.get('CHAT_IMAGE_RETENTION_HOURS') ?? 10,
    );
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - retentionHours);

    this.logger.log(
      `Running chat image cleanup (older than ${retentionHours}h)`,
    );

    try {
      const deleted = await this.s3Service.deleteChatImagesOlderThan(cutoff);
      this.logger.log(`Deleted ${deleted} expired chat image(s)`);
    } catch (error) {
      this.logger.error(
        'Failed to delete expired chat images',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
