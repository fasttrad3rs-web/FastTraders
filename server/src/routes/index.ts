import { Router } from 'express';
import adminRoutes from './admin';
import authRoutes from './auth.routes';
import brandRoutes from './brand.routes';
import categoryRoutes from './category.routes';
import healthRoutes from './health.routes';
import productRoutes from './product.routes';
import inquiryRoutes from './inquiry.routes';
import inquiryListRoutes from './inquiry-list.routes';
import testimonialRoutes from './testimonial.routes';
import searchRoutes from './search.routes';
import {
  bannerRouter,
  contactRouter,
  formTokenRouter,
  newsletterRouter,
  settingsRouter,
} from './misc.routes';

/** `/api/v1` router. */
const router: Router = Router();

router.use('/health', healthRoutes);

/* --------------------------------- Auth ---------------------------------- */
router.use('/auth', authRoutes);

/* ------------------------------- Catalogue ------------------------------- */
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/search', searchRoutes);

/* ------------------------------- Inquiries ------------------------------- */
// The shortlist and the inquiry are the entire conversion path.
router.use('/inquiry-list', inquiryListRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/testimonials', testimonialRoutes);

/* --------------------------------- Misc ---------------------------------- */
router.use('/form-token', formTokenRouter);
router.use('/contact', contactRouter);
router.use('/newsletter', newsletterRouter);
router.use('/settings', settingsRouter);
router.use('/banners', bannerRouter);

/* --------------------------------- Admin --------------------------------- */
// Guarded inside: protect + restrictTo('admin', 'manager').
router.use('/admin', adminRoutes);

export default router;
