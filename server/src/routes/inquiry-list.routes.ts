import { Router } from 'express';
import * as inquiries from '../controllers/inquiry.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { addListItemSchema, listItemParamSchema, updateListItemSchema } from '../validators';

/**
 * The inquiry list — a guest shortlist keyed on the `ft_session_id` cookie.
 *
 * Not rate-limited beyond the global `/api` ceiling: adding and removing
 * items is a normal browsing action, and throttling it would break the page
 * for someone comparing a dozen breakers. The submission endpoint is where
 * the tight limit belongs.
 */
const router: Router = Router();

router.get('/items', asyncHandler(inquiries.getList));

router.post(
  '/items',
  validate({ body: addListItemSchema }),
  asyncHandler(inquiries.addListItem),
);

router.patch(
  '/items',
  validate({ body: updateListItemSchema }),
  asyncHandler(inquiries.updateListItem),
);

router.delete(
  '/items/:productId',
  validate({ params: listItemParamSchema }),
  asyncHandler(inquiries.removeListItem),
);

/** Clear the whole list. */
router.delete('/items', asyncHandler(inquiries.clearList));

export default router;
