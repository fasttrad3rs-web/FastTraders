import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { signTokenPair } from '../utils/tokens';
import { addressSchema, jsonTransform } from './shared.schemas';
import type { Address, AuthTokens, UserRole } from '../types';

const BCRYPT_ROUNDS = 12;
/** Cap stored refresh tokens so one account cannot grow unbounded. */
const MAX_REFRESH_TOKENS = 5;

/** Mongoose document shape — includes server-only credential fields. */
export interface IUser {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  companyName?: string;
  ntn?: string;
  addresses: Address[];
  isEmailVerified: boolean;
  emailVerifyToken?: string;
  emailVerifyExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  /** SHA-256 hashes of live refresh tokens (rotation + revocation). */
  refreshTokens: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  generateTokens(): AuthTokens;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModelType = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModelType, IUserMethods>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: 24,
    },
    // `select: false` keeps the hash out of every query unless asked for explicitly.
    passwordHash: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: ['customer', 'admin', 'manager'], default: 'customer', index: true },
    companyName: { type: String, trim: true, maxlength: 160 },
    /** National Tax Number — 7 digits + check digit, or the 13-digit CNIC form. */
    ntn: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^\d{7}-?\d$|^\d{13}$/, 'Enter a valid NTN or CNIC'],
    },
    addresses: { type: [addressSchema], default: [] },

    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpiry: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiry: { type: Date, select: false },
    refreshTokens: { type: [String], default: [], select: false },

    isActive: { type: Boolean, default: true, index: true },
    lastLogin: { type: Date },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */
// `email` is already unique. These support the admin user table.
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text', companyName: 'text' });

/* -------------------------------- Hooks --------------------------------- */

/** Hash the password whenever it is set or changed. */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash')) {
    next();
    return;
  }
  this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_ROUNDS);
  next();
});

/** Exactly one default address, and always at least one once addresses exist. */
userSchema.pre('save', function normaliseAddresses(next) {
  if (this.addresses.length > 0) {
    const defaults = this.addresses.filter((address) => address.isDefault);
    if (defaults.length === 0) {
      const first = this.addresses[0];
      if (first) first.isDefault = true;
    } else if (defaults.length > 1) {
      this.addresses.forEach((address, index) => {
        address.isDefault = index === this.addresses.findIndex((item) => item.isDefault);
      });
    }
  }
  next();
});

/** Never let the token list grow without bound. */
userSchema.pre('save', function trimRefreshTokens(next) {
  if (this.refreshTokens.length > MAX_REFRESH_TOKENS) {
    this.refreshTokens = this.refreshTokens.slice(-MAX_REFRESH_TOKENS);
  }
  next();
});

/* ------------------------------- Methods -------------------------------- */

userSchema.method(
  'comparePassword',
  function comparePassword(this: UserDocument, candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.passwordHash);
  },
);

userSchema.method('generateTokens', function generateTokens(this: UserDocument): AuthTokens {
  const id = this._id.toString();
  return signTokenPair({ id, email: this.email, role: this.role });
});

/* ------------------------------- Virtuals ------------------------------- */

userSchema.virtual('defaultAddress').get(function getDefaultAddress(this: UserDocument) {
  return this.addresses.find((address) => address.isDefault) ?? this.addresses[0] ?? null;
});

export const User: UserModelType = model<IUser, UserModelType>('User', userSchema);
