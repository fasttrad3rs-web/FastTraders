import { Router } from 'express';
import adminRoutes from './admin';
import authRoutes from './auth.routes';
import brandRoutes from './brand.routes';
import categoryRoutes from './category.routes';
import healthRoutes from './health.routes';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';
import quotationRoutes from './quotation.routes';
import reviewRoutes from './review.routes';
import searchRoutes from './search.routes';
import { createCartRouter } from './cart.routes';
import { bannerRouter, contactRouter, newsletterRouter, settingsRouter } from './misc.routes';

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

/* ------------------------------ Dual carts ------------------------------- */
router.use('/cart', createCartRouter('shopping'));
router.use('/inquiry', createCartRouter('inquiry'));

/* ------------------------------- Commerce -------------------------------- */
router.use('/orders', orderRoutes);
router.use('/quotations', quotationRoutes);
router.use('/reviews', reviewRoutes);

/* --------------------------------- Misc ---------------------------------- */
router.use('/contact', contactRouter);
router.use('/newsletter', newsletterRouter);
router.use('/settings', settingsRouter);
router.use('/banners', bannerRouter);

/* --------------------------------- Admin --------------------------------- */
// Guarded inside: protect + restrictTo('admin', 'manager').
router.use('/admin', adminRoutes);

export default router;
