import express from 'express';
import { resolveMapsLinkController } from '../controllers/location.controller.js';

const router = express.Router();

router.post('/resolve-maps-link', resolveMapsLinkController);

export default router;
