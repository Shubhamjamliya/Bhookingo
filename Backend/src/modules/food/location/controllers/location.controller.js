import { resolveGoogleMapsLink } from '../services/location.service.js';
import { logger } from '../../../../utils/logger.js';

export async function resolveMapsLinkController(req, res, next) {
  try {
    const { link } = req.body || {};
    console.log('==================================================');
    console.log('[USER MAP LINK ENTERED]:', link);
    console.log('==================================================');
    logger.info('[ResolveMapsLinkAPI] [REQUEST] Incoming resolve-maps-link request:', { link, body: req.body });

    if (!link || typeof link !== 'string') {
      logger.warn('[ResolveMapsLinkAPI] [BAD REQUEST] Missing or invalid link:', { link });
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Google Maps link.'
      });
    }

    const result = await resolveGoogleMapsLink(link);
    if (!result.success) {
      logger.warn('[ResolveMapsLinkAPI] [FAILED] Could not resolve link:', { link, result });
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to resolve location link.'
      });
    }

    const responsePayload = {
      success: true,
      data: result
    };

    console.log('[ResolveMapsLinkAPI] [RESPONSE]', JSON.stringify(responsePayload, null, 4));
    logger.info('[ResolveMapsLinkAPI] [SUCCESS] Location resolved successfully:', responsePayload);

    return res.status(200).json(responsePayload);
  } catch (error) {
    logger.error({ err: error }, '[ResolveMapsLinkAPI] [ERROR] Exception during maps link resolution');
    next(error);
  }
}
