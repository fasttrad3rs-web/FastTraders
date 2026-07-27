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
