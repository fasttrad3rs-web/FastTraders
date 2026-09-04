import { Router } from 'express';
import { protect, restrictTo } from '../../middleware';
import productRoutes from './product.routes';
import inquiryRoutes from './inquiry.routes';
import testimonialRoutes from './testimonial.routes';
import userRoutes from './user.routes';
import { bannerRouter, brandRouter, categoryRouter } from './taxonomy.routes';
import {
  auditRouter,
  contactRouter,
  dashboardRouter,
  newsletterRouter,
  reportRouter,
  settingsRouter,
} from './content.routes';

/**
 * `/api/v1/admin`
 *
 * One guard covers the whole surface: every route below requires a valid
 * access token belonging to an `admin` or `manager`. A handful of destructive
 * operations narrow further to `admin` at their own route.
 */
const router: Router = Router();

router.use(protect, restrictTo('admin', 'manager'));

router.use('/dashboard', dashboardRouter);

router.use('/products', productRoutes);
router.use('/categories', categoryRouter);
router.use('/brands', brandRouter);
router.use('/banners', bannerRouter);

router.use('/inquiries', inquiryRoutes);
router.use('/users', userRoutes);

router.use('/testimonials', testimonialRoutes);
router.use('/settings', settingsRouter);
router.use('/contacts', contactRouter);
router.use('/newsletter', newsletterRouter);
router.use('/audit-logs', auditRouter);
router.use('/reports', reportRouter);

export default router;
