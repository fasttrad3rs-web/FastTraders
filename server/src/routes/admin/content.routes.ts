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
