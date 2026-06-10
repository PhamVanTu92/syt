import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.config.get<string>('EMAIL_HOST');
    const port = this.config.get<number>('EMAIL_PORT', 587);
    const user = this.config.get<string>('EMAIL_USER');
    const pass = this.config.get<string>('EMAIL_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('Email not configured — forgot-password emails will be logged only');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<boolean>('EMAIL_SECURE', false),
      auth: { user, pass },
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5174');
    const resetUrl = `${frontendUrl}/confirm-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
    const from = this.config.get<string>('EMAIL_FROM', 'Sở Y Tế Hà Nội <noreply@suckhoethudo.vn>');

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db;">Đặt lại mật khẩu</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${to}</strong>.</p>
        <p>Nhấn vào nút bên dưới để đặt lại mật khẩu (có hiệu lực trong <strong>1 giờ</strong>):</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1a56db;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Đặt lại mật khẩu
        </a>
        <p style="color:#6b7280;font-size:13px;">
          Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
          Link sẽ hết hạn sau 1 giờ.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;">Sở Y Tế Hà Nội — hệ thống tự động, vui lòng không trả lời email này.</p>
      </div>
    `;

    if (!this.transporter) {
      // Dev fallback: log to console
      this.logger.log(`[DEV] Password reset link for ${to}: ${resetUrl}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from, to, subject: 'Đặt lại mật khẩu — Sở Y Tế Hà Nội', html });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${to}`, err);
      throw err;
    }
  }

  async sendVerificationEmail(to: string, otp: string): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM', 'Sở Y Tế Hà Nội <noreply@suckhoethudo.vn>');
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db;">Xác thực email</h2>
        <p>Mã OTP của bạn là:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1a56db;margin:16px 0;">${otp}</div>
        <p style="color:#6b7280;font-size:13px;">Mã có hiệu lực trong 10 phút.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.log(`[DEV] OTP for ${to}: ${otp}`);
      return;
    }

    await this.transporter.sendMail({ from, to, subject: 'Mã xác thực OTP — Sở Y Tế Hà Nội', html });
  }
}
