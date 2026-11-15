import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  try {
    // 1. Record notification in DB
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        dataJson: payload.data || undefined,
      },
    });

    // 2. Fetch user's registered device tokens
    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId: payload.userId },
    });

    if (deviceTokens.length === 0) {
      logger.info({ userId: payload.userId }, 'No push tokens registered for user; stored in DB only');
      return true;
    }

    const messages = deviceTokens.map((dt) => ({
      to: dt.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (process.env.EXPO_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.warn({ err }, 'Expo push dispatch returned non-200');
      return false;
    }

    logger.info({ userId: payload.userId, count: messages.length }, 'Expo push notification dispatched');
    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to dispatch push notification');
    return false;
  }
}
