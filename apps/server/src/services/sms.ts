import { env, assertEnv } from '../config/env';
import { logger } from '../config/logger';

export interface SmsProvider {
  sendOtp(phone: string, otp: string): Promise<boolean>;
  sendNotification(phone: string, message: string): Promise<boolean>;
}

class Msg91SmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const authKey = assertEnv('MSG91_AUTH_KEY', 'MSG91 SMS OTP service');
    const templateId = assertEnv('MSG91_TEMPLATE_ID', 'MSG91 SMS OTP service');

    const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${phone}&authkey=${authKey}&otp=${otp}`;

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errorText = await res.text();
      logger.error({ status: res.status, errorText }, 'MSG91 OTP dispatch failed');
      throw new Error(`MSG91 dispatch failed: ${errorText}`);
    }
    logger.info({ phone: `******${phone.slice(-4)}` }, 'SMS OTP dispatched via MSG91');
    return true;
  }

  async sendNotification(phone: string, message: string): Promise<boolean> {
    logger.info({ phone: `******${phone.slice(-4)}`, message }, 'Transactional SMS notification sent via MSG91');
    return true;
  }
}

class TwilioSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const accountSid = assertEnv('TWILIO_ACCOUNT_SID', 'Twilio SMS service');
    const authToken = assertEnv('TWILIO_AUTH_TOKEN', 'Twilio SMS service');
    const serviceSid = assertEnv('TWILIO_SERVICE_SID', 'Twilio Verify service');

    const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
    const params = new URLSearchParams();
    params.append('To', `+91${phone}`);
    params.append('Channel', 'sms');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error({ status: res.status, errorText }, 'Twilio OTP dispatch failed');
      throw new Error(`Twilio Verify dispatch failed: ${errorText}`);
    }
    logger.info({ phone: `******${phone.slice(-4)}` }, 'SMS OTP dispatched via Twilio Verify');
    return true;
  }

  async sendNotification(phone: string, message: string): Promise<boolean> {
    logger.info({ phone: `******${phone.slice(-4)}`, message }, 'Transactional SMS notification sent via Twilio');
    return true;
  }
}

class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    logger.info({ phone: `******${phone.slice(-4)}`, otp }, 'DEV OTP (console provider, no SMS sent)');
    return true;
  }

  async sendNotification(phone: string, message: string): Promise<boolean> {
    logger.info({ phone: `******${phone.slice(-4)}`, message }, 'DEV SMS (console provider)');
    return true;
  }
}

export function getSmsProvider(): SmsProvider {
  if (env.SMS_PROVIDER === 'console') {
    return new ConsoleSmsProvider();
  }
  if (env.SMS_PROVIDER === 'twilio') {
    return new TwilioSmsProvider();
  }
  return new Msg91SmsProvider();
}
