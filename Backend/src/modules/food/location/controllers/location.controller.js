import { resolveGoogleMapsLink } from '../services/location.service.js';

export async function resolveMapsLinkController(req, res, next) {
  try {
    const { link } = req.body || {};
    if (!link || typeof link !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Google Maps link.'
      });
    }

    const result = await resolveGoogleMapsLink(link);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to resolve location link.'
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
