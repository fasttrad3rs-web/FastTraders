import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { User, type IUser } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { toPublicUser } from '../../services/auth.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';

/**
 * Staff administration.
 *
 * This used to double as the customer screen, joining each row to its
 * inquiry history by email. That join is meaningless now: `User` holds only
 * staff, and staff do not send inquiries. Buyers live on the inquiries themselves
 * — `report.service.customerReport()` is what aggregates them.
 */

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
    filter.$or = [{ name: term }, { email: term }, { phone: term }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(SORTS[sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const items = users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin ?? null,
    createdAt: user.createdAt,
  }));

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} user(s)`);
}

/** One staff account. */
export async function getUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  sendSuccess(res, { user: toPublicUser(user) }, user.name);
}

/**
 * Create a staff account.
 *
 * Admin-only, and it is the only way in — `POST /auth/register` is gone, so
 * nobody can self-serve their way into the back office. The password is
 * hashed by the model's pre-save hook, never here.
 */
export async function createStaff(req: Request, res: Response): Promise<void> {
  const input = req.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'admin' | 'manager';
  };

  if (await User.exists({ email: input.email })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: input.password,
    role: input.role,
    isEmailVerified: true,
  });

  recordAudit({
    req,
    action: 'create',
    entity: 'User',
    entityId: user._id.toString(),
    after: { email: user.email, role: user.role },
  });

  sendCreated(res, toPublicUser(user), `${user.name} can now sign in as a ${user.role}.`);
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { role } = req.body as { role: 'admin' | 'manager' };

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
