import { FoodRestaurant } from '../models/restaurant.model.js';
import { uploadImageBuffer } from '../../../../services/cloudinary.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import mongoose from 'mongoose';
import { FoodHighway } from '../../admin/models/highway.model.js';
import { FoodOffer } from '../../admin/models/offer.model.js';
import { FoodDiningRestaurant } from '../../dining/models/diningRestaurant.model.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { getFoodDisplayPrice } from '../../admin/services/foodVariant.service.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { assignHighwayToRestaurant } from '../../admin/services/highway.service.js';
import { FoodRestaurantOutletTimings } from '../models/outletTimings.model.js';
import { DISCOVERY_RADIUS_KM, UNDER250_RADIUS_KM } from '../../orders/services/order.helpers.js';
import { detectHighwayUsingGoogleMaps } from '../../location/services/location.service.js';

const normalizeName = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ');

const normalizePhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(-15);
    return {
        digits: digits || '',
        last10: digits ? digits.slice(-10) : ''
    };
};

const normalizeRatingValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(5, Number(numeric.toFixed(1))));
};

const normalizeTotalRatingsValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.floor(numeric));
};

const getFacilityAvailability = (facilities, key) => {
    const entry = facilities?.[key];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return entry.available === true;
    }
    return entry === true;
};

const buildFacilitiesPayload = (facilities) => {
    if (!facilities || typeof facilities !== 'object') return undefined;
    const toAvailable = (value) => value === true || value === 'true';
    return {
        parking: { available: toAvailable(facilities.parking), rating: { average: 0, count: 0 } },
        wifi: { available: toAvailable(facilities.wifi), rating: { average: 0, count: 0 } },
        familyFriendly: { available: toAvailable(facilities.familyFriendly), rating: { average: 0, count: 0 } },
        evCharging: { available: toAvailable(facilities.evCharging), rating: { average: 0, count: 0 } },
        washroom: { available: toAvailable(facilities.washroom), rating: { average: 0, count: 0 } },
        overall: { rating: { average: 0, count: 0 } }
    };
};

const toUrl = (v) => (v && (typeof v === 'string' ? v : v.url)) ? (typeof v === 'string' ? v : v.url) : '';

const getRestaurantDocuments = (doc) => {
    const documents = doc?.documents && typeof doc.documents === 'object' ? doc.documents : {};
    return {
        pan: documents.pan && typeof documents.pan === 'object' ? documents.pan : {},
        gst: documents.gst && typeof documents.gst === 'object' ? documents.gst : {},
        fssai: documents.fssai && typeof documents.fssai === 'object' ? documents.fssai : {}
    };
};

const buildDocumentsPayload = ({
    panNumber,
    nameOnPan,
    panImage,
    gstRegistered,
    gstNumber,
    gstLegalName,
    gstAddress,
    gstImage,
    fssaiNumber,
    fssaiExpiry,
    fssaiImage
}) => ({
    pan: {
        number: String(panNumber || '').trim().toUpperCase(),
        name: String(nameOnPan || '').trim(),
        image: toUrl(panImage) || ''
    },
    gst: {
        registered: gstRegistered === true,
        number: String(gstNumber || '').trim().toUpperCase(),
        legalName: String(gstLegalName || '').trim(),
        address: String(gstAddress || '').trim(),
        image: toUrl(gstImage) || ''
    },
    fssai: {
        number: String(fssaiNumber || '').trim(),
        expiry: fssaiExpiry || null,
        image: toUrl(fssaiImage) || ''
    }
});

const normalizeRestaurantTime = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const toHHMM = (hour, minute) => {
        const h = Number(hour);
        const m = Number(minute);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
        if (h < 0 || h > 23 || m < 0 || m > 59) return '';
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // HH:mm / H:mm
    const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) return toHHMM(hhmm[1], hhmm[2]);

    // hh:mm AM/PM
    const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampm) {
        let hour = Number(ampm[1]);
        const minute = Number(ampm[2]);
        const period = ampm[3].toUpperCase();
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
        if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return '';
        if (period === 'AM') hour = hour === 12 ? 0 : hour;
        if (period === 'PM') hour = hour === 12 ? 12 : hour + 12;
        return toHHMM(hour, minute);
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return toHHMM(parsed.getHours(), parsed.getMinutes());
    }

    return '';
};

const timeToMinutes = (value) => {
    const normalized = normalizeRestaurantTime(value);
    if (!normalized) return null;
    const [h, m] = normalized.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
};



const toRestaurantProfile = (doc) => {
    if (!doc) return null;
    const documents = getRestaurantDocuments(doc);
    const loc = doc.location && typeof doc.location === 'object' ? doc.location : null;
    const location =
        (loc?.formattedAddress ||
            loc?.address ||
            loc?.addressLine1 ||
            loc?.addressLine2 ||
            loc?.area ||
            loc?.city ||
            loc?.state ||
            loc?.pincode ||
            loc?.landmark ||
            doc.addressLine1 ||
            doc.addressLine2 ||
            doc.area ||
            doc.city ||
            doc.state ||
            doc.pincode ||
            doc.landmark)
            ? {
                type: loc?.type || 'Point',
                coordinates: Array.isArray(loc?.coordinates) ? loc.coordinates : undefined,
                latitude: typeof loc?.latitude === 'number' ? loc.latitude : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : undefined),
                longitude: typeof loc?.longitude === 'number' ? loc.longitude : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : undefined),
                formattedAddress: loc?.formattedAddress || loc?.address || '',
                address: loc?.address || loc?.formattedAddress || '',
                addressLine1: loc?.addressLine1 || doc.addressLine1 || '',
                addressLine2: loc?.addressLine2 || doc.addressLine2 || '',
                area: loc?.area || doc.area || '',
                city: loc?.city || doc.city || '',
                state: loc?.state || doc.state || '',
                pincode: loc?.pincode || doc.pincode || '',
                landmark: loc?.landmark || doc.landmark || '',
                roadName: loc?.roadName || '',
                placeId: loc?.placeId || ''
            }
            : null;

    const menuImages = Array.isArray(doc.menuImages)
        ? doc.menuImages.map((m) => toUrl(m)).filter(Boolean).map((url) => ({ url, publicId: null }))
        : [];
    const coverImages = Array.isArray(doc.coverImages)
        ? doc.coverImages.map((m) => toUrl(m)).filter(Boolean).map((url) => ({ url, publicId: null }))
        : [];

    return {
        id: doc._id,
        _id: doc._id,
        restaurantId: doc.restaurantId || undefined,
        name: doc.restaurantName || '',
        restaurantName: doc.restaurantName || '',
        restaurantType: doc.restaurantType || 'normal',
        highwayName: doc.highwayName || '',
        highwayRef: doc.highwayRef || '',
        cuisines: Array.isArray(doc.cuisines) ? doc.cuisines : [],
        location,
        locationSource: doc.locationSource || 'google_places',
        ownerName: doc.ownerName || '',
        ownerEmail: doc.ownerEmail || '',
        ownerPhone: doc.ownerPhone || '',
        primaryContactNumber: doc.primaryContactNumber || '',
        documents,
        panNumber: documents.pan.number || '',
        nameOnPan: documents.pan.name || '',
        panImage: documents.pan.image ? { url: documents.pan.image } : null,
        gstRegistered: Boolean(documents.gst.registered),
        gstNumber: documents.gst.number || '',
        gstLegalName: documents.gst.legalName || '',
        gstAddress: documents.gst.address || '',
        gstImage: documents.gst.image ? { url: documents.gst.image } : null,
        fssaiNumber: documents.fssai.number || '',
        fssaiExpiry: documents.fssai.expiry || null,
        fssaiImage: documents.fssai.image ? { url: documents.fssai.image } : null,
        accountNumber: doc.accountNumber || '',
        ifscCode: doc.ifscCode || '',
        accountHolderName: doc.accountHolderName || '',
        accountType: doc.accountType || '',
        upiId: doc.upiId || '',
        upiQrImage: doc.upiQrImage ? { url: doc.upiQrImage } : null,
        pureVegRestaurant: Boolean(doc.pureVegRestaurant),
        profileImage: doc.profileImage ? { url: doc.profileImage } : null,
        menuImages,
        coverImages,
        openingTime: normalizeRestaurantTime(doc.openingTime) || null,
        closingTime: normalizeRestaurantTime(doc.closingTime) || null,
        openDays: Array.isArray(doc.openDays) ? doc.openDays : [],

        diningSettings: {
            isEnabled: doc.diningSettings?.isEnabled !== false,
            maxGuests: Math.max(1, parseInt(doc.diningSettings?.maxGuests, 10) || 6),
            diningType: String(doc.diningSettings?.diningType || 'family-dining').trim() || 'family-dining'
        },
        takeawaySettings: {
            isEnabled: doc.takeawaySettings?.isEnabled === true
        },
        facilities: doc.facilities ? {
            parking: getFacilityAvailability(doc.facilities, 'parking'),
            wifi: getFacilityAvailability(doc.facilities, 'wifi'),
            familyFriendly: getFacilityAvailability(doc.facilities, 'familyFriendly'),
            evCharging: getFacilityAvailability(doc.facilities, 'evCharging'),
            washroom: getFacilityAvailability(doc.facilities, 'washroom')
        } : {
            parking: false,
            wifi: false,
            familyFriendly: false,
            evCharging: false,
            washroom: false
        },
        isAcceptingOrders: doc.isAcceptingOrders !== false,
        status: doc.status || null,
        approvalStatus: doc.status || null,
        rejectionReason: doc.rejectionReason || '',
        adminMessage: doc.rejectionReason || '',
        rejectionHistory: doc.rejectionHistory || [],
        approvedAt: doc.approvedAt || null,
        rejectedAt: doc.rejectedAt || null,
        adminId: doc.adminId || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        rating: normalizeRatingValue(doc.rating),
        totalRatings: normalizeTotalRatingsValue(doc.totalRatings)
    };
};

const toFiniteNumber = (value) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : null;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeCuisine = (value) => String(value || '').trim().slice(0, 80);

const allowed = new Set(['rating', 'rating-high', 'rating-low', 'price-low', 'price-high', 'newest']);

const parseSortBy = (value) => {
    const v = String(value || '').trim();
    return allowed.has(v) ? v : null;
};

const zoneToPolygon = (highwayDoc) => {
    const coords = Array.isArray(highwayDoc?.coordinates) ? highwayDoc.coordinates : [];
    if (coords.length < 3) return null;
    const ring = coords
        .map((c) => [Number(c.longitude), Number(c.latitude)])
        .filter((pair) => pair.every((n) => Number.isFinite(n)));
    if (ring.length < 3) return null;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
    return { type: 'Polygon', coordinates: [ring] };
};

const notifyAdminsAboutRestaurantProfileReview = async (restaurantId, restaurantName) => {
    try {
        const { notifyAdminsSafely } = await import('../../../../core/notifications/firebase.service.js');
        void notifyAdminsSafely({
            title: 'Restaurant Profile Updated',
            body: `Restaurant "${restaurantName || 'Unknown Restaurant'}" updated its profile and is pending approval again.`,
            data: {
                type: 'restaurant_profile_updated',
                subType: 'restaurant',
                id: String(restaurantId)
            }
        });
    } catch (e) {
        console.error('Failed to notify admins of restaurant profile resubmission:', e);
    }
};

export const registerRestaurant = async (payload, files) => {
    const {
        restaurantName,
        ownerName,
        ownerEmail,
        ownerPhone,
        primaryContactNumber,
        pureVegRestaurant,
        addressLine1,
        addressLine2,
        area,
        city,
        state,
        pincode,
        landmark,
        roadName,
        formattedAddress,
        latitude,
        longitude,
        locationSource,
        placeId,
        restaurantType,
        cuisines,
        openingTime,
        closingTime,
        openDays,
        panNumber,
        nameOnPan,
        gstRegistered,
        gstNumber,
        gstLegalName,
        gstAddress,
        fssaiNumber,
        fssaiExpiry,
        accountNumber,
        ifscCode,
        accountHolderName,
        accountType,
        isTakeawayEnabled,
        facilities
    } = payload;

    if (!ownerPhone) {
        throw new ValidationError('Owner phone is required to register a restaurant');
    }

    const { digits: ownerPhoneDigits, last10: ownerPhoneLast10 } = normalizePhone(ownerPhone);
    if (!ownerPhoneLast10) {
        throw new ValidationError('Owner phone is invalid');
    }

    const restaurantNameNormalized = normalizeName(restaurantName);
    if (!restaurantNameNormalized) {
        throw new ValidationError('Restaurant name is required to register a restaurant');
    }

    const images = {};

    if (files?.profileImage?.[0]) {
        images.profileImage = await uploadImageBuffer(files.profileImage[0].buffer, 'food/restaurants/profile');
    }
    if (files?.panImage?.[0]) {
        images.panImage = await uploadImageBuffer(files.panImage[0].buffer, 'food/restaurants/pan');
    }
    if (files?.gstImage?.[0]) {
        images.gstImage = await uploadImageBuffer(files.gstImage[0].buffer, 'food/restaurants/gst');
    }
    if (files?.fssaiImage?.[0]) {
        images.fssaiImage = await uploadImageBuffer(files.fssaiImage[0].buffer, 'food/restaurants/fssai');
    }

    let menuImages = [];
    if (files?.menuImages?.length) {
        menuImages = await Promise.all(
            files.menuImages.map((file) => uploadImageBuffer(file.buffer, 'food/restaurants/menu'))
        );
    }


    const normalizedOpeningTime = normalizeRestaurantTime(openingTime);
    const normalizedClosingTime = normalizeRestaurantTime(closingTime);
    const openingMinutes = timeToMinutes(normalizedOpeningTime);
    const closingMinutes = timeToMinutes(normalizedClosingTime);
    if (openingMinutes !== null && closingMinutes !== null) {
        if (openingMinutes === closingMinutes) {
            throw new ValidationError('Opening time and closing time cannot be same');
        }
        if (closingMinutes < openingMinutes) {
            throw new ValidationError('Closing time cannot be less than opening time');
        }
    }

    try {
        const latNum = toFiniteNumber(latitude);
        const lngNum = toFiniteNumber(longitude);
        const wantsHighwayRestaurant = restaurantType !== 'normal';
        const googleHighwayDetection = wantsHighwayRestaurant && latNum !== null && lngNum !== null
            ? await detectHighwayUsingGoogleMaps(latNum, lngNum)
            : null;

        if (wantsHighwayRestaurant && (!googleHighwayDetection || googleHighwayDetection.status !== 'IN_SERVICE')) {
            throw new ValidationError('Restaurant location is not near a detectable road.');
        }

        const restaurant = await FoodRestaurant.create({
            restaurantName,
            restaurantNameNormalized,
            ownerName,
            ownerEmail,
            // Store phone in a consistent digits-only format to match OTP login flow.
            ownerPhone: ownerPhoneDigits,
            ownerPhoneDigits,
            ownerPhoneLast10,
            primaryContactNumber,
            restaurantType: wantsHighwayRestaurant ? 'highway' : 'normal',
            pureVegRestaurant: pureVegRestaurant === true,
            highwayName: wantsHighwayRestaurant ? (googleHighwayDetection?.highwayName || null) : null,
            highwayRef: wantsHighwayRestaurant ? (googleHighwayDetection?.highwayRef || null) : null,
            locationSource: locationSource || 'google_places',
            // Store unified location object (geo + address).
            location: {
                type: 'Point',
                coordinates: latNum !== null && lngNum !== null ? [lngNum, latNum] : undefined,
                latitude: latNum ?? undefined,
                longitude: lngNum ?? undefined,
                formattedAddress: typeof formattedAddress === 'string' ? formattedAddress.trim() : '',
                address: typeof formattedAddress === 'string' ? formattedAddress.trim() : '',
                addressLine1: addressLine1 || '',
                addressLine2: addressLine2 || '',
                area: area || '',
                city: city || '',
                state: state || '',
                pincode: pincode || '',
                landmark: landmark || '',
                roadName: roadName || '',
                placeId: placeId || ''
            },
            cuisines: cuisines || [],
            openingTime: normalizedOpeningTime || undefined,
            closingTime: normalizedClosingTime || undefined,
            openDays: openDays || [],
            documents: buildDocumentsPayload({
                panNumber,
                nameOnPan,
                panImage: images.panImage,
                gstRegistered,
                gstNumber,
                gstLegalName,
                gstAddress,
                gstImage: images.gstImage,
                fssaiNumber,
                fssaiExpiry,
                fssaiImage: images.fssaiImage
            }),
            accountNumber,
            ifscCode,
            accountHolderName,
            accountType,
            menuImages,
            takeawaySettings: {
                isEnabled: isTakeawayEnabled === undefined ? true : (isTakeawayEnabled === 'true' || isTakeawayEnabled === true)
            },
            facilities: buildFacilitiesPayload(facilities),
            profileImage: images.profileImage
        });

        // Re-check nearest highway from coordinates as a safety sync for future threshold changes.
        if (wantsHighwayRestaurant) {
            await assignHighwayToRestaurant(restaurant._id);
        }

        const refreshed = await FoodRestaurant.findById(restaurant._id).lean();

        try {
            const { notifyAdminsSafely } = await import('../../../../core/notifications/firebase.service.js');
            void notifyAdminsSafely({
                title: 'New Restaurant Registration 🏪',
                body: `A new restaurant "${restaurant.restaurantName}" has registered and is pending approval.`,
                data: {
                    type: 'new_registration',
                    subType: 'restaurant',
                    id: String(restaurant._id)
                }
            });
        } catch (e) {
            console.error('Failed to notify admins of new restaurant registration:', e);
        }

        return refreshed || restaurant.toObject();
    } catch (err) {
        // Handle uniqueness conflicts deterministically (race-safe).
        if (err && (err.code === 11000 || err?.name === 'MongoServerError')) {
            throw new ValidationError('Restaurant with this name and owner phone already exists');
        }
        throw err;
    }
};

export const getCurrentRestaurantProfile = async (restaurantId) => {
    if (!restaurantId) return null;
    const doc = await FoodRestaurant.findById(restaurantId)
        .select(
            [
                'restaurantName',
                'restaurantId',
                'cuisines',
                'location',
                'addressLine1',
                'addressLine2',
                'area',
                'city',
                'state',
                'pincode',
                'landmark',
                'locationSource',
                'ownerName',
                'ownerEmail',
                'ownerPhone',
                'primaryContactNumber',
                'restaurantType',
                'highwayName',
                'highwayRef',
                'accountNumber',
                'ifscCode',
                'accountHolderName',
                'accountType',
                'upiId',
                'upiQrImage',
                'pureVegRestaurant',
                'profileImage',
                'coverImages',
                'menuImages',
                'openingTime',
                'closingTime',
                'openDays',
                'diningSettings',
                'takeawaySettings',
                'isAcceptingOrders',
                'documents',
                'rating',
                'totalRatings',
                'status',
                'rejectionReason',
                'rejectedAt',
                'approvedAt',
                'rejectionHistory',
                'adminId',
                'facilities',
                'createdAt',
                'updatedAt'
            ].join(' ')
        )
        .lean();
    return toRestaurantProfile(doc);
};

export const updateRestaurantAcceptingOrders = async (restaurantId, isAcceptingOrders) => {
    if (!restaurantId) {
        throw new ValidationError('Invalid restaurant id');
    }
    const value = Boolean(isAcceptingOrders);
    const doc = await FoodRestaurant.findByIdAndUpdate(
        restaurantId,
        { $set: { isAcceptingOrders: value } },
        {
            new: true,
            runValidators: true,
            projection: [
                'restaurantName',
                'cuisines',
                'location',
                'addressLine1',
                'addressLine2',
                'area',
                'city',
                'state',
                'pincode',
                'landmark',
                'ownerName',
                'ownerEmail',
                'ownerPhone',
                'primaryContactNumber',
                'accountNumber',
                'ifscCode',
                'accountHolderName',
                'accountType',
                'upiId',
                'upiQrImage',
                'pureVegRestaurant',
                'profileImage',
                'coverImages',
                'menuImages',
                'openingTime',
                'closingTime',
                'openDays',
                'diningSettings',
                'isAcceptingOrders',
                'status',
                'createdAt',
                'updatedAt'
            ].join(' ')
        }
    ).lean();
    return toRestaurantProfile(doc);
};

export const updateCurrentRestaurantDiningSettings = async (restaurantId, body = {}) => {
    if (!restaurantId) {
        throw new ValidationError('Invalid restaurant id');
    }

    const currentRestaurant = await FoodRestaurant.findById(restaurantId)
        .select('diningSettings status')
        .lean();

    if (!currentRestaurant) {
        throw new ValidationError('Restaurant not found');
    }

    const currentDiningSettings =
        currentRestaurant.diningSettings && typeof currentRestaurant.diningSettings === 'object'
            ? currentRestaurant.diningSettings
            : {};

    const parseBoolean = (value, fallback = false) => {
        if (value === undefined || value === null) return Boolean(fallback);
        if (typeof value === 'boolean') return value;
        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
        if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
        return Boolean(fallback);
    };

    const maxGuests = Math.max(
        1,
        parseInt(body.maxGuests ?? currentDiningSettings.maxGuests ?? 6, 10) || 6
    );
    const diningType =
        String(body.diningType ?? currentDiningSettings.diningType ?? 'family-dining').trim() ||
        'family-dining';

    const isEnabled = parseBoolean(body.isEnabled, currentDiningSettings.isEnabled);
    
    // First, update the FoodDiningRestaurant collection to keep it synced
    await FoodDiningRestaurant.findOneAndUpdate(
        { restaurantId },
        {
            $set: {
                isEnabled,
                maxGuests,
            }
        },
        { upsert: true }
    );

    const doc = await FoodRestaurant.findByIdAndUpdate(
        restaurantId,
        {
            $set: {
                diningSettings: {
                    isEnabled,
                    maxGuests,
                    diningType
                }
            }
        },
        {
            new: true,
            runValidators: true,
            projection: [
                'restaurantName',
                'cuisines',
                'location',
                'addressLine1',
                'addressLine2',
                'area',
                'city',
                'state',
                'pincode',
                'landmark',
                'ownerName',
                'ownerEmail',
                'ownerPhone',
                'primaryContactNumber',
                'accountNumber',
                'ifscCode',
                'accountHolderName',
                'accountType',
                'upiId',
                'upiQrImage',
                'pureVegRestaurant',
                'profileImage',
                'coverImages',
                'menuImages',
                'openingTime',
                'closingTime',
                'openDays',
                'diningSettings',
                'isAcceptingOrders',
                'status',
                'createdAt',
                'updatedAt'
            ].join(' ')
        }
    ).lean();

    return toRestaurantProfile(doc);
};

export const updateCurrentRestaurantTakeawaySettings = async (restaurantId, body = {}) => {
    if (!restaurantId) {
        throw new ValidationError('Invalid restaurant id');
    }

    const currentRestaurant = await FoodRestaurant.findById(restaurantId)
        .select('takeawaySettings status')
        .lean();

    if (!currentRestaurant) {
        throw new ValidationError('Restaurant not found');
    }

    const currentTakeawaySettings =
        currentRestaurant.takeawaySettings && typeof currentRestaurant.takeawaySettings === 'object'
            ? currentRestaurant.takeawaySettings
            : {};

    const parseBoolean = (value, fallback = false) => {
        if (value === undefined || value === null) return Boolean(fallback);
        if (typeof value === 'boolean') return value;
        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
        if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
        return Boolean(fallback);
    };

    const doc = await FoodRestaurant.findByIdAndUpdate(
        restaurantId,
        {
            $set: {
                takeawaySettings: {
                    isEnabled: parseBoolean(body.isEnabled, currentTakeawaySettings.isEnabled)
                }
            }
        },
        {
            new: true,
            runValidators: true,
            projection: [
                'restaurantName',
                'cuisines',
                'location',
                'addressLine1',
                'addressLine2',
                'area',
                'city',
                'state',
                'pincode',
                'landmark',
                'ownerName',
                'ownerEmail',
                'ownerPhone',
                'primaryContactNumber',
                'accountNumber',
                'ifscCode',
                'accountHolderName',
                'accountType',
                'upiId',
                'upiQrImage',
                'pureVegRestaurant',
                'profileImage',
                'coverImages',
                'menuImages',
                'openingTime',
                'closingTime',
                'openDays',
                'diningSettings',
                'takeawaySettings',
                'isAcceptingOrders',
                'status',
                'createdAt',
                'updatedAt'
            ].join(' ')
        }
    ).lean();

    return toRestaurantProfile(doc);
};

export const updateRestaurantProfile = async (restaurantId, body = {}) => {
    if (!restaurantId) {
        throw new ValidationError('Invalid restaurant id');
    }

    const currentRestaurant = await FoodRestaurant.findById(restaurantId)
        .select('restaurantName restaurantNameNormalized ownerPhone ownerPhoneDigits ownerPhoneLast10 primaryContactNumber status restaurantType')
        .lean();

    if (!currentRestaurant) {
        throw new ValidationError('Restaurant not found');
    }

    const update = {};
    let shouldSyncHighwayAfterUpdate = false;
    let nextRestaurantType = currentRestaurant.restaurantType === 'normal' ? 'normal' : 'highway';

    // Owner/contact fields (used by restaurant Contact Details screens)
    if (body.ownerName !== undefined) {
        const ownerName = String(body.ownerName || '').trim();
        if (!ownerName) {
            throw new ValidationError('Owner name cannot be empty');
        }
        if (ownerName.length > 120) {
            throw new ValidationError('Owner name is too long');
        }
        update.ownerName = ownerName;
    }

    if (body.ownerEmail !== undefined) {
        const ownerEmail = String(body.ownerEmail || '').trim().toLowerCase();
        if (ownerEmail) {
            const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!EMAIL_REGEX.test(ownerEmail)) {
                throw new ValidationError('Owner email is invalid');
            }
            if (ownerEmail.length > 254) {
                throw new ValidationError('Owner email is too long');
            }
            update.ownerEmail = ownerEmail;
        } else {
            update.ownerEmail = '';
        }
    }

    // Note: UI keeps phone read-only, but we accept it safely and normalize if sent.
    if (body.ownerPhone !== undefined) {
        const { digits, last10 } = normalizePhone(body.ownerPhone);
        if (!digits || digits.length < 8) {
            throw new ValidationError('Owner phone is invalid');
        }

        const currentOwnerPhoneDigits =
            currentRestaurant.ownerPhoneDigits ||
            normalizePhone(currentRestaurant.ownerPhone).digits ||
            '';

        if (digits !== currentOwnerPhoneDigits) {
            update.ownerPhone = digits;
            update.ownerPhoneDigits = digits;
            update.ownerPhoneLast10 = last10 || undefined;
        }
    }

    if (body.primaryContactNumber !== undefined) {
        const { digits } = normalizePhone(body.primaryContactNumber);
        const normalizedPrimaryContact =
            digits || String(body.primaryContactNumber || '').trim();
        const currentPrimaryContact =
            currentRestaurant.primaryContactNumber != null
                ? String(currentRestaurant.primaryContactNumber).trim()
                : '';

        if (normalizedPrimaryContact !== currentPrimaryContact) {
            update.primaryContactNumber = normalizedPrimaryContact;
        }
    }

    if (body.pureVegRestaurant !== undefined) {
        if (typeof body.pureVegRestaurant === 'boolean') {
            update.pureVegRestaurant = body.pureVegRestaurant;
        } else if (typeof body.pureVegRestaurant === 'string') {
            const normalized = body.pureVegRestaurant.trim().toLowerCase();
            if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
                update.pureVegRestaurant = true;
            } else if (normalized === 'false' || normalized === '0' || normalized === 'no') {
                update.pureVegRestaurant = false;
            } else {
                throw new ValidationError('pureVegRestaurant must be a boolean');
            }
        } else {
            throw new ValidationError('pureVegRestaurant must be a boolean');
        }
    }

    if (body.facilities !== undefined) {
        let parsedFacilities = body.facilities;
        if (typeof parsedFacilities === 'string') {
            try {
                parsedFacilities = JSON.parse(parsedFacilities);
            } catch (e) {
                parsedFacilities = {};
            }
        }
        update.facilities = buildFacilitiesPayload(parsedFacilities);
    }

    if (body.restaurantType !== undefined) {
        const normalizedRestaurantType = String(body.restaurantType || '').trim().toLowerCase();
        if (normalizedRestaurantType !== 'highway' && normalizedRestaurantType !== 'normal') {
            throw new ValidationError('restaurantType must be either "highway" or "normal"');
        }

        nextRestaurantType = normalizedRestaurantType;
        update.restaurantType = normalizedRestaurantType;

        if (nextRestaurantType !== 'highway') {
            update.highwayName = null;
            update.highwayRef = null;
        }
    }

    // Bank + UPI fields (Explore -> Update Bank Details page)
    if (body.accountHolderName !== undefined) {
        update.accountHolderName = String(body.accountHolderName || '').trim();
    }
    if (body.accountNumber !== undefined) {
        update.accountNumber = String(body.accountNumber || '').replace(/\s|-/g, '').trim();
    }
    if (body.ifscCode !== undefined) {
        update.ifscCode = String(body.ifscCode || '').trim().toUpperCase();
    }
    if (body.accountType !== undefined) {
        update.accountType = String(body.accountType || '').trim();
    }
    if (body.upiId !== undefined) {
        update.upiId = String(body.upiId || '').trim();
    }
    if (body.upiQrImage !== undefined || body.upiQrCode !== undefined) {
        const qrImage = body.upiQrImage !== undefined ? body.upiQrImage : body.upiQrCode;
        update.upiQrImage = String(qrImage || '').trim();
    }

    if (body.name !== undefined || body.restaurantName !== undefined) {
        const raw = body.name !== undefined ? body.name : body.restaurantName;
        const name = String(raw || '').trim();
        if (!name) {
            throw new ValidationError('Restaurant name cannot be empty');
        }
        const normalizedName = normalizeName(name) || undefined;
        const currentName = String(currentRestaurant.restaurantName || '').trim();
        const currentNormalizedName =
            currentRestaurant.restaurantNameNormalized || normalizeName(currentName) || undefined;

        if (name !== currentName || normalizedName !== currentNormalizedName) {
            update.restaurantName = name;
            update.restaurantNameNormalized = normalizedName;
        }
    }

    if (body.cuisines !== undefined) {
        if (!Array.isArray(body.cuisines)) {
            throw new ValidationError('Cuisines must be an array of strings');
        }
        const cuisines = body.cuisines
            .map((c) => String(c || '').trim())
            .filter(Boolean)
            .slice(0, 50);
        update.cuisines = cuisines;
    }

    if (body.location !== undefined) {
        const loc = body.location && typeof body.location === 'object' ? body.location : null;
        if (!loc) {
            throw new ValidationError('Location must be an object');
        }
        const toStr = (v) => (v != null ? String(v).trim() : '');
        const formattedAddress = toStr(loc.formattedAddress || loc.address);
        update.addressLine1 = toStr(loc.addressLine1);
        update.addressLine2 = toStr(loc.addressLine2);
        update.area = toStr(loc.area);
        update.city = toStr(loc.city);
        update.state = toStr(loc.state);
        update.pincode = toStr(loc.pincode);
        update.landmark = toStr(loc.landmark);

        // Optional geo coords for server-side distance filtering.
        const lat = toFiniteNumber(loc.latitude);
        const lng = toFiniteNumber(loc.longitude);
        update.location = {
            type: 'Point',
            coordinates: lat !== null && lng !== null ? [lng, lat] : undefined,
            latitude: lat ?? undefined,
            longitude: lng ?? undefined,
            formattedAddress,
            address: formattedAddress,
            addressLine1: toStr(loc.addressLine1),
            addressLine2: toStr(loc.addressLine2),
            area: toStr(loc.area),
            city: toStr(loc.city),
            state: toStr(loc.state),
            pincode: toStr(loc.pincode),
            landmark: toStr(loc.landmark),
            roadName: toStr(loc.roadName),
            placeId: toStr(loc.placeId)
        };
        shouldSyncHighwayAfterUpdate = nextRestaurantType === 'highway';
    }

    if (body.locationSource !== undefined) {
        update.locationSource = String(body.locationSource || 'google_places').trim();
    }

    if (body.openingTime !== undefined) {
        update.openingTime = normalizeRestaurantTime(body.openingTime) || '';
    }
    if (body.closingTime !== undefined) {
        update.closingTime = normalizeRestaurantTime(body.closingTime) || '';
    }
    if (body.openDays !== undefined) {
        if (!Array.isArray(body.openDays)) {
            throw new ValidationError('openDays must be an array');
        }
        update.openDays = body.openDays
            .map((day) => String(day || '').trim())
            .filter(Boolean)
            .slice(0, 7);
    }


    const openingMinutes = body.openingTime !== undefined ? timeToMinutes(update.openingTime) : null;
    const closingMinutes = body.closingTime !== undefined ? timeToMinutes(update.closingTime) : null;
    if (openingMinutes !== null && closingMinutes !== null) {
        if (openingMinutes === closingMinutes) {
            throw new ValidationError('Opening time and closing time cannot be same');
        }
        if (closingMinutes < openingMinutes) {
            throw new ValidationError('Closing time cannot be less than opening time');
        }
    }

    if (body.menuImages !== undefined) {
        if (!Array.isArray(body.menuImages)) {
            throw new ValidationError('menuImages must be an array');
        }
        const urls = body.menuImages
            .map((m) => toUrl(m))
            .filter(Boolean)
            .slice(0, 20);
        update.menuImages = urls;
    }


    if (body.coverImages !== undefined) {
        if (!Array.isArray(body.coverImages)) {
            throw new ValidationError('coverImages must be an array');
        }
        const urls = body.coverImages
            .map((m) => toUrl(m))
            .filter(Boolean)
            .slice(0, 20);
        update.coverImages = urls;
    }

    if (body.profileImage !== undefined) {
        update.profileImage = toUrl(body.profileImage) || '';
    }

    const nextDocuments = {};
    let hasDocumentUpdates = false;

    if (body.panNumber !== undefined || body.nameOnPan !== undefined || body.panImage !== undefined) {
        if (body.panNumber !== undefined) {
            nextDocuments['documents.pan.number'] = String(body.panNumber || '').trim().toUpperCase();
        }
        if (body.nameOnPan !== undefined) {
            nextDocuments['documents.pan.name'] = String(body.nameOnPan || '').trim();
        }
        if (body.panImage !== undefined) {
            nextDocuments['documents.pan.image'] = toUrl(body.panImage) || '';
        }
        hasDocumentUpdates = true;
    }
    if (body.gstRegistered !== undefined || body.gstNumber !== undefined || body.gstLegalName !== undefined || body.gstAddress !== undefined || body.gstImage !== undefined) {
        if (body.gstRegistered !== undefined) {
            if (typeof body.gstRegistered === 'boolean') {
                nextDocuments['documents.gst.registered'] = body.gstRegistered;
            } else if (typeof body.gstRegistered === 'string') {
                const normalized = body.gstRegistered.trim().toLowerCase();
                if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
                    nextDocuments['documents.gst.registered'] = true;
                } else if (normalized === 'false' || normalized === '0' || normalized === 'no') {
                    nextDocuments['documents.gst.registered'] = false;
                } else {
                    throw new ValidationError('gstRegistered must be a boolean');
                }
            } else {
                throw new ValidationError('gstRegistered must be a boolean');
            }
        }
        if (body.gstNumber !== undefined) {
            nextDocuments['documents.gst.number'] = String(body.gstNumber || '').trim().toUpperCase();
        }
        if (body.gstLegalName !== undefined) {
            nextDocuments['documents.gst.legalName'] = String(body.gstLegalName || '').trim();
        }
        if (body.gstAddress !== undefined) {
            nextDocuments['documents.gst.address'] = String(body.gstAddress || '').trim();
        }
        if (body.gstImage !== undefined) {
            nextDocuments['documents.gst.image'] = toUrl(body.gstImage) || '';
        }
        hasDocumentUpdates = true;
    }
    if (body.fssaiNumber !== undefined || body.fssaiExpiry !== undefined || body.fssaiImage !== undefined) {
        if (body.fssaiNumber !== undefined) {
            nextDocuments['documents.fssai.number'] = String(body.fssaiNumber || '').trim();
        }
        if (body.fssaiExpiry !== undefined) {
            const rawExpiry = String(body.fssaiExpiry || '').trim();
            if (!rawExpiry) {
                nextDocuments['documents.fssai.expiry'] = null;
            } else {
                const parsedExpiry = new Date(rawExpiry);
                if (Number.isNaN(parsedExpiry.getTime())) {
                    throw new ValidationError('FSSAI expiry date is invalid');
                }
                nextDocuments['documents.fssai.expiry'] = parsedExpiry;
            }
        }
        if (body.fssaiImage !== undefined) {
            nextDocuments['documents.fssai.image'] = toUrl(body.fssaiImage) || '';
        }
        hasDocumentUpdates = true;
    }
    if (hasDocumentUpdates) {
        Object.assign(update, nextDocuments);
    }

    if (!Object.keys(update).length) {
        return getCurrentRestaurantProfile(restaurantId);
    }

    update.status = 'pending';

    try {
        const doc = await FoodRestaurant.findByIdAndUpdate(
            restaurantId,
            {
                $set: update,
                $unset: {
                    approvedAt: 1,
                    rejectedAt: 1,
                    rejectionReason: 1
                }
            },
            {
                new: true,
                runValidators: true,
                projection: [
                    'restaurantName',
                    'cuisines',
                    'location',
                    'addressLine1',
                    'addressLine2',
                    'area',
                    'city',
                    'state',
                    'pincode',
                    'landmark',
                    'ownerName',
                    'ownerEmail',
                    'ownerPhone',
                    'primaryContactNumber',
                'pureVegRestaurant',
                'profileImage',
                'coverImages',
                'menuImages',
                    'openingTime',
                    'closingTime',
                    'openDays',
                    'status',
                    'createdAt',
                    'updatedAt',
                    'documents',
                    'accountNumber',
                    'ifscCode',
                    'accountHolderName',
                    'accountType',
                    'upiId',
                    'upiQrImage',
                    'facilities',
                    'rejectionReason',
                    'rejectedAt',
                    'approvedAt',
                    'rejectionHistory',
                    'adminId'
                ].join(' ')
            }
        ).lean();

        if (currentRestaurant.status !== 'pending') {
            const restaurantNameForNotification =
                update.restaurantName || currentRestaurant.restaurantName || doc?.restaurantName;
            void notifyAdminsAboutRestaurantProfileReview(restaurantId, restaurantNameForNotification);
        }

        // Re-assign highway when location changes (replaces legacy zone tracing)
        if (shouldSyncHighwayAfterUpdate) {
            await assignHighwayToRestaurant(restaurantId);
            const refreshed = await FoodRestaurant.findById(restaurantId)
                .select(
                    [
                        'restaurantName',
                        'cuisines',
                        'location',
                        'addressLine1',
                        'addressLine2',
                        'area',
                        'city',
                        'state',
                        'pincode',
                        'landmark',
                        'ownerName',
                        'ownerEmail',
                        'ownerPhone',
                        'primaryContactNumber',
                        'pureVegRestaurant',
                        'profileImage',
                        'coverImages',
                        'menuImages',
                        'openingTime',
                        'closingTime',
                        'openDays',
                        'status',
                        'createdAt',
                        'updatedAt',
                        'documents',
                        'accountNumber',
                        'ifscCode',
                        'accountHolderName',
                        'accountType',
                        'upiId',
                        'upiQrImage',
                        'highwayName',
                        'highwayRef',
                        'restaurantType',
                        'facilities',
                        'rejectionReason',
                        'rejectedAt',
                        'approvedAt',
                        'rejectionHistory',
                        'adminId'
                    ].join(' ')
                )
                .lean();
            if (refreshed) {
                return toRestaurantProfile(refreshed);
            }
        }

        return toRestaurantProfile(doc);
    } catch (err) {
        if (err && err.code === 11000) {
            throw new ValidationError('A restaurant with this name and phone already exists');
        }
        throw err;
    }
};

export const uploadRestaurantProfileImage = async (restaurantId, file) => {
    if (!restaurantId) throw new ValidationError('Invalid restaurant id');
    if (!file?.buffer) throw new ValidationError('Image file is required');

    const currentRestaurant = await FoodRestaurant.findById(restaurantId)
        .select('restaurantName status')
        .lean();
    if (!currentRestaurant) throw new ValidationError('Restaurant not found');

    const url = await uploadImageBuffer(file.buffer, 'food/restaurants/profile');
    const doc = await FoodRestaurant.findByIdAndUpdate(
        restaurantId,
        {
            $set: {
                profileImage: url,
                status: 'pending'
            },
            $unset: {
                approvedAt: 1,
                rejectedAt: 1,
                rejectionReason: 1
            }
        },
        { new: true, projection: 'profileImage coverImages restaurantName cuisines location menuImages addressLine1 addressLine2 area city state pincode landmark ownerName ownerEmail ownerPhone primaryContactNumber pureVegRestaurant openingTime closingTime openDays status createdAt updatedAt' }
    ).lean();

    if (!doc) throw new ValidationError('Restaurant not found');

    if (currentRestaurant.status !== 'pending') {
        void notifyAdminsAboutRestaurantProfileReview(restaurantId, currentRestaurant.restaurantName || doc.restaurantName);
    }

    return { profileImage: { url } };
};

export const uploadRestaurantMenuImage = async (file) => {
    if (!file?.buffer) throw new ValidationError('Image file is required');
    const url = await uploadImageBuffer(file.buffer, 'food/restaurants/menu');
    return { menuImage: { url, publicId: null } };
};

export const uploadRestaurantCoverImages = async (restaurantId, files = []) => {
    if (!restaurantId) throw new ValidationError('Invalid restaurant id');
    if (!Array.isArray(files) || files.length === 0) {
        throw new ValidationError('At least one image file is required');
    }

    const validFiles = files.filter((file) => file?.buffer);
    if (validFiles.length === 0) {
        throw new ValidationError('At least one valid image file is required');
    }

    const currentRestaurant = await FoodRestaurant.findById(restaurantId)
        .select('restaurantName status profileImage coverImages')
        .lean();
    if (!currentRestaurant) throw new ValidationError('Restaurant not found');

    const uploadedUrls = await Promise.all(
        validFiles.slice(0, 20).map((file) => uploadImageBuffer(file.buffer, 'food/restaurants/cover'))
    );
    const existingCoverImages = Array.isArray(currentRestaurant.coverImages)
        ? currentRestaurant.coverImages.map((image) => toUrl(image)).filter(Boolean)
        : [];
    const nextCoverImages = [...existingCoverImages];

    uploadedUrls.forEach((url) => {
        if (!nextCoverImages.includes(url)) nextCoverImages.push(url);
    });

    const update = {
        coverImages: nextCoverImages.slice(0, 20),
        status: 'pending'
    };

    if (!toUrl(currentRestaurant.profileImage) && uploadedUrls[0]) {
        update.profileImage = uploadedUrls[0];
    }

    await FoodRestaurant.findByIdAndUpdate(
        restaurantId,
        {
            $set: update,
            $unset: {
                approvedAt: 1,
                rejectedAt: 1,
                rejectionReason: 1
            }
        },
        { new: true }
    ).lean();

    if (currentRestaurant.status !== 'pending') {
        void notifyAdminsAboutRestaurantProfileReview(restaurantId, currentRestaurant.restaurantName || '');
    }

    return {
        coverImages: uploadedUrls.map((url) => ({ url, publicId: null })),
        profileImage: update.profileImage ? { url: update.profileImage } : undefined
    };
};

export const uploadRestaurantMenuImages = async (restaurantId, files = []) => {
    if (!restaurantId) throw new ValidationError('Invalid restaurant id');
    if (!Array.isArray(files) || files.length === 0) {
        throw new ValidationError('At least one image file is required');
    }

    const validFiles = files.filter((file) => file?.buffer);
    if (validFiles.length === 0) {
        throw new ValidationError('At least one valid image file is required');
    }

    const currentRestaurant = await FoodRestaurant.findById(restaurantId)
        .select('restaurantName status menuImages')
        .lean();
    if (!currentRestaurant) throw new ValidationError('Restaurant not found');

    const uploadedUrls = await Promise.all(
        validFiles.slice(0, 20).map((file) => uploadImageBuffer(file.buffer, 'food/restaurants/menu'))
    );
    const existingMenuImages = Array.isArray(currentRestaurant.menuImages)
        ? currentRestaurant.menuImages.map((image) => toUrl(image)).filter(Boolean)
        : [];
    const nextMenuImages = [...existingMenuImages];

    uploadedUrls.forEach((url) => {
        if (!nextMenuImages.includes(url)) nextMenuImages.push(url);
    });

    await FoodRestaurant.findByIdAndUpdate(
        restaurantId,
        {
            $set: {
                menuImages: nextMenuImages.slice(0, 20),
                status: 'pending'
            },
            $unset: {
                approvedAt: 1,
                rejectedAt: 1,
                rejectionReason: 1
            }
        },
        { new: true }
    ).lean();

    if (currentRestaurant.status !== 'pending') {
        void notifyAdminsAboutRestaurantProfileReview(restaurantId, currentRestaurant.restaurantName || '');
    }

    return {
        menuImages: uploadedUrls.map((url) => ({ url, publicId: null }))
    };
};

export const getNearbyRestaurantsPipeline = async (lat, lng, queryFilter = {}, options = {}) => {
    const filter = {
        status: 'approved',
        ...queryFilter
    };

    const currentHighwayId = null;

    const pipeline = [];

    const radiusKm = options.radiusKm || 100;
    const includeHighwayRestaurants = options.includeHighwayRestaurants !== false;
    const highwayUnlimitedDistance = options.highwayUnlimitedDistance !== false;

    // Use $geoNear if coordinates are provided
    if (lat !== null && lng !== null) {
        pipeline.push({
            $geoNear: {
                near: { type: 'Point', coordinates: [lng, lat] },
                distanceField: 'distanceMeters',
                spherical: true,
                key: 'location',
                query: filter
            }
        });

        // Filter: Within radiusKm OR on the user's highway (only if highwayUnlimitedDistance is true)
        const matchConditions = [
            { distanceMeters: { $lte: radiusKm * 1000 } }
        ];
        pipeline.push({
            $match: {
                $or: matchConditions
            }
        });

        // Add fields for highway priority sorting and distance formatting
        pipeline.push({
            $addFields: {
                isOnCurrentHighway: 0,
                distanceInKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
                distance: {
                    $cond: [
                        { $gte: ['$distanceMeters', 1000] },
                        { $concat: [{ $toString: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] } }, ' km'] },
                        { $concat: [{ $toString: { $round: ['$distanceMeters', 0] } }, ' m'] }
                    ]
                }
            }
        });

        // Sort Stage: Current highway restaurants first, then by nearest distance, then highest rated, then createdAt
        pipeline.push({
            $sort: {
                isOnCurrentHighway: -1,
                distanceMeters: 1,
                rating: -1,
                createdAt: -1
            }
        });
    } else {
        pipeline.push({ $match: filter });

        // Sort Stage without location/distance
        pipeline.push({
            $sort: {
                rating: -1,
                createdAt: -1
            }
        });
    }

    return { pipeline, currentHighwayId };
};

export const listApprovedRestaurants = async (query = {}) => {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { status: 'approved' };

    const lat = toFiniteNumber(query.overrideLat ?? query.lat);
    const lng = toFiniteNumber(query.overrideLng ?? query.lng);

    // Only apply city, area filters if coordinates are NOT provided (legacy fallback)
    if (lat === null || lng === null) {
        if (query.city && String(query.city).trim()) {
            const city = String(query.city).trim().slice(0, 80);
            const rx = { $regex: escapeRegex(city), $options: 'i' };
            filter.$and = [...(filter.$and || []), { $or: [{ 'location.city': rx }, { city: rx }] }];
        }
        if (query.area && String(query.area).trim()) {
            const area = String(query.area).trim().slice(0, 80);
            const rx = { $regex: escapeRegex(area), $options: 'i' };
            filter.$and = [...(filter.$and || []), { $or: [{ 'location.area': rx }, { area: rx }] }];
        }
    }

    if (query.cuisine && String(query.cuisine).trim()) {
        const cuisine = normalizeCuisine(query.cuisine);
        filter.cuisines = { $in: [new RegExp(escapeRegex(cuisine), 'i')] };
    }
    if (query.hasOffers === 'true') {
        filter.offer = { $exists: true, $ne: null, $ne: '' };
    }
    const minRating = toFiniteNumber(query.minRating);
    if (minRating !== null) {
        filter.rating = { $gte: Math.max(0, Math.min(5, minRating)) };
    }

    const maxPrice = toFiniteNumber(query.maxPrice);
    if (maxPrice !== null) {
        filter.featuredPrice = { $lte: Math.max(0, maxPrice) };
    }
    if (query.topRated === 'true') {
        filter.rating = { ...(filter.rating || {}), $gte: 4.5 };
    }
    if (query.trusted === 'true') {
        filter.totalRatings = { ...(filter.totalRatings || {}), $gte: 100 };
    }
    if (query.search && String(query.search).trim()) {
        const raw = String(query.search).trim().slice(0, 80);
        const term = escapeRegex(raw);
        if (term.length >= 2) {
            filter.$or = [
                { restaurantName: { $regex: term, $options: 'i' } },
                { area: { $regex: term, $options: 'i' } },
                { city: { $regex: term, $options: 'i' } },
                { 'location.area': { $regex: term, $options: 'i' } },
                { 'location.city': { $regex: term, $options: 'i' } },
                { cuisines: { $in: [new RegExp(term, 'i')] } }
            ];
        }
    }


    const sortBy = parseSortBy(query.sortBy);

    // Call the shared helper function
    const { pipeline } = await getNearbyRestaurantsPipeline(lat, lng, filter, {
        radiusKm: DISCOVERY_RADIUS_KM
    });

    const projection = {
        restaurantName: 1,
        area: 1,
        city: 1,
        cuisines: 1,
        profileImage: 1,
        coverImages: 1,
        menuImages: 1,
        offer: 1,
        featuredDish: 1,
        featuredPrice: 1,
        rating: 1,
        totalRatings: 1,
        isAcceptingOrders: 1,
        status: 1,
        pureVegRestaurant: 1,
        createdAt: 1,
        facilities: 1,
        location: 1,
        distance: 1,
        distanceInKm: 1,
        openingTime: 1,
        closingTime: 1,
        openDays: 1,
        takeawaySettings: 1,
        outletTimings: { $arrayElemAt: ['$outletTimingsData.timings', 0] }
    };

    // Custom Sorting override if coordinates are NOT provided but sortBy is set
    if (lat === null || lng === null) {
        if (sortBy === 'rating' || sortBy === 'rating-high') {
            pipeline.push({ $sort: { rating: -1, createdAt: -1 } });
        } else if (sortBy === 'rating-low') {
            pipeline.push({ $sort: { rating: 1, createdAt: -1 } });
        } else if (sortBy === 'price-low') {
            pipeline.push({ $sort: { featuredPrice: 1, createdAt: -1 } });
        } else if (sortBy === 'price-high') {
            pipeline.push({ $sort: { featuredPrice: -1, createdAt: -1 } });
        }
    }

    // Final Facet for Pagination - perform lookup and projection ONLY on paginated slice
    pipeline.push({
        $facet: {
            metadata: [{ $count: 'total' }],
            data: [
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'food_restaurant_outlet_timings',
                        localField: '_id',
                        foreignField: 'restaurantId',
                        as: 'outletTimingsData'
                    }
                },
                { $project: projection }
            ]
        }
    });

    const aggregationResult = await FoodRestaurant.aggregate(pipeline);
    const pageDocs = aggregationResult[0]?.data || [];
    const total = aggregationResult[0]?.metadata[0]?.total || 0;

    if (pageDocs.length === 0) {
        return {
            restaurants: [],
            total,
            totalCount: total,
            page,
            limit,
            hasMore: false
        };
    }

    // Attach recommended dishes and compute hasVegItems
    const restaurantIds = pageDocs.map(r => r._id);
    const [allRecommended, vegRestaurantIds] = await Promise.all([
        FoodItem.find({
            restaurantId: { $in: restaurantIds },
            isRecommended: true,
            isAvailable: true,
            approvalStatus: 'approved'
        }).select('restaurantId name price image foodType variants variations').lean(),
        FoodItem.distinct('restaurantId', {
            restaurantId: { $in: restaurantIds },
            approvalStatus: 'approved',
            isAvailable: { $ne: false },
            $or: [
                { isVeg: true },
                { foodType: { $in: ['Veg', 'veg', 'VEG'] } }
            ]
        })
    ]);

    const vegSet = new Set(vegRestaurantIds.map(id => String(id)));

    const recommendedMap = allRecommended.reduce((acc, item) => {
        const rid = String(item.restaurantId);
        if (!acc[rid]) acc[rid] = [];
        acc[rid].push({
            id: String(item._id),
            name: item.name,
            price: getFoodDisplayPrice(item),
            image: item.image,
            foodType: item.foodType
        });
        return acc;
    }, {});

    const restaurants = pageDocs.map(r => ({
        ...r,
        restaurantId: r._id,
        id: r._id,
        name: r.restaurantName || '',
        rating: normalizeRatingValue(r.rating),
        totalRatings: normalizeTotalRatingsValue(r.totalRatings),
        facilities: r.facilities ? {
            parking: getFacilityAvailability(r.facilities, 'parking'),
            wifi: getFacilityAvailability(r.facilities, 'wifi'),
            familyFriendly: getFacilityAvailability(r.facilities, 'familyFriendly'),
            evCharging: getFacilityAvailability(r.facilities, 'evCharging'),
            washroom: getFacilityAvailability(r.facilities, 'washroom')
        } : null,
        profileImage: r.profileImage ? { url: r.profileImage } : null,
        coverImages: Array.isArray(r.coverImages) ? r.coverImages : [],
        openingTime: r.openingTime || null,
        closingTime: r.closingTime || null,
        openDays: Array.isArray(r.openDays) ? r.openDays : [],
        menuImages: Array.isArray(r.menuImages) ? r.menuImages : [],
        recommendedDishes: recommendedMap[String(r._id)] || [],
        hasVegItems: r.pureVegRestaurant === true || vegSet.has(String(r._id))
    }));

    return {
        restaurants,
        total,
        totalCount: total,
        page,
        limit,
        hasMore: (page * limit) < total
    };
};

export const getApprovedRestaurantByIdOrSlug = async (idOrSlug, userId = null) => {
    const value = String(idOrSlug || '').trim();
    if (!value) return null;

    let doc = null;
    // ObjectId path
    if (/^[0-9a-fA-F]{24}$/.test(value)) {
        doc = await FoodRestaurant.findOne({ _id: value, status: 'approved' }).lean();
    } else {
        // Slug path
        const restaurantNameNormalized = normalizeName(value);
        if (restaurantNameNormalized) {
            doc = await FoodRestaurant.findOne({
                status: 'approved',
                restaurantNameNormalized
            }).lean();
        }
    }

    if (!doc) return null;

    // Enhance with personalization if userId exists
    let hasOrderedBefore = false;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const previousOrder = await FoodOrder.findOne({
            userId,
            restaurantId: doc._id,
            orderStatus: 'delivered'
        }).select('_id').lean();
        hasOrderedBefore = !!previousOrder;
    }

    let reviewsList = [];
    try {
        const reviewsDocs = await FoodOrder.find({
            restaurantId: doc._id,
            'ratings.restaurant.rating': { $exists: true, $ne: null }
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('userId', 'name profileImage')
        .lean();

        reviewsList = reviewsDocs.map(r => ({
            id: r._id.toString(),
            orderId: r.orderId || r._id.toString(),
            customerName: r.userId?.name || 'Customer',
            customerImage: r.userId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.userId?.name || 'Customer')}&background=random`,
            rating: r.ratings?.restaurant?.rating || 0,
            comment: r.ratings?.restaurant?.comment || '',
            date: r.ratings?.restaurant?.ratedAt || r.createdAt || new Date(),
            parking: r.ratings?.parking || null,
            wifi: r.ratings?.wifi || null,
            familyFriendly: r.ratings?.familyFriendly || null,
            evCharging: r.ratings?.evCharging || null,
            washroom: r.ratings?.washroom || null,
        }));
    } catch (err) {
        console.error('Error fetching restaurant reviews in getApprovedRestaurantByIdOrSlug:', err);
    }

    const hasVegDishes = doc.pureVegRestaurant === true || !!(await FoodItem.exists({
        restaurantId: doc._id,
        approvalStatus: 'approved',
        isAvailable: { $ne: false },
        $or: [
            { isVeg: true },
            { foodType: 'Veg' },
            { foodType: { $regex: /^veg$/i } }
        ]
    }));

    return {
        ...doc,
        rating: normalizeRatingValue(doc.rating),
        totalRatings: normalizeTotalRatingsValue(doc.totalRatings),
        hasOrderedBefore,
        reviewsList,
        hasVegItems: hasVegDishes
    };
};

export const listPublicOffers = async () => {
    const now = new Date();
    const filter = {
        status: 'active',
        $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gt: now } }] }
        ]
    };

    const list = await FoodOffer.find(filter)
        .sort({ createdAt: -1 })
        .lean();

    const allOffers = list.map((o) => {
        const restaurant = o.restaurantId && typeof o.restaurantId === 'object' ? o.restaurantId : null;
        const restaurantSlug = restaurant?.restaurantNameNormalized || undefined;
        const restaurantName =
            o.restaurantScope === 'selected'
                ? (restaurant?.restaurantName || 'Selected Restaurant')
                : 'All Restaurants';

        const title =
            o.discountType === 'percentage'
                ? `${Number(o.discountValue) || 0}% OFF`
                : `Flat ₹${Number(o.discountValue) || 0} OFF`;

        return {
            id: String(o._id),
            offerId: String(o._id),
            couponCode: o.couponCode,
            title,
            discountType: o.discountType,
            discountValue: o.discountValue,
            maxDiscount: o.maxDiscount ?? null,
            customerScope: o.customerScope,
            restaurantScope: o.restaurantScope,
            restaurantId: restaurant?._id ? String(restaurant._id) : (o.restaurantScope === 'selected' ? String(o.restaurantId) : null),
            restaurantName,
            restaurantSlug,
            restaurantImage: restaurant?.profileImage || null,
            restaurantRating: typeof restaurant?.rating === 'number' ? restaurant.rating : 0,
            endDate: o.endDate || null,
            showInCart: o.showInCart !== false,
            minOrderValue: o.minOrderValue ?? 0
        };
    });

    return { allOffers, groupedByOffer: {} };
};

/**
 * List complaints for a restaurant.
 * Calls adminService.getRestaurantComplaints with fixed restaurantId.
 */
export const getRestaurantComplaints = async (restaurantId, query = {}) => {
    const { getRestaurantComplaints: getComplaintsInternal } = await import('../../admin/services/admin.service.js');
    return getComplaintsInternal({ ...query, restaurantId });
};

/**
 * List restaurants that have at least one approved, available dish under a price limit (e.g. ₹250).
 * This collapses 50+ frontend requests into ONE optimized backend call.
 */
export const listRestaurantsUnderPriceLimit = async (query = {}, priceLimit = 250) => {
    const lat = query.lat ? parseFloat(query.lat) : null;
    const lng = query.lng ? parseFloat(query.lng) : null;

    const refLat = lat !== null ? lat : 22.7196;
    const refLng = lng !== null ? lng : 75.8577;

    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { status: 'approved' };

    if (query.pureVeg === 'true' || query.vegModeOption === 'pure-veg') {
        filter.pureVegRestaurant = true;
    }

    // Apply search and cuisine options inside the 50 KM radius
    if (query.cuisine && String(query.cuisine).trim()) {
        const cuisine = String(query.cuisine).trim();
        filter.cuisines = { $in: [new RegExp(escapeRegex(cuisine), 'i')] };
    }
    if (query.search && String(query.search).trim()) {
        const raw = String(query.search).trim().slice(0, 80);
        const term = escapeRegex(raw);
        if (term.length >= 2) {
            filter.$or = [
                { restaurantName: { $regex: term, $options: 'i' } },
                { area: { $regex: term, $options: 'i' } },
                { city: { $regex: term, $options: 'i' } },
                { 'location.area': { $regex: term, $options: 'i' } },
                { 'location.city': { $regex: term, $options: 'i' } },
                { cuisines: { $in: [new RegExp(term, 'i')] } }
            ];
        }
    }

    const { pipeline } = await getNearbyRestaurantsPipeline(refLat, refLng, filter, {
        radiusKm: UNDER250_RADIUS_KM,
        includeHighwayRestaurants: true,
        highwayUnlimitedDistance: false
    });

    const restaurantsInZone = await FoodRestaurant.aggregate(pipeline);

    // Remove duplicates
    const seen = new Set();
    const uniqueRestaurantsInZone = restaurantsInZone.filter(r => {
        const idStr = String(r._id);
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
    });

    if (uniqueRestaurantsInZone.length === 0) {
        return { restaurants: [], total: 0, hasMore: false, page, limit };
    }

    const restaurantIds = uniqueRestaurantsInZone.map(r => r._id);

    const itemFilter = {
        restaurantId: { $in: restaurantIds },
        price: { $lte: priceLimit },
        isAvailable: true,
        approvalStatus: 'approved'
    };

    if (query.isVeg === 'true' || query.isVeg === true) {
        itemFilter.$or = [
            { isVeg: true },
            { foodType: 'Veg' },
            { foodType: { $regex: /^veg$/i } }
        ];
    }

    // 2. Fetch only the eligible food items for these specific restaurants
    const eligibleItems = await FoodItem.find(itemFilter)
        .select('restaurantId name price image foodType description isVeg isRecommended')
        .lean();

    if (eligibleItems.length === 0) {
        return { restaurants: [], total: 0, hasMore: false, page, limit };
    }

    // Map items to their restaurants
    const restaurantItemsMap = {};
    eligibleItems.forEach(item => {
        const rid = String(item.restaurantId);
        if (!restaurantItemsMap[rid]) restaurantItemsMap[rid] = [];
        restaurantItemsMap[rid].push({
            ...item,
            id: String(item._id),
            isVeg: item.isVeg ?? (String(item.foodType || '').toLowerCase().includes('veg') && !String(item.foodType || '').toLowerCase().includes('non'))
        });
    });

    // 3. Filter restaurants that actually have eligible items
    const eligibleRestaurants = uniqueRestaurantsInZone.filter(r => {
        const rid = String(r._id);
        return restaurantItemsMap[rid] && restaurantItemsMap[rid].length > 0;
    });

    if (eligibleRestaurants.length === 0) {
        return { restaurants: [], total: 0, hasMore: false, page, limit };
    }

    // 4. Fetch outlet timings only for the eligible restaurants
    const outletTimingsRaw = await FoodRestaurantOutletTimings.find({
        restaurantId: { $in: eligibleRestaurants.map(r => r._id) }
    }).lean();

    const timingsMap = {};
    outletTimingsRaw.forEach(t => {
        timingsMap[String(t.restaurantId)] = t.timings || [];
    });

    // 5. Assemble final list
    const restaurants = eligibleRestaurants.map(r => {
        const rid = String(r._id);
        const items = restaurantItemsMap[rid] || [];
        const timings = timingsMap[rid] || [];

        return {
            ...r,
            id: rid,
            restaurantId: rid,
            name: r.restaurantName,
            menuItems: items,
            outletTimings: { timings },
            distanceInKm: r.distanceInKm || 0,
            distanceKm: r.distanceInKm || 0,
            hasVegItems: r.pureVegRestaurant === true || items.some(item => item.isVeg)
        };
    });

    const paginatedRestaurants = restaurants.slice(skip, skip + limit);

    return {
        restaurants: paginatedRestaurants,
        total: restaurants.length,
        hasMore: skip + limit < restaurants.length,
        page,
        limit
    };
};

