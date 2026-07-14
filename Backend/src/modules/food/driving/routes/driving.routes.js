import express from 'express';
import { getPublicDrivingModeSettingsController, getRestaurantsAheadController } from '../controllers/driving.controller.js';

const router = express.Router();

router.get('/settings', getPublicDrivingModeSettingsController);
router.get('/restaurants', getRestaurantsAheadController);

export default router;
