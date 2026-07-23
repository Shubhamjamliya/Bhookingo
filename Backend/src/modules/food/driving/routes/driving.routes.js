import express from 'express';
import { getPublicDrivingModeSettingsController, getRestaurantsAheadController, getConnectingHighwaysController } from '../controllers/driving.controller.js';

const router = express.Router();

router.get('/settings', getPublicDrivingModeSettingsController);
router.get('/restaurants', getRestaurantsAheadController);
router.get('/connecting-highways', getConnectingHighwaysController);

export default router;
