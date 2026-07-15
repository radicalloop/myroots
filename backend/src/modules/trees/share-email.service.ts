import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendTreeShareInviteInput {
  to: string;
  treeName: string;
  sharedByEmail: string;
  acceptUrl: string;
  permission: 'VIEW' | 'EDIT';
}

@Injectable()
export class ShareEmailService {
  private readonly logger = new Logger(ShareEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  getAcceptShareUrl(token: string): string {
    const frontUrl =
      this.configService.get<string>('FRONT_URL') ??
      this.configService.get<string>('APP_URL') ??
      'http://localhost:5173';

    return `${frontUrl.replace(/\/$/, '')}/accept-share/${token}`;
  }

  async sendTreeShareInvite(input: SendTreeShareInviteInput): Promise<boolean> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const fromEmail = this.configService
      .get<string>('RESEND_FROM_EMAIL')
      ?.trim();

    if (!apiKey || !fromEmail) {
      this.logger.warn(
        'Tree share email was not sent because RESEND_API_KEY or RESEND_FROM_EMAIL is missing.',
      );
      return false;
    }

    const permissionLabel =
      input.permission === 'EDIT' ? 'view and edit' : 'view';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: input.to,
        subject: `${input.sharedByEmail} shared "${input.treeName}" with you`,
        html: this.buildInviteHtml(input, permissionLabel),
        text: [
          `${input.sharedByEmail} invited you to ${permissionLabel} "${input.treeName}" on MyRoots.`,
          '',
          `Accept the invite: ${input.acceptUrl}`,
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `Failed to send tree share email to ${input.to}. Resend status: ${response.status}. ${errorText}`,
      );
      return false;
    }

    return true;
  }

  private buildInviteHtml(
    input: SendTreeShareInviteInput,
    permissionLabel: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
          <h1 style="font-size: 22px; margin: 0 0 12px;">MyRoots tree invite</h1>
          <p style="margin: 0 0 16px;">
            <strong>${this.escapeHtml(input.sharedByEmail)}</strong> invited you to ${permissionLabel}
            <strong>${this.escapeHtml(input.treeName)}</strong>.
          </p>
          <a href="${input.acceptUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 700;">
            Accept invite
          </a>
          <p style="margin: 18px 0 0; font-size: 13px; color: #6b7280;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span style="word-break: break-all;">${input.acceptUrl}</span>
          </p>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
