# Fast Traders — Phase 4 source dump

> **Superseded.** This document describes the site before the catalogue-only
> pivot — it still refers to prices, carts, checkout, payments, orders or
> customer accounts, none of which exist any more. Kept as build history.
> See [`CATALOG-PIVOT.md`](./CATALOG-PIVOT.md) for the current model.

Every admin route, controller, service, validator and the PDF generator.
Total files: 34

---

## `server/src/routes/admin/content.routes.ts`

```ts
import { Router } from 'express';
import * as content from '../../controllers/admin/content.controller';
import * as dashboard from '../../controllers/admin/dashboard.controller';
import { restrictTo, validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  auditQuerySchema,
  contactQuerySchema,
  dashboardChartQuerySchema,
  idParamSchema,
  newsletterQuerySchema,
  reportQuerySchema,
  updateContactSchema,
  updateSettingsSchema,
} from '../../validators';

/* -------------------------------- Dashboard ------------------------------ */

export const dashboardRouter: Router = Router();
dashboardRouter.get('/stats', asyncHandler(dashboard.getStats));
dashboardRouter.get(
  '/charts',
  validate({ query: dashboardChartQuerySchema }),
  asyncHandler(dashboard.getCharts),
);
dashboardRouter.get('/recent', asyncHandler(dashboard.getRecent));

/* -------------------------------- Settings ------------------------------- */

export const settingsRouter: Router = Router();
settingsRouter.get('/', asyncHandler(content.getSettings));
/** Only an admin may rewrite store configuration and bank details. */
settingsRouter.patch(
  '/',
  restrictTo('admin'),
  validate({ body: updateSettingsSchema }),
  asyncHandler(content.updateSettings),
);

/* -------------------------------- Contacts ------------------------------- */

export const contactRouter: Router = Router();
contactRouter.get('/', validate({ query: contactQuerySchema }), asyncHandler(content.listContacts));
contactRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateContactSchema }),
  asyncHandler(content.updateContactStatus),
);

/* ------------------------------- Newsletter ------------------------------ */

export const newsletterRouter: Router = Router();
newsletterRouter.get('/export', asyncHandler(content.exportSubscribers));
newsletterRouter.get(
  '/',
  validate({ query: newsletterQuerySchema }),
  asyncHandler(content.listSubscribers),
);

/* ------------------------------- Audit logs ------------------------------ */

export const auditRouter: Router = Router();
auditRouter.get('/', validate({ query: auditQuerySchema }), asyncHandler(content.listAuditLogs));

/* -------------------------------- Reports -------------------------------- */

export const reportRouter: Router = Router();
reportRouter.get('/', validate({ query: reportQuerySchema }), asyncHandler(content.getReport));
```

## `server/src/routes/admin/index.ts`

```ts
import { Router } from 'express';
import { protect, restrictTo } from '../../middleware';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';
import quotationRoutes from './quotation.routes';
import reviewRoutes from './review.routes';
import userRoutes from './user.routes';
import { bannerRouter, brandRouter, categoryRouter, couponRouter } from './taxonomy.routes';
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
router.use('/coupons', couponRouter);

router.use('/orders', orderRoutes);
router.use('/quotations', quotationRoutes);
router.use('/users', userRoutes);

router.use('/reviews', reviewRoutes);
router.use('/settings', settingsRouter);
router.use('/contacts', contactRouter);
router.use('/newsletter', newsletterRouter);
router.use('/audit-logs', auditRouter);
router.use('/reports', reportRouter);

export default router;
```

## `server/src/routes/admin/order.routes.ts`

```ts
import { Router } from 'express';
import * as orders from '../../controllers/admin/order.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminOrderQuerySchema,
  idParamSchema,
  updateOrderStatusSchema,
  updatePaymentSchema,
  updateTrackingSchema,
} from '../../validators';

const router: Router = Router();

router.get('/export', asyncHandler(orders.exportOrders));

router.get('/', validate({ query: adminOrderQuerySchema }), asyncHandler(orders.listOrders));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(orders.getOrder));

/** Renders the PDF invoice on the Fast Traders letterhead. */
router.get('/:id/invoice', validate({ params: idParamSchema }), asyncHandler(orders.downloadInvoice));

router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateOrderStatusSchema }),
  asyncHandler(orders.updateStatus),
);
router.patch(
  '/:id/payment',
  validate({ params: idParamSchema, body: updatePaymentSchema }),
  asyncHandler(orders.updatePayment),
);
router.patch(
  '/:id/tracking',
  validate({ params: idParamSchema, body: updateTrackingSchema }),
  asyncHandler(orders.updateTracking),
);

export default router;
```

## `server/src/routes/admin/product.routes.ts`

```ts
import { Router } from 'express';
import * as products from '../../controllers/admin/product.controller';
import * as media from '../../controllers/admin/product.media.controller';
import { mediaUpload, uploadProductImages, validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminProductQuerySchema,
  bulkProductSchema,
  createProductSchema,
  exportQuerySchema,
  idParamSchema,
  imageParamSchema,
  stockAdjustmentSchema,
  updateProductSchema,
} from '../../validators';

const router: Router = Router();

/* Static paths are declared before `/:id` so they are not shadowed. */

router.get('/export', validate({ query: exportQuerySchema }), asyncHandler(media.exportToSheet));

router.post(
  '/import',
  // Accepts CSV and XLSX; `?dryRun=true` returns the report without writing.
  mediaUpload.single('file'),
  asyncHandler(media.importFromSheet),
);

router.post('/bulk', validate({ body: bulkProductSchema }), asyncHandler(products.bulkUpdate));

router.get('/', validate({ query: adminProductQuerySchema }), asyncHandler(products.listProducts));
router.post('/', validate({ body: createProductSchema }), asyncHandler(products.createProduct));

router.get('/:id', validate({ params: idParamSchema }), asyncHandler(products.getProduct));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(products.updateProduct),
);
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(products.deleteProduct));

router.patch(
  '/:id/stock',
  validate({ params: idParamSchema, body: stockAdjustmentSchema }),
  asyncHandler(products.adjustStock),
);

router.post(
  '/:id/images',
  validate({ params: idParamSchema }),
  uploadProductImages,
  asyncHandler(media.uploadImages),
);
router.delete(
  '/:id/images/:publicId',
  validate({ params: imageParamSchema }),
  asyncHandler(media.removeImage),
);

export default router;
```

## `server/src/routes/admin/quotation.routes.ts`

```ts
import { Router } from 'express';
import * as quotations from '../../controllers/admin/quotation.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminQuotationQuerySchema,
  assignQuotationSchema,
  convertQuotationSchema,
  idParamSchema,
  priceQuotationSchema,
} from '../../validators';

const router: Router = Router();

router.get('/', validate({ query: adminQuotationQuerySchema }), asyncHandler(quotations.listQuotations));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(quotations.getQuotation));

/** Set per-line prices, validity and notes. */
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: priceQuotationSchema }),
  asyncHandler(quotations.priceQuotation),
);

router.get(
  '/:id/pdf',
  validate({ params: idParamSchema }),
  asyncHandler(quotations.downloadQuotationPdf),
);

/** Emails the formal PDF quotation to the customer. */
router.post('/:id/send', validate({ params: idParamSchema }), asyncHandler(quotations.sendQuotation));

router.post(
  '/:id/convert',
  validate({ params: idParamSchema, body: convertQuotationSchema }),
  asyncHandler(quotations.convertQuotation),
);

router.patch(
  '/:id/assign',
  validate({ params: idParamSchema, body: assignQuotationSchema }),
  asyncHandler(quotations.assignQuotation),
);

export default router;
```

## `server/src/routes/admin/review.routes.ts`

```ts
import { Router } from 'express';
import * as reviews from '../../controllers/review.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { approveReviewSchema, idParamSchema, reviewQuerySchema } from '../../validators';

/**
 * Moderation queue. The handlers are shared with the public review controller;
 * mounting them here means the caller is always staff, so `includePending`
 * resolves to the full list.
 */
const router: Router = Router();

router.get('/', validate({ query: reviewQuerySchema }), asyncHandler(reviews.listReviews));

router.patch(
  '/:id/approval',
  validate({ params: idParamSchema, body: approveReviewSchema }),
  asyncHandler(reviews.setReviewApproval),
);

router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(reviews.deleteReview));

export default router;
```

## `server/src/routes/admin/taxonomy.routes.ts`

```ts
import { Router } from 'express';
import {
  bannerAdmin,
  brandAdmin,
  categoryAdmin,
  couponAdmin,
  type CrudController,
} from '../../controllers/admin/taxonomy.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createBannerSchema,
  createBrandSchema,
  createCategorySchema,
  createCouponSchema,
  idParamSchema,
  reorderSchema,
  taxonomyQuerySchema,
  updateBannerSchema,
  updateBrandSchema,
  updateCategorySchema,
  updateCouponSchema,
} from '../../validators';
import type { AnyZodObject, ZodTypeAny } from 'zod';

/**
 * Categories, brands, banners and coupons all expose the same admin surface,
 * so one router factory covers the four of them.
 */
function crudRouter(
  controller: CrudController,
  schemas: { create: ZodTypeAny; update: ZodTypeAny; query?: AnyZodObject },
): Router {
  const router: Router = Router();

  // `/reorder` first — it must not be captured by `/:id`.
  router.patch('/reorder', validate({ body: reorderSchema }), asyncHandler(controller.reorder));

  router.get('/', ...(schemas.query ? [validate({ query: schemas.query })] : []), asyncHandler(controller.list));
  router.post('/', validate({ body: schemas.create }), asyncHandler(controller.create));

  router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.get));
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: schemas.update }),
    asyncHandler(controller.update),
  );
  router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.remove));

  return router;
}

export const categoryRouter = crudRouter(categoryAdmin, {
  create: createCategorySchema,
  update: updateCategorySchema,
  query: taxonomyQuerySchema,
});

export const brandRouter = crudRouter(brandAdmin, {
  create: createBrandSchema,
  update: updateBrandSchema,
  query: taxonomyQuerySchema,
});

export const bannerRouter = crudRouter(bannerAdmin, {
  create: createBannerSchema,
  update: updateBannerSchema,
  query: taxonomyQuerySchema,
});

export const couponRouter = crudRouter(couponAdmin, {
  create: createCouponSchema,
  update: updateCouponSchema,
  query: taxonomyQuerySchema,
});
```

## `server/src/routes/admin/user.routes.ts`

```ts
import { Router } from 'express';
import * as users from '../../controllers/admin/user.controller';
import { restrictTo, validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminUserQuerySchema,
  idParamSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../../validators';

const router: Router = Router();

router.get('/', validate({ query: adminUserQuerySchema }), asyncHandler(users.listUsers));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(users.getUser));

/** Privilege changes are admin-only — a manager cannot promote anyone. */
router.patch(
  '/:id/role',
  restrictTo('admin'),
  validate({ params: idParamSchema, body: updateUserRoleSchema }),
  asyncHandler(users.updateRole),
);

router.patch(
  '/:id/status',
  restrictTo('admin'),
  validate({ params: idParamSchema, body: updateUserStatusSchema }),
  asyncHandler(users.updateStatus),
);

export default router;
```

## `server/src/controllers/admin/content.controller.ts`

```ts
import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { AuditLog, Contact, Newsletter, Setting, type IAuditLog, type IContact } from '../../models';
import { recordAudit } from '../../services/audit.service';
import * as reports from '../../services/report.service';
import { buildSheet, buildWorkbook } from '../../services/sheet.service';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type { ReportQuery, UpdateSettingsInput } from '../../validators';

/** Settings, enquiries, subscribers, the audit trail and reports. */

/* -------------------------------- Settings ------------------------------- */

export async function getSettings(_req: Request, res: Response): Promise<void> {
  // Admins see everything, including bank details.
  const settings = await Setting.findOne({ key: 'global' }).lean();
  sendSuccess(res, settings, settings ? 'Site settings' : 'Settings have not been created yet');
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateSettingsInput;

  const before = await Setting.findOne({ key: 'global' }).lean();

  // Upsert keeps the singleton invariant even on a fresh database.
  const settings = await Setting.findOneAndUpdate(
    { key: 'global' },
    { $set: input, $setOnInsert: { key: 'global' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  recordAudit({
    req,
    action: 'update',
    entity: 'Setting',
    entityId: 'global',
    before: before ?? undefined,
    after: input,
  });

  sendSuccess(res, settings, 'Settings updated');
}

/* -------------------------------- Contacts ------------------------------- */

export async function listContacts(req: Request, res: Response): Promise<void> {
  const { page, limit, status, search } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  };

  const filter: FilterQuery<IContact> = { ...(status ? { status } : {}) };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [{ name: term }, { email: term }, { subject: term }, { message: term }];
  }

  const [items, total, unread] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Contact.countDocuments(filter),
    Contact.countDocuments({ status: 'new' }),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit), unread }, `${total} enquir(ies)`);
}

export async function updateContactStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: 'new' | 'read' | 'responded' };

  const contact = await Contact.findById(id);
  if (!contact) throw ApiError.notFound('Enquiry not found');

  const before = contact.status;
  contact.status = status;
  // The model stamps `respondedAt` on the transition to `responded`.
  await contact.save();

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Contact',
    entityId: id,
    before: { status: before },
    after: { status },
  });

  sendSuccess(res, contact.toJSON(), `Enquiry marked ${status}`);
}

/* ------------------------------- Newsletter ------------------------------ */

export async function listSubscribers(req: Request, res: Response): Promise<void> {
  const { page, limit, isActive } = req.query as unknown as {
    page: number;
    limit: number;
    isActive?: boolean;
  };

  const filter = isActive === undefined ? {} : { isActive };

  const [items, total] = await Promise.all([
    Newsletter.find(filter).sort({ subscribedAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Newsletter.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} subscriber(s)`);
}

export async function exportSubscribers(req: Request, res: Response): Promise<void> {
  const { format } = req.query as { format?: 'csv' | 'xlsx' };

  const subscribers = await Newsletter.find({ isActive: true }).sort({ subscribedAt: -1 }).lean();

  const file = buildSheet(
    subscribers.map((item) => ({
      email: item.email,
      subscribedAt: item.subscribedAt.toISOString().slice(0, 10),
    })),
    { format: format ?? 'csv', sheetName: 'Subscribers', filenameBase: 'fast-traders-newsletter' },
  );

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}

/* ------------------------------- Audit log ------------------------------- */

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const { page, limit, entity, entityId, actor, action, from, to } = req.query as unknown as {
    page: number;
    limit: number;
    entity?: string;
    entityId?: string;
    actor?: string;
    action?: string;
    from?: Date;
    to?: Date;
  };

  const filter: FilterQuery<IAuditLog> = {
    ...(entity ? { entity } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actor ? { actor } : {}),
    ...(action ? { action } : {}),
  };

  if (from || to) {
    filter.at = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate({ path: 'actor', select: 'name email role' })
      .sort({ at: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} audit entr(ies)`);
}

/* -------------------------------- Reports -------------------------------- */

export async function getReport(req: Request, res: Response): Promise<void> {
  const { type, format, from, to } = req.query as unknown as ReportQuery;

  const report =
    type === 'sales'
      ? await reports.salesReport(from, to)
      : type === 'inventory'
        ? await reports.inventoryReport()
        : await reports.customerReport(from, to);

  if (format === 'json') {
    sendSuccess(res, report, report.title);
    return;
  }

  if (format === 'csv') {
    const file = buildSheet(report.rows as unknown as Record<string, unknown>[], {
      format: 'csv',
      filenameBase: `fast-traders-${type}-report`,
    });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
    return;
  }

  // XLSX gets a summary sheet alongside the detail rows.
  const summaryRows = Object.entries(report.summary).map(([metric, value]) => ({ metric, value }));
  const file = buildWorkbook(
    [
      { name: 'Summary', rows: summaryRows },
      { name: 'Detail', rows: report.rows as unknown as Record<string, unknown>[] },
    ],
    `fast-traders-${type}-report`,
  );

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}
```

## `server/src/controllers/admin/dashboard.controller.ts`

```ts
import type { Request, Response } from 'express';
import * as dashboard from '../../services/dashboard.service';
import { sendSuccess } from '../../utils/ApiResponse';

/** Admin dashboard: KPIs, charts and recent activity. */

export async function getStats(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboard.getStats(), 'Dashboard statistics');
}

export async function getCharts(req: Request, res: Response): Promise<void> {
  const { granularity, days } = req.query as unknown as {
    granularity: 'daily' | 'weekly' | 'monthly';
    days: number;
  };

  sendSuccess(res, await dashboard.getCharts(granularity, days), 'Dashboard charts');
}

export async function getRecent(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboard.getRecent(), 'Recent activity');
}
```

## `server/src/controllers/admin/order.controller.ts`

```ts
import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { Order, Setting, type IOrder, type ISetting } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { email } from '../../services/email';
import { releaseStock } from '../../services/order.service';
import { generateInvoicePdf } from '../../services/pdf';
import { buildSheet } from '../../services/sheet.service';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type {
  AdminOrderQuery,
  UpdateOrderStatusInput,
  UpdatePaymentInput,
  UpdateTrackingInput,
} from '../../validators';

/** Admin order management. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  total_desc: { total: -1 },
  total_asc: { total: 1 },
};

/** Stock is returned to the shelf when an order leaves the fulfilment path. */
const STOCK_RELEASING = new Set(['cancelled', 'returned']);

function buildFilter(query: AdminOrderQuery): FilterQuery<IOrder> {
  const filter: FilterQuery<IOrder> = {
    ...(query.status ? { orderStatus: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
  };

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [
      { orderNumber: term },
      { 'customer.name': term },
      { 'customer.email': term },
      { 'customer.phone': term },
      { trackingNumber: term },
    ];
  }

  return filter;
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminOrderQuery;
  const filter = buildFilter(query);

  const [items, total, totals] = await Promise.all([
    Order.find(filter)
      .sort(SORTS[query.sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate<{ revenue: number }>([
      { $match: { ...filter, orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
  ]);

  sendSuccess(
    res,
    {
      items,
      meta: buildMeta(total, query.page, query.limit),
      // Revenue for the current filter, so the header figure matches the table.
      filteredRevenue: Math.round(totals[0]?.revenue ?? 0),
    },
    `${total} order(s)`,
  );
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const order = await Order.findById(id)
    .populate({ path: 'user', select: 'name email phone companyName' })
    .populate({ path: 'statusHistory.changedBy', select: 'name' });

  if (!order) throw ApiError.notFound('Order not found');
  sendSuccess(res, order.toJSON(), `Order ${order.orderNumber}`);
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { status, note, notifyCustomer } = req.body as UpdateOrderStatusInput;

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  const previous = order.orderStatus;
  if (previous === status) throw ApiError.badRequest(`This order is already ${status}`);

  order.orderStatus = status;
  order.statusHistory.push({
    status,
    ...(note ? { note } : {}),
    ...(req.user ? { changedBy: order.user ?? undefined } : {}),
    at: new Date(),
  });
  await order.save();

  if (STOCK_RELEASING.has(status) && !STOCK_RELEASING.has(previous)) {
    await releaseStock(order.items);
  }

  if (notifyCustomer) {
    email.orderStatus(order.customer.email, {
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      status,
      ...(note ? { note } : {}),
      ...(order.trackingNumber ? { trackingNumber: order.trackingNumber } : {}),
      ...(order.courier ? { courier: order.courier } : {}),
    });
  }

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Order',
    entityId: id,
    before: { orderStatus: previous },
    after: { orderStatus: status, note },
  });

  sendSuccess(
    res,
    order.toJSON(),
    `Order ${order.orderNumber} is now ${status}${notifyCustomer ? ' — customer notified' : ''}`,
  );
}

export async function updatePayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdatePaymentInput;

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  const before = { paymentStatus: order.paymentStatus, paymentDetails: order.paymentDetails };

  order.paymentStatus = input.paymentStatus;
  order.paymentDetails = {
    ...order.paymentDetails,
    ...(input.transactionId ? { transactionId: input.transactionId } : {}),
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.receiptUrl ? { receiptUrl: input.receiptUrl } : {}),
    ...(input.paymentStatus === 'paid' ? { paidAt: new Date() } : {}),
  };

  // Payment on a still-pending order confirms it.
  if (input.paymentStatus === 'paid' && order.orderStatus === 'pending') {
    order.orderStatus = 'confirmed';
    order.statusHistory.push({ status: 'confirmed', note: 'Payment received', at: new Date() });
  }

  await order.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Order',
    entityId: id,
    before,
    after: { paymentStatus: input.paymentStatus, note: input.note },
  });

  sendSuccess(res, order.toJSON(), `Payment marked ${input.paymentStatus}`);
}

export async function updateTracking(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateTrackingInput;

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  if (input.trackingNumber !== undefined) order.trackingNumber = input.trackingNumber;
  if (input.courier !== undefined) order.courier = input.courier;

  if (input.markShipped && order.orderStatus !== 'shipped') {
    order.orderStatus = 'shipped';
    order.statusHistory.push({
      status: 'shipped',
      note: `Handed to ${order.courier ?? 'courier'}`,
      at: new Date(),
    });
    email.orderStatus(order.customer.email, {
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      status: 'shipped',
      ...(order.trackingNumber ? { trackingNumber: order.trackingNumber } : {}),
      ...(order.courier ? { courier: order.courier } : {}),
    });
  }

  await order.save();

  recordAudit({ req, action: 'update', entity: 'Order', entityId: id, after: { ...input } });
  sendSuccess(res, order.toJSON(), 'Tracking details updated');
}

export async function downloadInvoice(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const order = await Order.findById(id).lean<IOrder>();
  if (!order) throw ApiError.notFound('Order not found');

  const settings = await Setting.findOne({ key: 'global' })
    .select('bankDetails defaultTaxRate')
    .lean<Pick<ISetting, 'bankDetails' | 'defaultTaxRate'>>();

  const pdf = await generateInvoicePdf({ order, settings });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${order.orderNumber}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.send(pdf);
}

export async function exportOrders(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminOrderQuery & { format?: 'csv' | 'xlsx' };
  const orders = await Order.find(buildFilter(query)).sort({ createdAt: -1 }).lean();

  const rows = orders.map((order) => ({
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString().slice(0, 10),
    customer: order.customer.name,
    company: order.customer.companyName ?? '',
    phone: order.customer.phone,
    email: order.customer.email,
    city: order.shippingAddress.city,
    items: order.items.reduce((sum, item) => sum + item.qty, 0),
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.taxAmount,
    shipping: order.shippingCost,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    courier: order.courier ?? '',
    trackingNumber: order.trackingNumber ?? '',
  }));

  const file = buildSheet(rows, {
    format: query.format ?? 'xlsx',
    sheetName: 'Orders',
    filenameBase: 'fast-traders-orders',
  });

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}
```

## `server/src/controllers/admin/product.controller.ts`

```ts
import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { Product, type IProduct } from '../../models';
import { recordAudit } from '../../services/audit.service';
import * as admin from '../../services/product.admin.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type {
  AdminProductQuery,
  BulkProductInput,
  CreateProductInput,
  StockAdjustmentInput,
  UpdateProductInput,
} from '../../validators';

/** Admin catalogue management. Unlike the public API, `costPrice` is included. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  stock_asc: { stock: 1 },
  stock_desc: { stock: -1 },
  sales: { salesCount: -1 },
};

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminProductQuery;

  const filter: FilterQuery<IProduct> = {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.brand ? { brand: query.brand } : {}),
    ...(query.pricingMode ? { pricingMode: query.pricingMode } : {}),
    ...(query.tags && query.tags.length > 0 ? { tags: { $all: query.tags } } : {}),
    ...(query.outOfStock ? { stock: { $lte: 0 } } : {}),
    // "Low stock" means at or under the per-product threshold, but not yet zero.
    ...(query.lowStock
      ? { stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }
      : {}),
  };

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [{ name: term }, { sku: term }, { partNumber: term }];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select('+costPrice')
      .populate({ path: 'category', select: 'name slug' })
      .populate({ path: 'brand', select: 'name slug' })
      .sort(SORTS[query.sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, query.page, query.limit) }, `${total} product(s)`);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const product = await Product.findById(id)
    .select('+costPrice')
    .populate({ path: 'category subCategory', select: 'name slug' })
    .populate({ path: 'brand', select: 'name slug' });

  if (!product) throw ApiError.notFound('Product not found');
  sendSuccess(res, product.toJSON(), 'Product detail');
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const product = await admin.createProduct(req.body as CreateProductInput);

  recordAudit({
    req,
    action: 'create',
    entity: 'Product',
    entityId: product._id.toString(),
    after: { sku: product.sku, name: product.name },
  });

  sendCreated(res, product.toJSON(), `Product "${product.name}" created`);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const before = await Product.findById(id).select('+costPrice').lean();

  const product = await admin.updateProduct(id, req.body as UpdateProductInput);

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: id,
    before: before ?? undefined,
    after: product.toObject() as unknown as Record<string, unknown>,
  });

  sendSuccess(res, product.toJSON(), 'Product updated');
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const product = await admin.softDeleteProduct(id);

  recordAudit({ req, action: 'delete', entity: 'Product', entityId: id, after: { isActive: false } });

  sendSuccess(
    res,
    product.toJSON(),
    'Product deactivated. Order history and links continue to resolve.',
  );
}

export async function bulkUpdate(req: Request, res: Response): Promise<void> {
  const input = req.body as BulkProductInput;
  const result = await admin.bulkUpdate(input);

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: `bulk:${input.ids.length}`,
    after: { ...result, ids: input.ids },
  });

  sendSuccess(res, result, `${result.modified} product(s) updated`);
}

export async function adjustStock(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as StockAdjustmentInput;

  const { product, previous, next } = await admin.adjustStock(id, input);

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: id,
    before: { stock: previous },
    after: { stock: next, mode: input.mode, quantity: input.quantity, reason: input.reason },
  });

  sendSuccess(
    res,
    { sku: product.sku, previous, current: next, stockStatus: product.stockStatus },
    `Stock updated from ${previous} to ${next}`,
  );
}
```

## `server/src/controllers/admin/product.media.controller.ts`

```ts
import type { Request, Response } from 'express';
import { Product } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { exportProducts } from '../../services/product.export.service';
import { importProducts } from '../../services/product.import.service';
import { deleteImage, uploadBuffers } from '../../services/upload.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import type { SheetFormat } from '../../services/sheet.service';

/** Product images, datasheets, and spreadsheet import/export. */

export async function uploadImages(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const files = req.files;

  if (!Array.isArray(files) || files.length === 0) {
    throw ApiError.badRequest('Attach at least one image in the `images` field');
  }

  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  const uploaded = await uploadBuffers(files, 'products');

  product.images.push(
    ...uploaded.map((image, index) => ({
      url: image.url,
      publicId: image.publicId,
      alt: product.name,
      // The very first image on a bare product becomes the primary.
      isPrimary: product.images.length === 0 && index === 0,
    })),
  );
  await product.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: id,
    after: { addedImages: uploaded.map((image) => image.publicId) },
  });

  sendCreated(res, product.images, `${uploaded.length} image(s) uploaded`);
}

export async function removeImage(req: Request, res: Response): Promise<void> {
  const { id, publicId } = req.params as { id: string; publicId: string };
  const decoded = decodeURIComponent(publicId);

  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  const image = product.images.find((item) => item.publicId === decoded);
  if (!image) throw ApiError.notFound('That image is not on this product');

  product.images = product.images.filter((item) => item.publicId !== decoded);
  // Promote a replacement primary so the card never renders blank.
  if (image.isPrimary && product.images[0]) product.images[0].isPrimary = true;
  await product.save();

  // Cloudinary cleanup is best-effort; the record is what the storefront reads.
  await deleteImage(decoded).catch(() => undefined);

  recordAudit({ req, action: 'update', entity: 'Product', entityId: id, after: { removedImage: decoded } });

  sendSuccess(res, product.images, 'Image removed');
}

export async function importFromSheet(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw ApiError.badRequest('Attach a CSV or XLSX file in the `file` field');

  const { dryRun } = req.query as { dryRun?: string };
  const preview = dryRun === 'true' || dryRun === '1';

  const report = await importProducts(file.buffer, preview);

  if (!preview) {
    recordAudit({
      req,
      action: 'create',
      entity: 'Product',
      entityId: `import:${report.totalRows}`,
      after: { created: report.created, updated: report.updated, skipped: report.skipped },
    });
  }

  const summary = preview
    ? `Dry run: ${report.created} would be created, ${report.updated} updated, ${report.skipped} skipped`
    : `${report.created} created, ${report.updated} updated, ${report.skipped} skipped`;

  sendSuccess(res, report, summary);
}

export async function exportToSheet(req: Request, res: Response): Promise<void> {
  const { format, isActive, category, brand } = req.query as unknown as {
    format: SheetFormat;
    isActive?: boolean;
    category?: string;
    brand?: string;
  };

  const file = await exportProducts(
    {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
    },
    format,
  );

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}
```

## `server/src/controllers/admin/quotation.controller.ts`

```ts
import { Types, type FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { Quotation, Setting, type IQuotation, type ISetting } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { dispatchEmail, email } from '../../services/email';
import { quotationReadyEmail } from '../../services/email/templates.commerce';
import { generateQuotationPdf } from '../../services/pdf';
import * as service from '../../services/quotation.admin.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type {
  AdminQuotationQuery,
  ConvertQuotationInput,
  PriceQuotationInput,
} from '../../validators';

/** Admin RFQ pipeline: price, send, assign, convert. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  required_by: { requiredBy: 1 },
};

export async function listQuotations(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminQuotationQuery;

  // Sweep lapsed validity windows so the board is never misleading.
  await service.expireStaleQuotations();

  const filter: FilterQuery<IQuotation> = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.assignedTo ? { assignedTo: new Types.ObjectId(query.assignedTo) } : {}),
    ...(query.unassigned ? { assignedTo: null } : {}),
  };

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [
      { quoteNumber: term },
      { 'customer.name': term },
      { 'customer.email': term },
      { 'customer.companyName': term },
    ];
  }

  const [items, total] = await Promise.all([
    Quotation.find(filter)
      .populate({ path: 'assignedTo', select: 'name email' })
      .sort(SORTS[query.sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, query.page, query.limit) }, `${total} quotation(s)`);
}

export async function getQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id)
    .populate({ path: 'assignedTo', select: 'name email' })
    .populate({ path: 'user', select: 'name email phone companyName' })
    .populate({ path: 'convertedOrder', select: 'orderNumber total orderStatus' });

  if (!quotation) throw ApiError.notFound('Quotation not found');
  sendSuccess(res, quotation.toJSON(), `Quotation ${quotation.quoteNumber}`);
}

export async function priceQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const before = { status: quotation.status, quotedTotal: quotation.quotedTotal };
  await service.priceQuotation(quotation, req.body as PriceQuotationInput);

  recordAudit({
    req,
    action: 'update',
    entity: 'Quotation',
    entityId: id,
    before,
    after: { status: quotation.status, quotedTotal: quotation.quotedTotal },
  });

  sendSuccess(res, quotation.toJSON(), `Quotation priced — status is now ${quotation.status}`);
}

/** Email the formal PDF quotation to the customer. */
export async function sendQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const unpriced = quotation.items.filter((item) => typeof item.quotedUnitPrice !== 'number');
  if (unpriced.length > 0) {
    throw ApiError.badRequest(
      `Price every line before sending: ${unpriced.map((item) => item.sku).join(', ')}`,
    );
  }

  const settings = await Setting.findOne({ key: 'global' })
    .select('bankDetails defaultTaxRate')
    .lean<Pick<ISetting, 'bankDetails' | 'defaultTaxRate'>>();

  const pdf = await generateQuotationPdf({ quotation: quotation.toObject(), settings });

  const items = quotation.items.map((item) => ({ name: item.name, sku: item.sku, qty: item.qty }));
  const content = quotationReadyEmail({
    quoteNumber: quotation.quoteNumber,
    customerName: quotation.customer.name,
    items,
    total: quotation.quotedTotal ?? 0,
    ...(quotation.validUntil
      ? { validUntil: quotation.validUntil.toISOString().slice(0, 10) }
      : {}),
  });

  dispatchEmail({
    to: quotation.customer.email,
    content: {
      ...content,
      // Attachment support rides on the same Nodemailer message.
      html: content.html,
    },
    attachments: [
      {
        filename: `quotation-${quotation.quoteNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  if (quotation.status === 'new' || quotation.status === 'reviewing') {
    quotation.status = 'quoted';
    await quotation.save();
  }

  recordAudit({
    req,
    action: 'update',
    entity: 'Quotation',
    entityId: id,
    after: { sentTo: quotation.customer.email, status: quotation.status },
  });

  sendSuccess(
    res,
    { quoteNumber: quotation.quoteNumber, sentTo: quotation.customer.email, bytes: pdf.length },
    `Quotation emailed to ${quotation.customer.email}`,
  );
}

export async function downloadQuotationPdf(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id).lean<IQuotation>();
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const settings = await Setting.findOne({ key: 'global' })
    .select('bankDetails defaultTaxRate')
    .lean<Pick<ISetting, 'bankDetails' | 'defaultTaxRate'>>();

  const pdf = await generateQuotationPdf({ quotation, settings });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quoteNumber}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.send(pdf);
}

export async function convertQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const order = await service.convertToOrder(quotation, req.body as ConvertQuotationInput);

  email.orderConfirmation(order.customer.email, {
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    items: order.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      price: item.price,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    shippingCity: order.shippingAddress.city,
  });

  recordAudit({
    req,
    action: 'create',
    entity: 'Order',
    entityId: order._id.toString(),
    after: { orderNumber: order.orderNumber, fromQuotation: quotation.quoteNumber },
  });

  sendCreated(
    res,
    { order: order.toJSON(), quotation: quotation.toJSON() },
    `Order ${order.orderNumber} created from ${quotation.quoteNumber}`,
  );
}

export async function assignQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { assignedTo } = req.body as { assignedTo: string | null };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const before = quotation.assignedTo?.toString() ?? null;
  quotation.assignedTo = assignedTo ? new Types.ObjectId(assignedTo) : null;

  // Picking up a brand-new RFQ moves it into review.
  if (assignedTo && quotation.status === 'new') quotation.status = 'reviewing';
  await quotation.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Quotation',
    entityId: id,
    before: { assignedTo: before },
    after: { assignedTo },
  });

  sendSuccess(res, quotation.toJSON(), assignedTo ? 'Quotation assigned' : 'Quotation unassigned');
}
```

## `server/src/controllers/admin/taxonomy.controller.ts`

```ts
import { Types, type Model } from 'mongoose';
import type { Request, Response } from 'express';
import { Banner, Brand, Category, Coupon, Product } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { uniqueSlug } from '../../utils/slug';
import type { ReorderInput } from '../../validators';

/**
 * Categories, brands, banners and coupons.
 *
 * These four share the same admin shape (list / create / update / delete /
 * reorder), so the handlers are generated from one factory. Slug generation
 * and delete guards are supplied per entity.
 */

interface CrudOptions<T> {
  model: Model<T>;
  label: string;
  /** Field the slug is derived from, when the entity has one. */
  slugFrom?: 'name';
  /** Throw to block a delete (e.g. a category still holding products). */
  guardDelete?: (id: string) => Promise<void>;
  listSort?: Record<string, 1 | -1>;
}

export interface CrudController {
  list: (req: Request, res: Response) => Promise<void>;
  get: (req: Request, res: Response) => Promise<void>;
  create: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
  reorder: (req: Request, res: Response) => Promise<void>;
}

/** Narrow an unknown body value to a string before it reaches the slugger. */
function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function buildListFilter(req: Request): Record<string, unknown> {
  const { search, isActive, parent, position } = req.query as {
    search?: string;
    isActive?: boolean;
    parent?: string | null;
    position?: string;
  };

  const filter: Record<string, unknown> = {};
  if (isActive !== undefined) filter.isActive = isActive;
  if (position) filter.position = position;
  if (parent !== undefined) filter.parent = parent ? new Types.ObjectId(parent) : null;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [{ name: term }, { title: term }, { code: term }, { slug: term }];
  }

  return filter;
}

export function makeCrudController<T>(options: CrudOptions<T>): CrudController {
  const { model, label, slugFrom, guardDelete, listSort = { displayOrder: 1, name: 1 } } = options;

  return {
    list: async (req, res): Promise<void> => {
      const items = await model.find(buildListFilter(req)).sort(listSort).lean();
      sendSuccess(res, items, `${items.length} ${label}(s)`);
    },

    get: async (req, res): Promise<void> => {
      const { id } = req.params as { id: string };
      const item = await model.findById(id);
      if (!item) throw ApiError.notFound(`${label} not found`);
      sendSuccess(res, item.toJSON(), `${label} detail`);
    },

    create: async (req, res): Promise<void> => {
      const input = req.body as Record<string, unknown>;

      if (slugFrom && !input.slug) {
        input.slug = await uniqueSlug(model, asText(input[slugFrom]));
      }

      const created = await model.create(input);
      const id = String((created as unknown as { _id: Types.ObjectId })._id);

      recordAudit({ req, action: 'create', entity: label, entityId: id, after: input });
      sendCreated(res, created, `${label} created`);
    },

    update: async (req, res): Promise<void> => {
      const { id } = req.params as { id: string };
      const input = req.body as Record<string, unknown>;

      const existing = await model.findById(id);
      if (!existing) throw ApiError.notFound(`${label} not found`);
      const before = existing.toObject() as Record<string, unknown>;

      // Renaming regenerates the slug unless one was supplied explicitly.
      if (slugFrom && input[slugFrom] && !input.slug) {
        input.slug = await uniqueSlug(model, asText(input[slugFrom]), id);
      }

      for (const [key, value] of Object.entries(input)) {
        existing.set(key, value === null ? undefined : value);
      }
      await existing.save();

      recordAudit({ req, action: 'update', entity: label, entityId: id, before, after: input });
      sendSuccess(res, existing.toJSON(), `${label} updated`);
    },

    remove: async (req, res): Promise<void> => {
      const { id } = req.params as { id: string };
      if (guardDelete) await guardDelete(id);

      const deleted = await model.findByIdAndDelete(id);
      if (!deleted) throw ApiError.notFound(`${label} not found`);

      recordAudit({ req, action: 'delete', entity: label, entityId: id });
      sendSuccess(res, null, `${label} deleted`);
    },

    /** Drag-and-drop: the client posts every affected id with its new index. */
    reorder: async (req, res): Promise<void> => {
      const { items } = req.body as ReorderInput;

      // One round trip regardless of how many rows the admin dragged.
      await model.bulkWrite(
        items.map((item) => ({
          updateOne: {
            filter: { _id: new Types.ObjectId(item.id) },
            update: { $set: { displayOrder: item.displayOrder } },
          },
        })) as Parameters<typeof model.bulkWrite>[0],
      );

      recordAudit({
        req,
        action: 'update',
        entity: label,
        entityId: `reorder:${items.length}`,
        after: { items },
      });

      sendSuccess(res, null, `${items.length} ${label}(s) reordered`);
    },
  };
}

/* ------------------------------ Delete guards ---------------------------- */

async function guardCategoryDelete(id: string): Promise<void> {
  const [children, products] = await Promise.all([
    Category.countDocuments({ parent: id }),
    Product.countDocuments({ $or: [{ category: id }, { subCategory: id }] }),
  ]);

  if (children > 0) {
    throw ApiError.conflict(`Move or delete the ${children} sub-categor(ies) first`);
  }
  if (products > 0) {
    throw ApiError.conflict(
      `${products} product(s) still use this category. Reassign them before deleting.`,
    );
  }
}

async function guardBrandDelete(id: string): Promise<void> {
  const products = await Product.countDocuments({ brand: id });
  if (products > 0) {
    throw ApiError.conflict(
      `${products} product(s) still use this brand. Reassign them before deleting.`,
    );
  }
}

export const categoryAdmin = makeCrudController({
  model: Category,
  label: 'Category',
  slugFrom: 'name',
  guardDelete: guardCategoryDelete,
  listSort: { level: 1, displayOrder: 1, name: 1 },
});

export const brandAdmin = makeCrudController({
  model: Brand,
  label: 'Brand',
  slugFrom: 'name',
  guardDelete: guardBrandDelete,
});

export const bannerAdmin = makeCrudController({
  model: Banner,
  label: 'Banner',
  listSort: { position: 1, displayOrder: 1 },
});

export const couponAdmin = makeCrudController({
  model: Coupon,
  label: 'Coupon',
  listSort: { createdAt: -1 },
});
```

## `server/src/controllers/admin/user.controller.ts`

```ts
import { Types, type FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { Order, Quotation, Review, User, type IUser } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { toPublicUser } from '../../services/auth.service';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';

/** Customer and staff administration. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  last_login: { lastLogin: -1 },
};

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { page, limit, search, role, isActive, sort } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    sort: string;
  };

  const filter: FilterQuery<IUser> = {
    ...(role ? { role } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [{ name: term }, { email: term }, { phone: term }, { companyName: term }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(SORTS[sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  // One aggregation covers the whole page rather than N per-row queries.
  const spend = await Order.aggregate<{ _id: Types.ObjectId; orders: number; value: number }>([
    {
      $match: {
        user: { $in: users.map((user) => user._id) },
        orderStatus: { $nin: ['cancelled', 'returned'] },
      },
    },
    { $group: { _id: '$user', orders: { $sum: 1 }, value: { $sum: '$total' } } },
  ]);
  const byUser = new Map(spend.map((row) => [row._id.toString(), row]));

  const items = users.map((user) => {
    const stats = byUser.get(user._id.toString());
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyName: user.companyName ?? null,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin ?? null,
      createdAt: user.createdAt,
      orderCount: stats?.orders ?? 0,
      lifetimeValue: Math.round(stats?.value ?? 0),
    };
  });

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} user(s)`);
}

/** Full customer profile: order history, RFQs, reviews and lifetime value. */
export async function getUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  const [orders, quotations, reviews, totals] = await Promise.all([
    Order.find({ user: id })
      .select('orderNumber total orderStatus paymentStatus createdAt items')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Quotation.find({ user: id })
      .select('quoteNumber status quotedTotal createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Review.find({ user: id })
      .select('product rating title isApproved createdAt')
      .populate({ path: 'product', select: 'name slug' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Order.aggregate<{ orders: number; value: number; first: Date; last: Date }>([
      { $match: { user: new Types.ObjectId(id), orderStatus: { $nin: ['cancelled', 'returned'] } } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          value: { $sum: '$total' },
          first: { $min: '$createdAt' },
          last: { $max: '$createdAt' },
        },
      },
    ]),
  ]);

  const summary = totals[0];

  sendSuccess(
    res,
    {
      user: toPublicUser(user),
      lifetime: {
        orders: summary?.orders ?? 0,
        value: Math.round(summary?.value ?? 0),
        averageOrderValue: summary?.orders ? Math.round(summary.value / summary.orders) : 0,
        firstOrder: summary?.first ?? null,
        lastOrder: summary?.last ?? null,
        quotations: quotations.length,
      },
      orders,
      quotations,
      reviews,
    },
    `Customer ${user.name}`,
  );
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { role } = req.body as { role: 'customer' | 'admin' | 'manager' };

  const user = await User.findById(id).select('+refreshTokens');
  if (!user) throw ApiError.notFound('User not found');

  if (user._id.toString() === req.user?.id) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  const before = user.role;
  if (before === role) throw ApiError.badRequest(`This user is already a ${role}`);

  user.role = role;
  // The role is baked into the access token, so existing sessions must go.
  user.refreshTokens = [];
  await user.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'User',
    entityId: id,
    before: { role: before },
    after: { role },
  });

  sendSuccess(res, toPublicUser(user), `${user.name} is now a ${role}. Their sessions were revoked.`);
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { isActive, reason } = req.body as { isActive: boolean; reason?: string };

  const user = await User.findById(id).select('+refreshTokens');
  if (!user) throw ApiError.notFound('User not found');

  if (user._id.toString() === req.user?.id) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  const before = user.isActive;
  user.isActive = isActive;
  if (!isActive) user.refreshTokens = [];
  await user.save();

  recordAudit({
    req,
    action: 'status_change',
    entity: 'User',
    entityId: id,
    before: { isActive: before },
    after: { isActive, reason },
  });

  sendSuccess(
    res,
    toPublicUser(user),
    isActive ? `${user.name} reactivated` : `${user.name} deactivated and signed out`,
  );
}
```

## `server/src/services/pdf/blocks.ts`

```ts
import { COLORS, PAGE } from './theme';
import type { Doc } from './layout';

/** Content blocks shared by the invoice and the quotation. */

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface TableRow {
  cells: string[];
  /** Secondary line under the first cell, e.g. the SKU. */
  subLabel?: string;
}

/**
 * Item table with a header band, zebra striping and page-break handling.
 *
 * Every block snapshots its own top and then *assigns* `doc.y` rather than
 * incrementing it — `doc.text()` advances the cursor itself, so `+=` would
 * double-count and push content onto phantom extra pages.
 */
export function drawTable(doc: Doc, columns: TableColumn[], rows: TableRow[]): void {
  const { margin } = PAGE;
  const headerHeight = 22;

  const drawHeader = (): void => {
    const top = doc.y;
    doc.rect(margin, top, PAGE.contentWidth, headerHeight).fill(COLORS.navy);

    let x = margin + 8;
    columns.forEach((col) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLORS.white)
        .text(col.header.toUpperCase(), x, top + 7, {
          width: col.width - 16,
          align: col.align ?? 'left',
          lineBreak: false,
        });
      x += col.width;
    });

    doc.y = top + headerHeight;
  };

  drawHeader();

  rows.forEach((row, index) => {
    const rowHeight = row.subLabel ? 30 : 21;

    // Leave room for the totals block; start a fresh page with a new header.
    if (doc.y + rowHeight > 700) {
      doc.addPage();
      doc.y = PAGE.margin;
      drawHeader();
    }

    const top = doc.y;

    if (index % 2 === 1) {
      doc.rect(margin, top, PAGE.contentWidth, rowHeight).fill(COLORS.surface);
    }

    let x = margin + 8;
    row.cells.forEach((cell, cellIndex) => {
      const col = columns[cellIndex];
      if (!col) return;
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.ink)
        // `height` clamps the cell to a single line; a long product name is
        // truncated with an ellipsis rather than wrapping over its SKU label.
        .text(cell, x, top + 6, {
          width: col.width - 16,
          height: 11,
          align: col.align ?? 'left',
          ellipsis: true,
        });
      x += col.width;
    });

    if (row.subLabel) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.muted)
        .text(row.subLabel, margin + 8, top + 18, {
          width: PAGE.contentWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });
    }

    doc.y = top + rowHeight;
    doc
      .moveTo(margin, doc.y)
      .lineTo(margin + PAGE.contentWidth, doc.y)
      .strokeColor(COLORS.line)
      .lineWidth(0.5)
      .stroke();
  });

  doc.y += 10;
}

export interface TotalLine {
  label: string;
  value: string;
  emphasise?: boolean;
}

/** Right-aligned totals stack; the emphasised line gets a navy band. */
export function drawTotals(doc: Doc, lines: TotalLine[]): void {
  const { margin, contentWidth } = PAGE;
  const boxWidth = 250;
  const x = margin + contentWidth - boxWidth;

  lines.forEach((line) => {
    const height = line.emphasise ? 26 : 18;
    const top = doc.y;

    if (line.emphasise) {
      doc.rect(x, top, boxWidth, height).fill(COLORS.navy);
    }

    const textY = top + (line.emphasise ? 8 : 4);
    doc
      .font(line.emphasise ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(line.emphasise ? 11 : 9.5)
      .fillColor(line.emphasise ? COLORS.white : COLORS.muted)
      .text(line.label, x + 10, textY, { width: boxWidth / 2 - 10, lineBreak: false });

    doc
      .font('Helvetica-Bold')
      .fontSize(line.emphasise ? 11 : 9.5)
      .fillColor(line.emphasise ? COLORS.white : COLORS.ink)
      .text(line.value, x + boxWidth / 2, textY, {
        width: boxWidth / 2 - 12,
        align: 'right',
        lineBreak: false,
      });

    doc.y = top + height;
  });

  doc.y += 8;
}

/** Notes / terms block. */
export function drawNotes(doc: Doc, heading: string, lines: string[]): void {
  if (lines.length === 0) return;
  const { margin, contentWidth } = PAGE;

  if (doc.y > 690) {
    doc.addPage();
    doc.y = PAGE.margin;
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(heading.toUpperCase(), margin, doc.y, { characterSpacing: 0.6 });

  doc.y += 3;
  lines.forEach((line) => {
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.ink)
      .text(`•  ${line}`, margin, doc.y, { width: contentWidth, lineGap: 1 });
  });

  doc.y += 8;
}
```

## `server/src/services/pdf/index.ts`

```ts
export { generateInvoicePdf, type InvoiceOptions } from './invoice.pdf';
export { generateQuotationPdf, type QuotationPdfOptions } from './quotation.pdf';
export { BUSINESS, COLORS, money, amountInWords, formatDate } from './theme';
export type { TableColumn, TableRow } from './blocks';
```

## `server/src/services/pdf/invoice.pdf.ts`

```ts
import type { IOrder, ISetting } from '../../models';
import { createDocument, drawFooters, drawLetterhead, drawMetaPanel, toBuffer } from './layout';
import { drawNotes, drawTable, drawTotals, type TableRow } from './blocks';
import { COLORS, PAGE, amountInWords, formatDate, money } from './theme';

/** Tax invoice for a placed order, on the Fast Traders letterhead. */

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  stripe: 'Card (Stripe)',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

export interface InvoiceOptions {
  order: IOrder;
  settings?: Pick<ISetting, 'bankDetails' | 'defaultTaxRate'> | null;
}

export async function generateInvoicePdf({ order, settings }: InvoiceOptions): Promise<Buffer> {
  const doc = createDocument(`Invoice ${order.orderNumber}`, 'Tax invoice');
  const generatedAt = new Date();

  drawLetterhead(doc, 'Tax Invoice');

  const shipping = order.shippingAddress;
  const billing = order.billingAddress;

  drawMetaPanel(
    doc,
    {
      heading: 'Bill to',
      lines: [
        order.customer.name,
        ...(order.customer.companyName ? [order.customer.companyName] : []),
        billing.line1,
        ...(billing.line2 ? [billing.line2] : []),
        `${billing.city}, ${billing.province}`,
        order.customer.phone,
        order.customer.email,
      ],
    },
    {
      heading: 'Invoice details',
      lines: [
        `Invoice no.    ${order.orderNumber}`,
        `Date           ${formatDate(order.createdAt)}`,
        `Payment        ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}`,
        `Payment status ${order.paymentStatus.toUpperCase()}`,
        `Order status   ${order.orderStatus.toUpperCase()}`,
        ...(order.trackingNumber
          ? [`Tracking       ${order.courier ?? ''} ${order.trackingNumber}`.trim()]
          : []),
      ],
    },
  );

  // Ship-to only when it differs from bill-to, to keep the page uncluttered.
  if (!order.sameAsBilling) {
    drawMetaPanel(
      doc,
      {
        heading: 'Ship to',
        lines: [
          shipping.line1,
          ...(shipping.line2 ? [shipping.line2] : []),
          `${shipping.city}, ${shipping.province}`,
          ...(shipping.postalCode ? [shipping.postalCode] : []),
        ],
      },
      { heading: '', lines: [] },
    );
  }

  const rows: TableRow[] = order.items.map((item, index) => ({
    cells: [
      `${index + 1}.  ${item.name}`,
      `${item.qty} ${item.unit}`,
      money(item.price),
      money(item.subtotal),
    ],
    subLabel: `SKU ${item.sku}${item.variant ? `  ·  ${item.variant}` : ''}`,
  }));

  drawTable(
    doc,
    [
      { header: 'Description', width: 250 },
      { header: 'Qty', width: 70, align: 'center' },
      { header: 'Unit price', width: 90, align: 'right' },
      { header: 'Amount', width: PAGE.contentWidth - 410, align: 'right' },
    ],
    rows,
  );

  const taxRate = settings?.defaultTaxRate ?? 18;
  drawTotals(doc, [
    { label: 'Subtotal', value: money(order.subtotal) },
    ...(order.discount > 0
      ? [{ label: `Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, value: `- ${money(order.discount)}` }]
      : []),
    ...(order.taxAmount > 0 ? [{ label: `Sales tax (${taxRate}%)`, value: money(order.taxAmount) }] : []),
    { label: 'Delivery', value: order.shippingCost > 0 ? money(order.shippingCost) : 'Free' },
    { label: 'Total payable', value: money(order.total), emphasise: true },
  ]);

  doc
    .font('Helvetica-Oblique')
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(`Amount in words: ${amountInWords(order.total)}`, PAGE.margin, doc.y, {
      width: PAGE.contentWidth,
    });
  doc.y += 16;

  const bank = settings?.bankDetails;
  drawNotes(doc, 'Payment & terms', [
    ...(bank
      ? [
          `Bank transfer: ${bank.bankName} — ${bank.accountTitle}, A/C ${bank.accountNumber}${bank.iban ? `, IBAN ${bank.iban}` : ''}`,
        ]
      : []),
    'Please quote the invoice number with any payment or correspondence.',
    'Goods remain the property of Fast Traders until payment is received in full.',
    'Claims for shortage or damage must be raised within 48 hours of delivery.',
    'Warranty is limited to the manufacturer’s terms for the relevant brand.',
    ...(order.notes ? [`Order note: ${order.notes}`] : []),
  ]);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text('This is a computer-generated invoice and is valid without a signature.', PAGE.margin, doc.y, {
      width: PAGE.contentWidth,
      align: 'center',
    });

  drawFooters(doc, generatedAt);
  return toBuffer(doc);
}
```

## `server/src/services/pdf/layout.ts`

```ts
import PDFDocument from 'pdfkit';
import { BUSINESS, COLORS, PAGE, formatDate } from './theme';

/**
 * Reusable PDF building blocks: letterhead, meta panel, item table, totals and
 * footer. Both the invoice and the formal quotation are composed from these,
 * so the two documents cannot drift apart visually.
 */

export type Doc = InstanceType<typeof PDFDocument>;

export function createDocument(title: string, subject: string): Doc {
  return new PDFDocument({
    size: PAGE.size,
    margin: PAGE.margin,
    bufferPages: true,
    info: {
      Title: title,
      Author: BUSINESS.name,
      Subject: subject,
      Creator: `${BUSINESS.name} — ${BUSINESS.website}`,
    },
  });
}

/** Collect a document into a single Buffer. */
export function toBuffer(doc: Doc): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

/** Navy letterhead band with the full business card details. */
export function drawLetterhead(doc: Doc, documentLabel: string): void {
  const { margin, contentWidth } = PAGE;

  doc.rect(0, 0, 595.28, 108).fill(COLORS.navy);
  // Cyan keyline echoes the accent used across the site.
  doc.rect(0, 108, 595.28, 3).fill(COLORS.cyan);

  doc
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(BUSINESS.name, margin, 26, { characterSpacing: 1.5 });

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(COLORS.cyan)
    .text(BUSINESS.tagline.toUpperCase(), margin, 55, { characterSpacing: 0.4 });

  doc
    .fillColor(COLORS.white)
    .fontSize(7.5)
    .text(BUSINESS.address, margin, 70)
    .text(
      `Mobile / WhatsApp ${BUSINESS.mobile}   |   Landline ${BUSINESS.landline}`,
      margin,
      81,
    )
    .text(`${BUSINESS.email}   |   ${BUSINESS.website}`, margin, 92);

  // Document label, right-aligned in the band.
  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor(COLORS.white)
    .text(documentLabel.toUpperCase(), margin, 30, { width: contentWidth, align: 'right' });

  doc.y = 130;
  doc.fillColor(COLORS.ink);
}

export interface MetaColumn {
  heading: string;
  lines: string[];
}

/** Two-column panel: "Bill To" on the left, document meta on the right. */
export function drawMetaPanel(doc: Doc, left: MetaColumn, right: MetaColumn): void {
  const { margin, contentWidth } = PAGE;
  const top = doc.y;
  const colWidth = contentWidth / 2 - 10;
  const rightX = margin + contentWidth / 2 + 10;

  const column = (col: MetaColumn, x: number): number => {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(col.heading.toUpperCase(), x, top, { width: colWidth, characterSpacing: 0.6 });

    let y = top + 13;
    for (const line of col.lines) {
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.ink).text(line, x, y, { width: colWidth });
      y = doc.y + 1;
    }
    return y;
  };

  const leftBottom = column(left, margin);
  const rightBottom = column(right, rightX);

  doc.y = Math.max(leftBottom, rightBottom) + 14;
}

/** Footer with page numbers, stamped on every buffered page at the end. */
export function drawFooters(doc: Doc, generatedAt: Date): void {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);

    // The footer sits below the bottom margin. Without this, pdfkit treats the
    // write as an overflow and helpfully adds a blank page for every footer.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = 795;

    doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + PAGE.contentWidth, y)
      .strokeColor(COLORS.line)
      .lineWidth(0.5)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(`${BUSINESS.name}  \u00b7  ${BUSINESS.address}  \u00b7  ${BUSINESS.mobile}`, PAGE.margin, y + 7, {
        width: PAGE.contentWidth * 0.7,
        lineBreak: false,
      })
      .text(
        `Generated ${formatDate(generatedAt)}   Page ${i - range.start + 1} of ${range.count}`,
        PAGE.margin,
        y + 7,
        { width: PAGE.contentWidth, align: 'right', lineBreak: false },
      );

    doc.page.margins.bottom = bottomMargin;
  }

  // Nothing must be written after the footers, or the page count goes stale.
  doc.flushPages();
}
```

## `server/src/services/pdf/quotation.pdf.ts`

```ts
import type { IQuotation, ISetting } from '../../models';
import { createDocument, drawFooters, drawLetterhead, drawMetaPanel, toBuffer } from './layout';
import { drawNotes, drawTable, drawTotals, type TableRow } from './blocks';
import { COLORS, PAGE, amountInWords, formatDate, money } from './theme';

/** Formal quotation document emailed to the customer. */

export interface QuotationPdfOptions {
  quotation: IQuotation;
  settings?: Pick<ISetting, 'bankDetails' | 'defaultTaxRate'> | null;
}

export async function generateQuotationPdf({
  quotation,
  settings,
}: QuotationPdfOptions): Promise<Buffer> {
  const doc = createDocument(`Quotation ${quotation.quoteNumber}`, 'Quotation');
  const generatedAt = new Date();

  drawLetterhead(doc, 'Quotation');

  drawMetaPanel(
    doc,
    {
      heading: 'Quotation for',
      lines: [
        quotation.customer.name,
        ...(quotation.customer.companyName ? [quotation.customer.companyName] : []),
        ...(quotation.customer.city ? [quotation.customer.city] : []),
        quotation.customer.phone,
        quotation.customer.email,
      ],
    },
    {
      heading: 'Reference',
      lines: [
        `Quotation no.  ${quotation.quoteNumber}`,
        `Date           ${formatDate(quotation.createdAt)}`,
        ...(quotation.validUntil ? [`Valid until    ${formatDate(quotation.validUntil)}`] : []),
        ...(quotation.requiredBy ? [`Required by    ${formatDate(quotation.requiredBy)}`] : []),
        `Status         ${quotation.status.toUpperCase()}`,
      ],
    },
  );

  const priced = quotation.items.some((item) => typeof item.quotedUnitPrice === 'number');

  const rows: TableRow[] = quotation.items.map((item, index) => ({
    cells: [
      `${index + 1}.  ${item.name}`,
      `${item.qty} ${item.unit}`,
      typeof item.quotedUnitPrice === 'number' ? money(item.quotedUnitPrice) : 'On request',
      typeof item.quotedTotal === 'number' ? money(item.quotedTotal) : '—',
    ],
    subLabel: [`SKU ${item.sku}`, item.customerNote].filter(Boolean).join('  ·  '),
  }));

  drawTable(
    doc,
    [
      { header: 'Description', width: 250 },
      { header: 'Qty', width: 70, align: 'center' },
      { header: 'Unit price', width: 90, align: 'right' },
      { header: 'Amount', width: PAGE.contentWidth - 410, align: 'right' },
    ],
    rows,
  );

  if (priced && typeof quotation.quotedTotal === 'number') {
    const taxRate = settings?.defaultTaxRate ?? 18;
    drawTotals(doc, [
      { label: 'Subtotal', value: money(quotation.quotedSubtotal ?? 0) },
      ...(quotation.quotedTax
        ? [{ label: `Sales tax (${taxRate}%)`, value: money(quotation.quotedTax) }]
        : []),
      { label: 'Quoted total', value: money(quotation.quotedTotal), emphasise: true },
    ]);

    doc
      .font('Helvetica-Oblique')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(`Amount in words: ${amountInWords(quotation.quotedTotal)}`, PAGE.margin, doc.y, {
        width: PAGE.contentWidth,
      });
    doc.y += 16;
  } else {
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        'Pricing for the items above is being confirmed with our principals and will follow shortly.',
        PAGE.margin,
        doc.y,
        { width: PAGE.contentWidth },
      );
    doc.y += 18;
  }

  if (quotation.message) {
    drawNotes(doc, 'Your enquiry', [quotation.message]);
  }

  const bank = settings?.bankDetails;
  drawNotes(doc, 'Terms of quotation', [
    quotation.validUntil
      ? `This quotation is valid until ${formatDate(quotation.validUntil)}.`
      : 'This quotation is valid for 15 days from the date above.',
    'Prices are subject to stock availability at the time of order confirmation.',
    'Imported items are quoted against the prevailing exchange rate and may be revised.',
    'Delivery lead time is confirmed on receipt of a firm order.',
    'Warranty is limited to the manufacturer’s terms for the relevant brand.',
    ...(bank
      ? [`Payment: ${bank.bankName} — ${bank.accountTitle}, A/C ${bank.accountNumber}`]
      : []),
    ...(quotation.adminNotes ? [`Note: ${quotation.adminNotes.split('\n')[0] ?? ''}`] : []),
  ]);

  // Signature block — trade customers routinely need a countersigned copy.
  if (doc.y < 690) {
    const y = Math.max(doc.y + 10, 700);
    doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + 170, y)
      .strokeColor(COLORS.line)
      .lineWidth(0.7)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('For Fast Traders', PAGE.margin, y + 5);

    const rightX = PAGE.margin + PAGE.contentWidth - 170;
    doc
      .moveTo(rightX, y)
      .lineTo(rightX + 170, y)
      .stroke();
    doc.text('Customer acceptance (sign & date)', rightX, y + 5, { width: 170 });
  }

  drawFooters(doc, generatedAt);
  return toBuffer(doc);
}
```

## `server/src/services/pdf/theme.ts`

```ts
/** Shared visual language for generated PDFs — mirrors the web brand tokens. */

export const COLORS = {
  navy: '#1B2A6B',
  dark: '#0F1B4C',
  cyan: '#00AEEF',
  surface: '#F7F9FC',
  ink: '#1A1A1A',
  muted: '#5A6472',
  line: '#D8DEE9',
  white: '#FFFFFF',
} as const;

export const PAGE = {
  size: 'A4' as const,
  margin: 45,
  /** A4 width (595.28pt) minus both margins. */
  contentWidth: 595.28 - 90,
};

/** Business details, printed on every letterhead. */
export const BUSINESS = {
  name: 'FAST TRADERS',
  tagline: 'We Deal In All Kinds Of Industrial Equipment, Parts & Accessories',
  proprietor: 'Sharjeel Bin Ejaz',
  address: 'Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan',
  mobile: '+92 324 4234990',
  landline: '+92 42 37378460',
  email: 'fasttrad3rs@gmail.com',
  website: 'www.fasttraders.co',
} as const;

/** Rs. 1,234,567 — no decimals; PKR invoices are quoted in whole rupees. */
export function money(amount: number): string {
  return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

/**
 * Spell a rupee amount in words — Pakistani invoices are expected to carry it,
 * and it makes tampering with the figure obvious.
 */
export function amountInWords(amount: number): string {
  const value = Math.round(amount);
  if (value === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const belowHundred = (n: number): string => {
    if (n < 20) return ones[n] ?? '';
    const ten = tens[Math.floor(n / 10)] ?? '';
    const one = ones[n % 10] ?? '';
    return one ? `${ten} ${one}` : ten;
  };

  const belowThousand = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const parts = [hundred ? `${ones[hundred] ?? ''} Hundred` : '', rest ? belowHundred(rest) : ''];
    return parts.filter(Boolean).join(' ');
  };

  // South Asian numbering: crore, lakh, thousand.
  const units: [number, string][] = [
    [10_000_000, 'Crore'],
    [100_000, 'Lakh'],
    [1_000, 'Thousand'],
  ];

  let remaining = value;
  const words: string[] = [];

  for (const [divisor, label] of units) {
    const count = Math.floor(remaining / divisor);
    if (count > 0) {
      words.push(`${belowThousand(count)} ${label}`);
      remaining %= divisor;
    }
  }
  if (remaining > 0) words.push(belowThousand(remaining));

  return `${words.join(' ').replace(/\s+/g, ' ').trim()} Rupees Only`;
}
```

## `server/src/validators/admin.catalog.validators.ts`

```ts
import { z } from 'zod';
import {
  booleanQuerySchema,
  csvSchema,
  objectIdSchema,
  paginationSchema,
  slugSchema,
} from './common.validators';

/** Admin product, category, brand, banner and coupon payloads. */

const seoSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(180).optional(),
  keywords: z.array(z.string().trim().max(60)).max(20).default([]),
});

const specificationSchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(200),
  group: z.string().trim().max(60).optional(),
});

const variantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(60).toUpperCase(),
  attributes: z.record(z.string().max(120)).default({}),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  image: z.string().url().optional(),
});

/* -------------------------------- Products ------------------------------- */

export const createProductSchema = z
  .object({
    name: z.string().trim().min(3).max(200),
    /** Omit to auto-generate from the name with collision handling. */
    slug: slugSchema.optional(),
    sku: z.string().trim().min(1).max(60).toUpperCase(),
    partNumber: z.string().trim().max(80).toUpperCase().optional(),
    description: z.string().trim().min(10).max(20000),
    shortDescription: z.string().trim().max(400).optional(),
    category: objectIdSchema,
    subCategory: objectIdSchema.nullable().optional(),
    brand: objectIdSchema,
    pricingMode: z.enum(['retail', 'quote', 'both']),
    price: z.number().nonnegative().optional(),
    comparePrice: z.number().nonnegative().optional(),
    costPrice: z.number().nonnegative().optional(),
    taxRate: z.number().min(0).max(100).default(18),
    stock: z.number().int().nonnegative().default(0),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    /** Only honoured as `on_order`; otherwise derived from stock by the model. */
    stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'on_order']).optional(),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).default('piece'),
    minOrderQty: z.number().int().positive().default(1),
    specifications: z.array(specificationSchema).max(60).default([]),
    variants: z.array(variantSchema).max(40).default([]),
    tags: z.array(z.string().trim().max(40)).max(30).default([]),
    warranty: z.string().trim().max(120).optional(),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isActive: z.boolean().default(true),
    seo: seoSchema.optional(),
  })
  .refine((data) => data.pricingMode === 'quote' || typeof data.price === 'number', {
    message: 'A price is required unless the product is quote-only',
    path: ['price'],
  })
  .refine(
    (data) => data.comparePrice === undefined || data.price === undefined || data.comparePrice > data.price,
    { message: 'comparePrice must be higher than price', path: ['comparePrice'] },
  );
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Partial update; the price/pricingMode invariant is re-checked in the service. */
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(3).max(200).optional(),
    slug: slugSchema.optional(),
    sku: z.string().trim().min(1).max(60).toUpperCase().optional(),
    partNumber: z.string().trim().max(80).toUpperCase().nullable().optional(),
    description: z.string().trim().min(10).max(20000).optional(),
    shortDescription: z.string().trim().max(400).nullable().optional(),
    category: objectIdSchema.optional(),
    subCategory: objectIdSchema.nullable().optional(),
    brand: objectIdSchema.optional(),
    pricingMode: z.enum(['retail', 'quote', 'both']).optional(),
    price: z.number().nonnegative().nullable().optional(),
    comparePrice: z.number().nonnegative().nullable().optional(),
    costPrice: z.number().nonnegative().nullable().optional(),
    taxRate: z.number().min(0).max(100).optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'on_order']).optional(),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).optional(),
    minOrderQty: z.number().int().positive().optional(),
    specifications: z.array(specificationSchema).max(60).optional(),
    variants: z.array(variantSchema).max(40).optional(),
    tags: z.array(z.string().trim().max(40)).max(30).optional(),
    warranty: z.string().trim().max(120).nullable().optional(),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    isActive: z.boolean().optional(),
    seo: seoSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Stock is adjusted through its own audited endpoint, never a plain PATCH. */
export const stockAdjustmentSchema = z
  .object({
    mode: z.enum(['set', 'increment', 'decrement']),
    quantity: z.number().int().nonnegative(),
    reason: z.string().trim().min(3, 'A reason is required for the audit trail').max(200),
  })
  .refine((data) => data.mode === 'set' || data.quantity > 0, {
    message: 'Quantity must be greater than zero',
    path: ['quantity'],
  });
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const bulkProductSchema = z
  .object({
    ids: z.array(objectIdSchema).min(1, 'Select at least one product').max(500),
    action: z.enum(['activate', 'deactivate', 'delete', 'feature', 'unfeature', 'price_adjust']),
    /** Required for `price_adjust`. */
    adjust: z
      .object({
        type: z.enum(['percent', 'fixed']),
        /** Negative values reduce the price. */
        value: z.number(),
        field: z.enum(['price', 'comparePrice', 'costPrice']).default('price'),
        roundTo: z.number().int().nonnegative().default(0),
      })
      .optional(),
  })
  .refine((data) => data.action !== 'price_adjust' || data.adjust !== undefined, {
    message: 'A price adjustment needs an `adjust` block',
    path: ['adjust'],
  });
export type BulkProductInput = z.infer<typeof bulkProductSchema>;

export const adminProductQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  category: objectIdSchema.optional(),
  brand: objectIdSchema.optional(),
  pricingMode: z.enum(['retail', 'quote', 'both']).optional(),
  isActive: booleanQuerySchema.optional(),
  lowStock: booleanQuerySchema.optional(),
  outOfStock: booleanQuerySchema.optional(),
  tags: csvSchema.optional(),
  sort: z
    .enum(['newest', 'oldest', 'name', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc', 'sales'])
    .default('newest'),
});
export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('xlsx'),
  isActive: booleanQuerySchema.optional(),
  category: objectIdSchema.optional(),
  brand: objectIdSchema.optional(),
});

export const imageParamSchema = z.object({
  id: objectIdSchema,
  /** Cloudinary public ids contain slashes, so this arrives URL-encoded. */
  publicId: z.string().min(1).max(300),
});
```

## `server/src/validators/admin.taxonomy.validators.ts`

```ts
import { z } from 'zod';
import { booleanQuerySchema, objectIdSchema, slugSchema } from './common.validators';

/** Category, brand, banner and coupon payloads. */

const seoSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(180).optional(),
  keywords: z.array(z.string().trim().max(60)).max(20).default([]),
});

/* ------------------------------- Categories ------------------------------ */

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(1000).optional(),
  image: z.string().url().optional(),
  /** Lucide icon name shown in the mega-menu. */
  icon: z.string().trim().max(60).optional(),
  parent: objectIdSchema.nullable().default(null),
  displayOrder: z.number().int().nonnegative().default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  seo: seoSchema.optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/* --------------------------------- Brands -------------------------------- */

export const createBrandSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  logo: z.string().url().optional(),
  description: z.string().trim().max(1000).optional(),
  country: z.string().trim().max(60).optional(),
  website: z.string().url().optional(),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = createBrandSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

/* -------------------------------- Banners -------------------------------- */

export const createBannerSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    subtitle: z.string().trim().max(300).optional(),
    image: z.string().url(),
    mobileImage: z.string().url().optional(),
    link: z.string().trim().max(300).optional(),
    ctaText: z.string().trim().max(40).optional(),
    position: z.enum(['hero', 'strip', 'sidebar']).default('hero'),
    displayOrder: z.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });
export type CreateBannerInput = z.infer<typeof createBannerSchema>;

export const updateBannerSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    subtitle: z.string().trim().max(300).nullable().optional(),
    image: z.string().url().optional(),
    mobileImage: z.string().url().nullable().optional(),
    link: z.string().trim().max(300).nullable().optional(),
    ctaText: z.string().trim().max(40).nullable().optional(),
    position: z.enum(['hero', 'strip', 'sidebar']).optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

/* -------------------------------- Coupons -------------------------------- */

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, 'Letters, digits, hyphens and underscores only'),
    type: z.enum(['percent', 'fixed']),
    value: z.number().positive(),
    minOrder: z.number().nonnegative().default(0),
    maxDiscount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    validFrom: z.coerce.date().default(() => new Date()),
    validTo: z.coerce.date(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.type !== 'percent' || data.value <= 100, {
    message: 'A percentage discount cannot exceed 100',
    path: ['value'],
  })
  .refine((data) => data.validTo > data.validFrom, {
    message: 'validTo must be after validFrom',
    path: ['validTo'],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = z
  .object({
    type: z.enum(['percent', 'fixed']).optional(),
    value: z.number().positive().optional(),
    minOrder: z.number().nonnegative().optional(),
    maxDiscount: z.number().positive().nullable().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

/* -------------------------------- Reorder -------------------------------- */

/** Drag-and-drop reordering: the client posts the ids in their new order. */
export const reorderSchema = z.object({
  items: z
    .array(z.object({ id: objectIdSchema, displayOrder: z.number().int().nonnegative() }))
    .min(1)
    .max(500),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

export const taxonomyQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  isActive: booleanQuerySchema.optional(),
  parent: objectIdSchema.nullable().optional(),
  position: z.enum(['hero', 'strip', 'sidebar']).optional(),
});
```

## `server/src/validators/admin.ops.validators.ts`

```ts
import { z } from 'zod';
import {
  booleanQuerySchema,
  emailSchema,
  objectIdSchema,
  paginationSchema,
  phoneSchema,
} from './common.validators';

/** Admin order, quotation, customer, content and reporting payloads. */

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/* --------------------------------- Orders -------------------------------- */

export const adminOrderQuerySchema = paginationSchema
  .extend({
    search: z.string().trim().max(120).optional(),
    status: z
      .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
      .optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    paymentMethod: z.enum(['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa']).optional(),
    sort: z.enum(['newest', 'oldest', 'total_desc', 'total_asc']).default('newest'),
  })
  .merge(dateRangeSchema)
  .refine((query) => !query.from || !query.to || query.to >= query.from, {
    message: '`to` must not be earlier than `from`',
    path: ['to'],
  });
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
  ]),
  note: z.string().trim().max(500).optional(),
  /** Suppress the customer email for silent corrections. */
  notifyCustomer: z.boolean().default(true),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  transactionId: z.string().trim().max(120).optional(),
  provider: z.string().trim().max(60).optional(),
  receiptUrl: z.string().url().optional(),
  note: z.string().trim().max(500).optional(),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const updateTrackingSchema = z
  .object({
    trackingNumber: z.string().trim().max(120).optional(),
    courier: z.string().trim().max(80).optional(),
    /** Move the order to `shipped` at the same time. */
    markShipped: z.boolean().default(false),
  })
  .refine(
    (data) => data.trackingNumber !== undefined || data.courier !== undefined,
    'Provide a tracking number or a courier',
  );
export type UpdateTrackingInput = z.infer<typeof updateTrackingSchema>;

/* ------------------------------- Quotations ------------------------------ */

export const adminQuotationQuerySchema = paginationSchema
  .extend({
    search: z.string().trim().max(120).optional(),
    status: z
      .enum(['new', 'reviewing', 'quoted', 'negotiating', 'accepted', 'rejected', 'expired', 'converted'])
      .optional(),
    assignedTo: objectIdSchema.optional(),
    unassigned: booleanQuerySchema.optional(),
    sort: z.enum(['newest', 'oldest', 'required_by']).default('newest'),
  })
  .merge(dateRangeSchema);
export type AdminQuotationQuery = z.infer<typeof adminQuotationQuerySchema>;

/** Price the RFQ. Items are matched on SKU so the array order cannot corrupt data. */
export const priceQuotationSchema = z
  .object({
    items: z
      .array(
        z.object({
          sku: z.string().trim().min(1).max(60),
          quotedUnitPrice: z.number().nonnegative(),
          qty: z.number().int().positive().optional(),
        }),
      )
      .min(1),
    quotedTax: z.number().nonnegative().optional(),
    validUntil: z.coerce.date().optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    status: z.enum(['reviewing', 'quoted', 'negotiating', 'rejected', 'expired']).optional(),
  })
  .refine(
    (data) => !data.validUntil || data.validUntil.getTime() > Date.now(),
    { message: 'validUntil must be in the future', path: ['validUntil'] },
  );
export type PriceQuotationInput = z.infer<typeof priceQuotationSchema>;

export const assignQuotationSchema = z.object({
  assignedTo: objectIdSchema.nullable(),
});

export const convertQuotationSchema = z.object({
  paymentMethod: z.enum(['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa']).default('bank_transfer'),
  shippingAddress: z
    .object({
      label: z.string().trim().max(40).default('Delivery'),
      line1: z.string().trim().min(3).max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(2).max(80),
      province: z.string().trim().min(2).max(60),
      postalCode: z.string().trim().max(10).optional(),
      isDefault: z.boolean().default(false),
    })
    .optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ConvertQuotationInput = z.infer<typeof convertQuotationSchema>;

/* ------------------------------- Customers ------------------------------- */

export const adminUserQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(['customer', 'admin', 'manager']).optional(),
  isActive: booleanQuerySchema.optional(),
  sort: z.enum(['newest', 'oldest', 'name', 'last_login']).default('newest'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['customer', 'admin', 'manager']),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

/* -------------------------------- Content -------------------------------- */

export const contactQuerySchema = paginationSchema.extend({
  status: z.enum(['new', 'read', 'responded']).optional(),
  search: z.string().trim().max(120).optional(),
});

export const updateContactSchema = z.object({
  status: z.enum(['new', 'read', 'responded']),
});

export const newsletterQuerySchema = paginationSchema.extend({
  isActive: booleanQuerySchema.optional(),
});

export const auditQuerySchema = paginationSchema
  .extend({
    entity: z.string().trim().max(60).optional(),
    entityId: z.string().trim().max(60).optional(),
    actor: objectIdSchema.optional(),
    action: z
      .enum(['create', 'update', 'delete', 'login', 'logout', 'status_change'])
      .optional(),
  })
  .merge(dateRangeSchema);

export const updateSettingsSchema = z
  .object({
    storeName: z.string().trim().min(2).max(120).optional(),
    tagline: z.string().trim().max(200).optional(),
    logo: z.string().url().optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    landline: z.string().trim().max(24).optional(),
    whatsapp: z.string().trim().max(24).optional(),
    address: z.string().trim().max(300).optional(),
    mapEmbedUrl: z.string().url().optional(),
    social: z
      .object({
        facebook: z.string().url().optional(),
        instagram: z.string().url().optional(),
        linkedin: z.string().url().optional(),
        youtube: z.string().url().optional(),
        whatsapp: z.string().url().optional(),
      })
      .optional(),
    businessHours: z
      .array(
        z.object({
          days: z.string().trim().min(1).max(60),
          open: z.string().trim().max(20),
          close: z.string().trim().max(20),
          note: z.string().trim().max(120).optional(),
        }),
      )
      .max(10)
      .optional(),
    shippingRules: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          city: z.string().trim().min(1).max(80),
          cost: z.number().nonnegative(),
          freeAbove: z.number().nonnegative().optional(),
          etaDays: z.string().trim().min(1).max(60),
        }),
      )
      .max(30)
      .optional(),
    defaultTaxRate: z.number().min(0).max(100).optional(),
    announcement: z
      .object({
        text: z.string().trim().max(200).optional(),
        link: z.string().trim().max(300).optional(),
        isActive: z.boolean().default(false),
      })
      .optional(),
    bankDetails: z
      .object({
        bankName: z.string().trim().min(2).max(120),
        accountTitle: z.string().trim().min(2).max(120),
        accountNumber: z.string().trim().min(4).max(40),
        iban: z.string().trim().max(40).optional(),
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/* -------------------------------- Reports -------------------------------- */

export const dashboardChartQuerySchema = z.object({
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  days: z.coerce.number().int().positive().max(730).default(30),
});

export const reportQuerySchema = dateRangeSchema.extend({
  type: z.enum(['sales', 'inventory', 'customer']),
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;
```

## `server/src/services/dashboard.service.ts`

```ts
import type { PipelineStage, Types } from 'mongoose';
import { Contact, Order, Product, Quotation, Review, User } from '../models';

/**
 * Dashboard KPIs.
 *
 * "Revenue" counts only orders that were actually paid for or delivered —
 * cancelled and returned orders are excluded everywhere so the numbers match
 * what is in the till.
 */

/** Orders that represent real money. */
const REVENUE_MATCH = {
  orderStatus: { $nin: ['cancelled', 'returned'] },
} as const;

export interface PeriodRevenue {
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  revenue: { today: PeriodRevenue; week: PeriodRevenue; month: PeriodRevenue; year: PeriodRevenue };
  ordersByStatus: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  quotations: { new: number; awaitingResponse: number; total: number };
  inventory: { lowStock: number; outOfStock: number; totalActive: number };
  customers: { newThisMonth: number; total: number };
  averageOrderValue: number;
  /** Quotations that became orders, as a percentage of all quotations. */
  quotationConversionRate: number;
  /** Carts that became orders this month, as a percentage of carts created. */
  checkoutConversionRate: number;
  pending: { reviews: number; contacts: number };
}

function startOf(unit: 'day' | 'week' | 'month' | 'year'): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (unit === 'week') {
    // Week starts Monday — the Pakistani working week runs Mon–Sat.
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
  }
  if (unit === 'month') date.setDate(1);
  if (unit === 'year') {
    date.setMonth(0);
    date.setDate(1);
  }
  return date;
}

async function revenueSince(since: Date): Promise<PeriodRevenue> {
  const [row] = await Order.aggregate<{ revenue: number; orders: number }>([
    { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  ]);
  return { revenue: Math.round(row?.revenue ?? 0), orders: row?.orders ?? 0 };
}

async function countBy(field: 'orderStatus' | 'paymentStatus'): Promise<Record<string, number>> {
  const rows = await Order.aggregate<{ _id: string; count: number }>([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

export async function getStats(): Promise<DashboardStats> {
  const monthStart = startOf('month');

  const [
    today,
    week,
    month,
    year,
    ordersByStatus,
    paymentsByStatus,
    newQuotations,
    awaitingResponse,
    totalQuotations,
    convertedQuotations,
    lowStock,
    outOfStock,
    totalActive,
    newCustomers,
    totalCustomers,
    aovRow,
    pendingReviews,
    newContacts,
    ordersThisMonth,
  ] = await Promise.all([
    revenueSince(startOf('day')),
    revenueSince(startOf('week')),
    revenueSince(monthStart),
    revenueSince(startOf('year')),
    countBy('orderStatus'),
    countBy('paymentStatus'),
    Quotation.countDocuments({ status: 'new' }),
    Quotation.countDocuments({ status: { $in: ['quoted', 'negotiating'] } }),
    Quotation.countDocuments({}),
    Quotation.countDocuments({ status: 'converted' }),
    Product.countDocuments({
      isActive: true,
      stock: { $gt: 0 },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }),
    Product.countDocuments({ isActive: true, stock: { $lte: 0 } }),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: monthStart } }),
    User.countDocuments({ role: 'customer' }),
    Order.aggregate<{ avg: number }>([
      { $match: REVENUE_MATCH },
      { $group: { _id: null, avg: { $avg: '$total' } } },
    ]),
    Review.countDocuments({ isApproved: false }),
    Contact.countDocuments({ status: 'new' }),
    Order.countDocuments({ ...REVENUE_MATCH, createdAt: { $gte: monthStart } }),
  ]);

  // Checkout conversion: orders placed this month vs. shopping carts touched.
  const cartsThisMonth = await Order.db
    .collection('carts')
    .countDocuments({ type: 'shopping', updatedAt: { $gte: monthStart } });

  const pct = (part: number, whole: number): number =>
    whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

  return {
    revenue: { today, week, month, year },
    ordersByStatus,
    paymentsByStatus,
    quotations: { new: newQuotations, awaitingResponse, total: totalQuotations },
    inventory: { lowStock, outOfStock, totalActive },
    customers: { newThisMonth: newCustomers, total: totalCustomers },
    averageOrderValue: Math.round(aovRow[0]?.avg ?? 0),
    quotationConversionRate: pct(convertedQuotations, totalQuotations),
    checkoutConversionRate: pct(ordersThisMonth, Math.max(cartsThisMonth, ordersThisMonth)),
    pending: { reviews: pendingReviews, contacts: newContacts },
  };
}

/* --------------------------------- Charts -------------------------------- */

export interface SalesPoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface NamedTotal {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

export interface DashboardCharts {
  salesOverTime: SalesPoint[];
  topProducts: NamedTotal[];
  revenueByCategory: NamedTotal[];
  revenueByBrand: NamedTotal[];
}

const FORMATS = { daily: '%Y-%m-%d', weekly: '%G-W%V', monthly: '%Y-%m' } as const;

export async function getCharts(
  granularity: keyof typeof FORMATS,
  days: number,
): Promise<DashboardCharts> {
  const since = new Date(Date.now() - days * 86_400_000);
  const match = { ...REVENUE_MATCH, createdAt: { $gte: since } };

  const salesPipeline: PipelineStage[] = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: FORMATS[granularity], date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  /** Revenue attributed per line item, joined to a lookup collection. */
  const byRef = (from: string, localField: string): PipelineStage[] => [
    { $match: match },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $group: {
        _id: `$product.${localField}`,
        revenue: { $sum: '$items.subtotal' },
        units: { $sum: '$items.qty' },
      },
    },
    { $lookup: { from, localField: '_id', foreignField: '_id', as: 'ref' } },
    { $unwind: '$ref' },
    { $project: { name: '$ref.name', revenue: 1, units: 1 } },
    { $sort: { revenue: -1 } },
    { $limit: 12 },
  ];

  const [sales, topProducts, byCategory, byBrand] = await Promise.all([
    Order.aggregate<{ _id: string; revenue: number; orders: number }>(salesPipeline),
    Order.aggregate<{ _id: Types.ObjectId; name: string; revenue: number; units: number }>([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          revenue: { $sum: '$items.subtotal' },
          units: { $sum: '$items.qty' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
    Order.aggregate<{ _id: Types.ObjectId; name: string; revenue: number; units: number }>(
      byRef('categories', 'category'),
    ),
    Order.aggregate<{ _id: Types.ObjectId; name: string; revenue: number; units: number }>(
      byRef('brands', 'brand'),
    ),
  ]);

  const toNamed = (rows: { _id: Types.ObjectId; name: string; revenue: number; units: number }[]): NamedTotal[] =>
    rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
      revenue: Math.round(row.revenue),
      units: row.units,
    }));

  return {
    salesOverTime: sales.map((row) => ({
      period: row._id,
      revenue: Math.round(row.revenue),
      orders: row.orders,
    })),
    topProducts: toNamed(topProducts),
    revenueByCategory: toNamed(byCategory),
    revenueByBrand: toNamed(byBrand),
  };
}

/* --------------------------------- Recent -------------------------------- */

export async function getRecent(): Promise<Record<string, unknown[]>> {
  const [orders, quotations, reviews, contacts] = await Promise.all([
    Order.find()
      .select('orderNumber customer total orderStatus paymentStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Quotation.find()
      .select('quoteNumber customer status quotedTotal createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Review.find()
      .select('product user rating title isApproved createdAt')
      .populate({ path: 'user', select: 'name' })
      .populate({ path: 'product', select: 'name slug' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Contact.find()
      .select('name email subject status createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return { orders, quotations, reviews, contacts };
}
```

## `server/src/services/report.service.ts`

```ts
import type { Types } from 'mongoose';
import { Order, Product, User } from '../models';

/**
 * Operational reports. Each returns a flat row set so the same data can be
 * rendered as JSON in the admin UI or streamed out as CSV/XLSX.
 */

export interface ReportResult<T> {
  title: string;
  generatedAt: string;
  range: { from: string | null; to: string | null };
  summary: Record<string, number | string>;
  rows: T[];
}

const REVENUE_MATCH = { orderStatus: { $nin: ['cancelled', 'returned'] } } as const;

function rangeMatch(from?: Date, to?: Date): Record<string, unknown> {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    },
  };
}

/* ------------------------------ Sales report ----------------------------- */

export interface SalesRow {
  orderNumber: string;
  date: string;
  customer: string;
  city: string;
  items: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
}

export async function salesReport(from?: Date, to?: Date): Promise<ReportResult<SalesRow>> {
  const filter = { ...REVENUE_MATCH, ...rangeMatch(from, to) };
  const orders = await Order.find(filter).sort({ createdAt: 1 }).lean();

  const rows: SalesRow[] = orders.map((order) => ({
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString().slice(0, 10),
    customer: order.customer.name,
    city: order.shippingAddress.city,
    items: order.items.reduce((sum, item) => sum + item.qty, 0),
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.taxAmount,
    shipping: order.shippingCost,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
  }));

  const revenue = rows.reduce((sum, row) => sum + row.total, 0);

  return {
    title: 'Sales report',
    generatedAt: new Date().toISOString(),
    range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    summary: {
      orders: rows.length,
      revenue: Math.round(revenue),
      averageOrderValue: rows.length ? Math.round(revenue / rows.length) : 0,
      unitsSold: rows.reduce((sum, row) => sum + row.items, 0),
      totalDiscount: Math.round(rows.reduce((sum, row) => sum + row.discount, 0)),
    },
    rows,
  };
}

/* ---------------------------- Inventory report --------------------------- */

export interface InventoryRow {
  sku: string;
  name: string;
  brand: string;
  category: string;
  pricingMode: string;
  stock: number;
  lowStockThreshold: number;
  stockStatus: string;
  unit: string;
  price: number | '';
  costPrice: number | '';
  /** stock × costPrice — what is sitting on the shelf. */
  stockValue: number;
  salesCount: number;
}

interface PopulatedProduct {
  sku: string;
  name: string;
  brand?: { name?: string } | null;
  category?: { name?: string } | null;
  pricingMode: string;
  stock: number;
  lowStockThreshold: number;
  stockStatus: string;
  unit: string;
  price?: number;
  costPrice?: number;
  salesCount: number;
}

export async function inventoryReport(): Promise<ReportResult<InventoryRow>> {
  // `+costPrice` is required: it is `select: false` for public safety.
  const products = await Product.find({})
    .select('+costPrice')
    .populate({ path: 'brand', select: 'name' })
    .populate({ path: 'category', select: 'name' })
    .sort({ stock: 1, name: 1 })
    .lean<PopulatedProduct[]>();

  const rows: InventoryRow[] = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    brand: product.brand?.name ?? '',
    category: product.category?.name ?? '',
    pricingMode: product.pricingMode,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    stockStatus: product.stockStatus,
    unit: product.unit,
    price: product.price ?? '',
    costPrice: product.costPrice ?? '',
    stockValue: Math.round(product.stock * (product.costPrice ?? 0)),
    salesCount: product.salesCount,
  }));

  return {
    title: 'Inventory report',
    generatedAt: new Date().toISOString(),
    range: { from: null, to: null },
    summary: {
      products: rows.length,
      outOfStock: rows.filter((row) => row.stock <= 0).length,
      lowStock: rows.filter((row) => row.stock > 0 && row.stock <= row.lowStockThreshold).length,
      totalStockValue: rows.reduce((sum, row) => sum + row.stockValue, 0),
    },
    rows,
  };
}

/* ---------------------------- Customer report ---------------------------- */

export interface CustomerRow {
  name: string;
  email: string;
  phone: string;
  company: string;
  joined: string;
  orders: number;
  lifetimeValue: number;
  lastOrder: string;
}

export async function customerReport(from?: Date, to?: Date): Promise<ReportResult<CustomerRow>> {
  const users = await User.find({ role: 'customer', ...rangeMatch(from, to) })
    .sort({ createdAt: -1 })
    .lean();

  const totals = await Order.aggregate<{
    _id: Types.ObjectId | null;
    orders: number;
    value: number;
    last: Date;
  }>([
    { $match: { ...REVENUE_MATCH, user: { $ne: null } } },
    {
      $group: {
        _id: '$user',
        orders: { $sum: 1 },
        value: { $sum: '$total' },
        last: { $max: '$createdAt' },
      },
    },
  ]);

  const byUser = new Map(totals.filter((row) => row._id).map((row) => [String(row._id), row]));

  const rows: CustomerRow[] = users.map((user) => {
    const stats = byUser.get(user._id.toString());
    return {
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.companyName ?? '',
      joined: user.createdAt.toISOString().slice(0, 10),
      orders: stats?.orders ?? 0,
      lifetimeValue: Math.round(stats?.value ?? 0),
      lastOrder: stats?.last ? stats.last.toISOString().slice(0, 10) : '',
    };
  });

  const withOrders = rows.filter((row) => row.orders > 0);

  return {
    title: 'Customer report',
    generatedAt: new Date().toISOString(),
    range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    summary: {
      customers: rows.length,
      purchasers: withOrders.length,
      repeatBuyers: rows.filter((row) => row.orders > 1).length,
      totalLifetimeValue: rows.reduce((sum, row) => sum + row.lifetimeValue, 0),
      averageLifetimeValue: withOrders.length
        ? Math.round(withOrders.reduce((sum, row) => sum + row.lifetimeValue, 0) / withOrders.length)
        : 0,
    },
    rows,
  };
}
```

## `server/src/services/product.admin.service.ts`

```ts
import { Types } from 'mongoose';
import { Brand, Category, Product, type IProduct, type ProductDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import { uniqueSlug } from '../utils/slug';
import type { BulkProductInput, CreateProductInput, StockAdjustmentInput, UpdateProductInput } from '../validators';

/** Admin write operations on the catalogue. */

/** Reject references to categories or brands that do not exist. */
async function assertRefs(categoryId?: string, subCategoryId?: string | null, brandId?: string): Promise<void> {
  const checks: Promise<void>[] = [];

  if (categoryId) {
    checks.push(
      Category.exists({ _id: categoryId }).then((found) => {
        if (!found) throw ApiError.badRequest('The selected category does not exist');
      }),
    );
  }
  if (subCategoryId) {
    checks.push(
      Category.exists({ _id: subCategoryId }).then((found) => {
        if (!found) throw ApiError.badRequest('The selected sub-category does not exist');
      }),
    );
  }
  if (brandId) {
    checks.push(
      Brand.exists({ _id: brandId }).then((found) => {
        if (!found) throw ApiError.badRequest('The selected brand does not exist');
      }),
    );
  }

  await Promise.all(checks);
}

export async function createProduct(input: CreateProductInput): Promise<ProductDocument> {
  if (await Product.exists({ sku: input.sku })) {
    throw ApiError.conflict(`SKU "${input.sku}" is already in use`);
  }
  await assertRefs(input.category, input.subCategory, input.brand);

  const slug = input.slug ?? (await uniqueSlug(Product, input.name));

  return Product.create({
    ...input,
    slug,
    subCategory: input.subCategory ? new Types.ObjectId(input.subCategory) : null,
    category: new Types.ObjectId(input.category),
    brand: new Types.ObjectId(input.brand),
  });
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDocument> {
  const product = await Product.findById(id).select('+costPrice');
  if (!product) throw ApiError.notFound('Product not found');

  if (input.sku && input.sku !== product.sku) {
    if (await Product.exists({ sku: input.sku, _id: { $ne: id } })) {
      throw ApiError.conflict(`SKU "${input.sku}" is already in use`);
    }
  }
  await assertRefs(input.category, input.subCategory, input.brand);

  // Renaming regenerates the slug unless one was supplied explicitly.
  if (input.slug) {
    product.slug = input.slug;
  } else if (input.name && input.name !== product.name) {
    product.slug = await uniqueSlug(Product, input.name, id);
  }

  const { slug: _slug, subCategory, category, brand, ...rest } = input;

  for (const [key, value] of Object.entries(rest)) {
    // `null` from the client means "clear this optional field".
    product.set(key, value === null ? undefined : value);
  }
  if (subCategory !== undefined) {
    product.subCategory = subCategory ? new Types.ObjectId(subCategory) : null;
  }
  if (category) product.category = new Types.ObjectId(category);
  if (brand) product.brand = new Types.ObjectId(brand);

  // Guard the hybrid-commerce invariant across partial updates.
  if (product.pricingMode !== 'quote' && typeof product.price !== 'number') {
    throw ApiError.badRequest('A price is required unless the product is quote-only');
  }

  await product.save();
  return product;
}

/** Soft delete — history and order lines must keep resolving. */
export async function softDeleteProduct(id: string): Promise<ProductDocument> {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  product.isActive = false;
  await product.save();
  return product;
}

/* ------------------------------ Stock control ---------------------------- */

export interface StockChange {
  product: ProductDocument;
  previous: number;
  next: number;
}

export async function adjustStock(id: string, input: StockAdjustmentInput): Promise<StockChange> {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  const previous = product.stock;
  const next =
    input.mode === 'set'
      ? input.quantity
      : input.mode === 'increment'
        ? previous + input.quantity
        : previous - input.quantity;

  if (next < 0) {
    throw ApiError.badRequest(`Cannot remove ${input.quantity} — only ${previous} in stock`);
  }

  product.stock = next;
  // The model's pre-save hook re-derives stockStatus from the new figure.
  await product.save();

  return { product, previous, next };
}

/* ----------------------------- Bulk operations --------------------------- */

export interface BulkResult {
  action: string;
  matched: number;
  modified: number;
}

function round(value: number, roundTo: number): number {
  if (roundTo <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / roundTo) * roundTo;
}

export async function bulkUpdate(input: BulkProductInput): Promise<BulkResult> {
  const ids = input.ids.map((id) => new Types.ObjectId(id));
  const filter = { _id: { $in: ids } };

  const simple: Record<string, Partial<IProduct>> = {
    activate: { isActive: true },
    deactivate: { isActive: false },
    delete: { isActive: false }, // soft delete
    feature: { isFeatured: true },
    unfeature: { isFeatured: false },
  };

  const patch = simple[input.action];
  if (patch) {
    const result = await Product.updateMany(filter, { $set: patch });
    return { action: input.action, matched: result.matchedCount, modified: result.modifiedCount };
  }

  // Price adjustment: read, compute, write — the maths is too conditional for
  // an aggregation pipeline update and these batches are small.
  const adjust = input.adjust;
  if (!adjust) throw ApiError.badRequest('A price adjustment needs an `adjust` block');

  const products = await Product.find(filter).select('+costPrice');
  let modified = 0;

  for (const product of products) {
    const current: unknown = product.get(adjust.field);
    if (typeof current !== 'number') continue;

    const delta = adjust.type === 'percent' ? (current * adjust.value) / 100 : adjust.value;
    const next = round(Math.max(0, current + delta), adjust.roundTo);

    if (next === current) continue;
    product.set(adjust.field, next);
    await product.save();
    modified += 1;
  }

  return { action: input.action, matched: products.length, modified };
}
```

## `server/src/services/product.import.service.ts`

```ts
import type { Types } from 'mongoose';
import { z } from 'zod';
import { Brand, Category, Product } from '../models';
import { uniqueSlug } from '../utils/slug';
import { parseSheet } from './sheet.service';

/**
 * CSV / XLSX product import.
 *
 * Every row is validated independently and the whole run is reported back —
 * a bad row is skipped and named, never silently dropped, and never aborts the
 * rows around it. `dryRun` lets an admin preview the report before committing.
 */

/** Accepts blank, "1", "true", "yes", "y". */
const sheetBoolean = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === '') return undefined;
    return ['1', 'true', 'yes', 'y'].includes(String(value).trim().toLowerCase());
  });

const sheetNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === '') return undefined;
    // Tolerate "1,250" and "Rs. 1250" from hand-edited sheets.
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => value === undefined || !Number.isNaN(value), 'Must be a number');

const rowSchema = z.object({
  sku: z.string().trim().min(1, 'sku is required').max(60).toUpperCase(),
  name: z.string().trim().min(3, 'name is required').max(200),
  description: z.string().trim().max(20000).optional(),
  shortDescription: z.string().trim().max(400).optional(),
  partNumber: z.string().trim().max(80).optional(),
  categorySlug: z.string().trim().min(1, 'categorySlug is required'),
  subCategorySlug: z.string().trim().optional(),
  brandSlug: z.string().trim().min(1, 'brandSlug is required'),
  pricingMode: z.enum(['retail', 'quote', 'both']),
  price: sheetNumber,
  comparePrice: sheetNumber,
  costPrice: sheetNumber,
  taxRate: sheetNumber,
  stock: sheetNumber,
  lowStockThreshold: sheetNumber,
  unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).optional(),
  minOrderQty: sheetNumber,
  tags: z.string().trim().optional(),
  warranty: z.string().trim().max(120).optional(),
  /** `Key:Value|Key:Value`, matching the storefront filter syntax. */
  specifications: z.string().trim().optional(),
  isFeatured: sheetBoolean,
  isActive: sheetBoolean,
});

export interface RowIssue {
  /** 1-based row number as it appears in the spreadsheet, header excluded. */
  row: number;
  sku: string;
  errors: string[];
}

export interface ImportReport {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  issues: RowIssue[];
  /** Column headers the importer recognises, for the admin UI's help text. */
  recognisedColumns: string[];
}

export const IMPORT_COLUMNS = Object.keys(rowSchema.shape);

function parseSpecs(value?: string): { key: string; value: string }[] {
  if (!value) return [];
  return value
    .split('|')
    .map((pair) => {
      const index = pair.indexOf(':');
      if (index < 1) return null;
      return { key: pair.slice(0, index).trim(), value: pair.slice(index + 1).trim() };
    })
    .filter((item): item is { key: string; value: string } => item !== null && item.value !== '');
}

export async function importProducts(buffer: Buffer, dryRun: boolean): Promise<ImportReport> {
  const rows = parseSheet(buffer);
  const issues: RowIssue[] = [];
  let created = 0;
  let updated = 0;

  // Resolve the taxonomy once rather than per row.
  const [categories, brands] = await Promise.all([
    Category.find().select('slug').lean<{ _id: Types.ObjectId; slug: string }[]>(),
    Brand.find().select('slug').lean<{ _id: Types.ObjectId; slug: string }[]>(),
  ]);
  const categoryBySlug = new Map(categories.map((item) => [item.slug.toLowerCase(), item._id]));
  const brandBySlug = new Map(brands.map((item) => [item.slug.toLowerCase(), item._id]));

  for (const [index, raw] of rows.entries()) {
    const rowNumber = index + 1;
    const parsed = rowSchema.safeParse(raw);

    if (!parsed.success) {
      issues.push({
        row: rowNumber,
        sku: typeof raw.sku === 'string' ? raw.sku : '',
        errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      });
      continue;
    }

    const data = parsed.data;
    const errors: string[] = [];

    const categoryId = categoryBySlug.get(data.categorySlug.toLowerCase());
    if (!categoryId) errors.push(`categorySlug: "${data.categorySlug}" not found`);

    const brandId = brandBySlug.get(data.brandSlug.toLowerCase());
    if (!brandId) errors.push(`brandSlug: "${data.brandSlug}" not found`);

    const subCategoryId = data.subCategorySlug
      ? categoryBySlug.get(data.subCategorySlug.toLowerCase())
      : undefined;
    if (data.subCategorySlug && !subCategoryId) {
      errors.push(`subCategorySlug: "${data.subCategorySlug}" not found`);
    }

    if (data.pricingMode !== 'quote' && typeof data.price !== 'number') {
      errors.push('price: required unless pricingMode is "quote"');
    }

    if (errors.length > 0 || !categoryId || !brandId) {
      issues.push({ row: rowNumber, sku: data.sku, errors });
      continue;
    }

    const existing = await Product.findOne({ sku: data.sku });

    if (dryRun) {
      if (existing) updated += 1;
      else created += 1;
      continue;
    }

    const payload = {
      name: data.name,
      ...(data.description ? { description: data.description } : {}),
      ...(data.shortDescription ? { shortDescription: data.shortDescription } : {}),
      ...(data.partNumber ? { partNumber: data.partNumber } : {}),
      category: categoryId,
      subCategory: subCategoryId ?? null,
      brand: brandId,
      pricingMode: data.pricingMode,
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.comparePrice !== undefined ? { comparePrice: data.comparePrice } : {}),
      ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
      ...(data.taxRate !== undefined ? { taxRate: data.taxRate } : {}),
      ...(data.stock !== undefined ? { stock: data.stock } : {}),
      ...(data.lowStockThreshold !== undefined ? { lowStockThreshold: data.lowStockThreshold } : {}),
      ...(data.unit ? { unit: data.unit } : {}),
      ...(data.minOrderQty !== undefined ? { minOrderQty: data.minOrderQty } : {}),
      ...(data.tags ? { tags: data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) } : {}),
      ...(data.warranty ? { warranty: data.warranty } : {}),
      ...(data.specifications ? { specifications: parseSpecs(data.specifications) } : {}),
      ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    };

    if (existing) {
      existing.set(payload);
      await existing.save();
      updated += 1;
    } else {
      await Product.create({
        ...payload,
        sku: data.sku,
        description: data.description ?? data.name,
        slug: await uniqueSlug(Product, data.name),
      });
      created += 1;
    }
  }

  return {
    totalRows: rows.length,
    created,
    updated,
    skipped: issues.length,
    dryRun,
    issues,
    recognisedColumns: IMPORT_COLUMNS,
  };
}
```

## `server/src/services/product.export.service.ts`

```ts
import type { FilterQuery } from 'mongoose';
import { Product, type IProduct } from '../models';
import { buildSheet, type SheetFile, type SheetFormat } from './sheet.service';

/**
 * Product export.
 *
 * Column names match the importer exactly, so an export can be edited in Excel
 * and fed straight back through `POST /admin/products/import`.
 */

interface PopulatedProduct {
  sku: string;
  name: string;
  slug: string;
  partNumber?: string;
  shortDescription?: string;
  description: string;
  category?: { slug?: string } | null;
  subCategory?: { slug?: string } | null;
  brand?: { slug?: string } | null;
  pricingMode: string;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  stockStatus: string;
  unit: string;
  minOrderQty: number;
  tags: string[];
  warranty?: string;
  specifications: { key: string; value: string }[];
  isFeatured: boolean;
  isActive: boolean;
  ratingAvg: number;
  reviewCount: number;
  salesCount: number;
  createdAt: Date;
}

export interface ExportFilters {
  isActive?: boolean;
  category?: string;
  brand?: string;
}

export async function exportProducts(
  filters: ExportFilters,
  format: SheetFormat,
): Promise<SheetFile> {
  const query: FilterQuery<IProduct> = {
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.brand ? { brand: filters.brand } : {}),
  };

  // `+costPrice` is opt-in: it is `select: false` so it can never leak publicly.
  const products = await Product.find(query)
    .select('+costPrice')
    .populate({ path: 'category', select: 'slug' })
    .populate({ path: 'subCategory', select: 'slug' })
    .populate({ path: 'brand', select: 'slug' })
    .sort({ name: 1 })
    .lean<PopulatedProduct[]>();

  const rows = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    partNumber: product.partNumber ?? '',
    categorySlug: product.category?.slug ?? '',
    subCategorySlug: product.subCategory?.slug ?? '',
    brandSlug: product.brand?.slug ?? '',
    pricingMode: product.pricingMode,
    price: product.price ?? '',
    comparePrice: product.comparePrice ?? '',
    costPrice: product.costPrice ?? '',
    taxRate: product.taxRate,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
    minOrderQty: product.minOrderQty,
    tags: product.tags.join(','),
    warranty: product.warranty ?? '',
    specifications: product.specifications
      .map((spec) => `${spec.key}:${spec.value}`)
      .join('|'),
    shortDescription: product.shortDescription ?? '',
    description: product.description,
    isFeatured: product.isFeatured ? 'yes' : 'no',
    isActive: product.isActive ? 'yes' : 'no',
    // Read-only columns, ignored by the importer.
    stockStatus: product.stockStatus,
    ratingAvg: product.ratingAvg,
    reviewCount: product.reviewCount,
    salesCount: product.salesCount,
    slug: product.slug,
    createdAt: product.createdAt.toISOString().slice(0, 10),
  }));

  return buildSheet(rows, { format, sheetName: 'Products', filenameBase: 'fast-traders-products' });
}
```

## `server/src/services/quotation.admin.service.ts`

```ts
import type { Types } from 'mongoose';
import {
  Order,
  Product,
  Quotation,
  Setting,
  type IOrderItem,
  type ISetting,
  type OrderDocument,
  type QuotationDocument,
} from '../models';
import { ApiError } from '../utils/ApiError';
import { resolveShipping } from './pricing.service';
import type { ConvertQuotationInput, PriceQuotationInput } from '../validators';

/** Admin-side quotation pricing and conversion to an order. */

/**
 * Apply per-line prices. Items are matched on SKU rather than array index, so
 * a reordered payload cannot silently price the wrong line.
 */
export async function priceQuotation(
  quotation: QuotationDocument,
  input: PriceQuotationInput,
): Promise<QuotationDocument> {
  const bySku = new Map(input.items.map((item) => [item.sku.toUpperCase(), item]));
  const unknown = [...bySku.keys()].filter(
    (sku) => !quotation.items.some((item) => item.sku.toUpperCase() === sku),
  );

  if (unknown.length > 0) {
    throw ApiError.badRequest(`These SKUs are not on this quotation: ${unknown.join(', ')}`);
  }

  for (const item of quotation.items) {
    const priced = bySku.get(item.sku.toUpperCase());
    if (!priced) continue;
    item.quotedUnitPrice = priced.quotedUnitPrice;
    if (priced.qty !== undefined) item.qty = priced.qty;
  }

  if (input.quotedTax !== undefined) quotation.quotedTax = input.quotedTax;
  if (input.validUntil) quotation.validUntil = input.validUntil;
  if (input.adminNotes) quotation.adminNotes = input.adminNotes;

  const fullyPriced = quotation.items.every((item) => typeof item.quotedUnitPrice === 'number');
  // Explicit status wins; otherwise a fully priced RFQ becomes `quoted`.
  quotation.status = input.status ?? (fullyPriced ? 'quoted' : 'reviewing');

  // The model's pre-save hook recomputes quotedSubtotal and quotedTotal.
  await quotation.save();
  return quotation;
}

/**
 * Turn an accepted quotation into an order.
 *
 * Prices come from the quotation, not the live catalogue — the customer
 * accepted those figures and they must not move underneath them.
 */
export async function convertToOrder(
  quotation: QuotationDocument,
  input: ConvertQuotationInput,
): Promise<OrderDocument> {
  if (quotation.status === 'converted' || quotation.convertedOrder) {
    throw ApiError.conflict('This quotation has already been converted to an order');
  }
  if (quotation.status !== 'accepted') {
    throw ApiError.badRequest(
      `Only an accepted quotation can be converted (current status: ${quotation.status})`,
    );
  }

  const unpriced = quotation.items.filter((item) => typeof item.quotedUnitPrice !== 'number');
  if (unpriced.length > 0) {
    throw ApiError.badRequest(
      `These lines still have no price: ${unpriced.map((item) => item.sku).join(', ')}`,
    );
  }

  const products = await Product.find({
    _id: { $in: quotation.items.map((item) => item.product) },
  })
    .select('images')
    .lean<{ _id: Types.ObjectId; images: { url: string }[] }[]>();
  const imageById = new Map(products.map((product) => [product._id.toString(), product.images[0]?.url]));

  const items: IOrderItem[] = quotation.items.map((item) => {
    const price = item.quotedUnitPrice ?? 0;
    const image = imageById.get(item.product.toString());
    return {
      product: item.product,
      name: item.name,
      sku: item.sku,
      ...(image ? { image } : {}),
      price,
      qty: item.qty,
      unit: item.unit,
      subtotal: Math.round(price * item.qty * 100) / 100,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  const address = input.shippingAddress ?? {
    label: 'Delivery',
    line1: 'To be confirmed with the customer',
    city: quotation.customer.city ?? 'Lahore',
    province: 'Punjab',
    isDefault: false,
  };

  const settings = await Setting.findOne({ key: 'global' })
    .select('shippingRules defaultTaxRate')
    .lean<Pick<ISetting, 'shippingRules' | 'defaultTaxRate'>>();

  const { cost: shippingCost } = resolveShipping(settings, address.city, subtotal);
  // Honour the tax that was quoted; fall back to the default rate.
  const taxAmount =
    quotation.quotedTax ?? Math.round((subtotal * (settings?.defaultTaxRate ?? 18)) / 100);

  const order = await Order.create({
    user: quotation.user,
    items,
    customer: quotation.customer,
    shippingAddress: address,
    billingAddress: address,
    sameAsBilling: true,
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount,
    shippingCost,
    discount: 0,
    total: Math.round((subtotal + taxAmount + shippingCost) * 100) / 100,
    paymentMethod: input.paymentMethod,
    paymentStatus: 'pending',
    orderStatus: 'confirmed',
    notes: [`Converted from quotation ${quotation.quoteNumber}`, input.notes]
      .filter(Boolean)
      .join('\n'),
    statusHistory: [
      {
        status: 'confirmed',
        note: `Created from accepted quotation ${quotation.quoteNumber}`,
        at: new Date(),
      },
    ],
  });

  quotation.status = 'converted';
  quotation.convertedOrder = order._id;
  await quotation.save();

  return order;
}

/** Quotations whose validity window has lapsed. Called by the admin list view. */
export async function expireStaleQuotations(): Promise<number> {
  const result = await Quotation.updateMany(
    { status: { $in: ['quoted', 'negotiating'] }, validUntil: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  );
  return result.modifiedCount;
}
```

## `server/src/services/sheet.service.ts`

```ts
import * as XLSX from 'xlsx';

/**
 * Spreadsheet helpers built on SheetJS.
 * One implementation serves both CSV and XLSX so exports stay consistent.
 */

export type SheetFormat = 'csv' | 'xlsx';

export interface SheetFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

const CONTENT_TYPES: Record<SheetFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Widen columns to roughly fit their content — Excel's default is unusable. */
function autoWidth(rows: Record<string, unknown>[], headers: string[]): XLSX.ColInfo[] {
  return headers.map((header) => {
    const longest = rows.reduce((max, row) => {
      const value = row[header];
      const text = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
      return Math.max(max, value === null || value === undefined ? 0 : text.length);
    }, header.length);
    return { wch: Math.min(Math.max(longest + 2, 10), 60) };
  });
}

export function buildSheet(
  rows: Record<string, unknown>[],
  options: { format: SheetFormat; sheetName?: string; filenameBase: string },
): SheetFile {
  const { format, sheetName = 'Sheet1', filenameBase } = options;
  const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet['!cols'] = autoWidth(rows, headers);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${filenameBase}-${stamp}.${format}`;

  if (format === 'csv') {
    // Prefix a BOM so Excel opens UTF-8 (Rs., ², ×) correctly.
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    // U+FEFF byte-order mark so Excel opens the file as UTF-8.
    return { buffer: Buffer.from(`\uFEFF${csv}`, 'utf8'), filename, contentType: CONTENT_TYPES.csv };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return { buffer, filename, contentType: CONTENT_TYPES.xlsx };
}

/** Multi-sheet workbook — used by the reports endpoint (summary + rows). */
export function buildWorkbook(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  filenameBase: string,
): SheetFile {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headers = sheet.rows.length > 0 ? Object.keys(sheet.rows[0] ?? {}) : [];
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows, { header: headers });
    worksheet['!cols'] = autoWidth(sheet.rows, headers);
    // Excel caps sheet names at 31 characters.
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    filename: `${filenameBase}-${stamp}.xlsx`,
    contentType: CONTENT_TYPES.xlsx,
  };
}

/** Parse an uploaded CSV or XLSX buffer into raw rows. */
export function parseSheet(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  const worksheet = workbook.Sheets[firstSheet];
  if (!worksheet) return [];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}
```

## `server/src/services/email/mailer.ts`

```ts
import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProduction, isTest } from '../../config/env';
import { logger } from '../../config/logger';
import type { EmailContent } from './templates.auth';

/**
 * Nodemailer transport.
 *
 * Created lazily so importing this module never opens a socket (matters for
 * the seeder and for tests). Delivery is fire-and-forget: a failed email must
 * never fail the HTTP request that triggered it.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    pool: true,
    maxConnections: 3,
    // Pakistani SMTP round trips can be slow; be patient before giving up.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendOptions {
  to: string | string[];
  content: EmailContent;
  replyTo?: string;
  /** Generated PDFs (invoice, quotation) ride along here. */
  attachments?: MailAttachment[];
}

/** Await this only when the caller genuinely needs the delivery result. */
export async function sendEmail({ to, content, replyTo, attachments }: SendOptions): Promise<boolean> {
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (isTest) {
    logger.debug(
      `[mail] suppressed in test: "${content.subject}" -> ${recipients}` +
        `${attachments?.length ? ` (+${attachments.length} attachment)` : ''}`,
    );
    return true;
  }

  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: recipients,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    });
    logger.info(`[mail] sent "${content.subject}" -> ${recipients}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[mail] FAILED "${content.subject}" -> ${recipients}: ${message}`);
    return false;
  }
}

/**
 * Dispatch without blocking the response.
 * Every rejection is already swallowed inside `sendEmail`, so this can never
 * produce an unhandled rejection.
 */
export function dispatchEmail(options: SendOptions): void {
  void sendEmail(options);
}

/** Verify SMTP credentials at boot; logs a warning rather than crashing. */
export async function verifyMailer(): Promise<void> {
  if (isTest) return;
  try {
    await getTransporter().verify();
    logger.info('[mail] SMTP connection verified');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const level = isProduction ? 'error' : 'warn';
    logger[level](`[mail] SMTP verification failed — emails will not send: ${message}`);
  }
}
```

## `server/src/routes/index.ts`

```ts
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
```
