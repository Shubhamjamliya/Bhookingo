import express from 'express';
import { getPublicDrivingModeSettingsController, getRestaurantsAheadController, getGoogleRouteHighwayController } from '../controllers/driving.controller.js';

const router = express.Router();

router.get('/settings', getPublicDrivingModeSettingsController);
router.get('/restaurants', getRestaurantsAheadController);
router.post('/restaurants', getRestaurantsAheadController);
router.get('/google-route-highway', getGoogleRouteHighwayController);

export default router;
