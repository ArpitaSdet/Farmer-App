import { Router } from 'express';
import {
  getCategories,
  getProducts,
  getProductById,
  getMachines,
  getMachineById,
  getBanners,
  getPosters,
  getHomeFeed,
} from '../controllers/catalogController';

export const catalogRoutes = Router();

catalogRoutes.get('/home-feed', getHomeFeed);
catalogRoutes.get('/home', getHomeFeed);
catalogRoutes.get('/categories', getCategories);
catalogRoutes.get('/products/featured', (req, res, next) => {
  req.query.limit = '6';
  return getProducts(req, res, next);
});
catalogRoutes.get('/products', getProducts);
catalogRoutes.get('/products/:id', getProductById);
catalogRoutes.get('/machines/nearby', (req, res, next) => {
  req.query.limit = '6';
  return getMachines(req, res, next);
});
catalogRoutes.get('/machines', getMachines);
catalogRoutes.get('/machines/:id', getMachineById);
catalogRoutes.get('/banners', getBanners);
catalogRoutes.get('/posters', getPosters);
