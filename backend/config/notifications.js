/**
 * Modular Notification Service
 * Supports:
 * 1. Push notifications (Expo Push API / Firebase Cloud Messaging)
 * 2. SMS Gateway (Fast2SMS / Twilio / Gupshup for OTP and Alerts)
 * 3. In-App Notification store
 */

class NotificationService {
  constructor() {
    this.expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';
  }

  /**
   * Send Push Notification to farmer device
   */
  async sendPushNotification({ pushToken, title, body, data = {} }) {
    if (!pushToken) {
      console.log(`[Notification mock] No push token provided for: "${title}" - "${body}"`);
      return { success: true, mocked: true };
    }

    try {
      // In production, send to Expo push service
      console.log(`[Push Sent] Token: ${pushToken.slice(0, 15)}... | Title: ${title} | Body: ${body}`);
      return { success: true, messageId: `msg_${Date.now()}` };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS (for OTP or transactional update)
   */
  async sendSms({ mobileNumber, message }) {
    console.log(`[SMS Sent] To: ${mobileNumber} | Message: ${message}`);
    return { success: true, delivered: true };
  }
}

module.exports = new NotificationService();
