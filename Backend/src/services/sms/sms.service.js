import { logger } from '../../utils/logger.js';
import { config } from '../../config/env.js';

/**
 * Sends a generic SMS using the configured SMS India Hub / MSG91 provider.
 */
async function sendRawSMS(phone, message, templateId = null) {
  try {
    const digits = String(phone || '').replace(/\D/g, '');
    const msisdn = digits.startsWith('91') ? digits : `91${digits}`;

    const url = new URL('http://cloud.smsindiahub.in/vendorsms/pushsms.aspx');
    url.searchParams.append('APIKey', config.smsApiKey || '');
    url.searchParams.append('sid', config.smsSenderId || '');
    url.searchParams.append('msisdn', msisdn);
    url.searchParams.append('msg', message);
    url.searchParams.append('gwid', '2');
    url.searchParams.append('fl', '0');
    if (config.smsIndiaHubUsername) {
      url.searchParams.append('uname', config.smsIndiaHubUsername);
    }
    const finalTemplateId = templateId || config.smsDltTemplateId;
    if (finalTemplateId) {
      url.searchParams.append('DLT_TE_ID', finalTemplateId);
    }

    logger.info(`[ReceiverSMS] Sending message to ${msisdn}...`);
    const response = await fetch(url.toString());
    const resultText = await response.text();
    logger.info(`[ReceiverSMS] Raw response for ${msisdn}: ${resultText}`);
    return true;
  } catch (err) {
    logger.error(`[ReceiverSMS] Failed to send SMS to ${phone}:`, err);
    return false;
  }
}

/**
 * Order Placed SMS sent to receiver
 */
export async function sendReceiverOrderPlacedSMS({ phone, receiverName, restaurantName, restaurantAddress, mapsLink }) {
  const msg = `Hi ${receiverName || 'there'}, an order has been placed for you at ${restaurantName || 'Bhookingo Partner'}.${restaurantAddress ? ` Address: ${restaurantAddress}.` : ''}${mapsLink ? ` Location: ${mapsLink}` : ''}`;
  return sendRawSMS(phone, msg, process.env.SMS_RECEIVER_ORDER_PLACED_TEMPLATE_ID);
}

/**
 * Pickup OTP SMS sent to receiver when order is ready
 */
export async function sendReceiverPickupOtpSMS({ phone, receiverName, otp, restaurantName, restaurantPhone, mapsLink }) {
  const msg = `Hi ${receiverName || 'there'}, your food at ${restaurantName || 'the restaurant'} is ready for pickup! Show OTP: ${otp}.${restaurantPhone ? ` Call: ${restaurantPhone}.` : ''}${mapsLink ? ` Location: ${mapsLink}` : ''}`;
  return sendRawSMS(phone, msg, process.env.SMS_RECEIVER_PICKUP_OTP_TEMPLATE_ID);
}

/**
 * Cancellation SMS sent to receiver
 */
export async function sendReceiverCancellationSMS({ phone, receiverName, restaurantName }) {
  const msg = `Hi ${receiverName || 'there'}, the order placed for you at ${restaurantName || 'the restaurant'} has been cancelled.`;
  return sendRawSMS(phone, msg, process.env.SMS_RECEIVER_CANCELLATION_TEMPLATE_ID);
}
