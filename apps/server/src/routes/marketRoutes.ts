import { Router } from 'express';
import { marketService } from '../services/marketService';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const district = (req.query.district as string) || 'Dharwad';
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    const data = await marketService.getMarketData(district, lat, lng);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export const marketRoutes = router;
