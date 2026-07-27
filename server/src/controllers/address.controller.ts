import type { Request, Response } from 'express';
import { User, type UserDocument } from '../models';
import { toPublicUser } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import type { CreateAddressInput, UpdateAddressInput } from '../validators';

/**
 * Address book CRUD, nested under /auth/me/addresses.
 * Addresses are subdocuments, so the index in the array is the identifier —
 * `_id: false` on the schema keeps the payload small.
 */

const MAX_ADDRESSES = 8;

async function loadUser(req: Request): Promise<UserDocument> {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('Account not found');
  return user;
}

function parseIndex(req: Request, length: number): number {
  const raw = (req.params as { index?: string }).index ?? '';
  const index = Number(raw);

  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw ApiError.notFound('Address not found');
  }
  return index;
}

export async function listAddresses(req: Request, res: Response): Promise<void> {
  const user = await loadUser(req);
  sendSuccess(res, user.addresses, 'Addresses');
}

export async function addAddress(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateAddressInput;
  const user = await loadUser(req);

  if (user.addresses.length >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save at most ${MAX_ADDRESSES} addresses`);
  }

  // A new default demotes the previous one; the model hook guarantees exactly one.
  if (input.isDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  user.addresses.push(input);
  await user.save();

  sendCreated(res, toPublicUser(user).addresses, 'Address added');
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateAddressInput;
  const user = await loadUser(req);

  const index = parseIndex(req, user.addresses.length);
  const target = user.addresses[index];
  if (!target) throw ApiError.notFound('Address not found');

  if (input.isDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  Object.assign(target, input);
  await user.save();

  sendSuccess(res, user.addresses, 'Address updated');
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  const user = await loadUser(req);

  const index = parseIndex(req, user.addresses.length);
  user.addresses.splice(index, 1);
  await user.save();

  sendSuccess(res, user.addresses, 'Address removed');
}
