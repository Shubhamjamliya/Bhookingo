import express from 'express';
import { getPublicDrivingModeSettingsController, getRestaurantsAheadController, getConnectingHighwaysController, getGoogleRouteHighwayController } from '../controllers/driving.controller.js';

const router = express.Router();

router.get('/settings', getPublicDrivingModeSettingsController);
router.get('/restaurants', getRestaurantsAheadController);
router.post('/restaurants', getRestaurantsAheadController);
router.get('/connecting-highways', getConnectingHighwaysController);
router.get('/google-route-highway', getGoogleRouteHighwayController);

export default router;
