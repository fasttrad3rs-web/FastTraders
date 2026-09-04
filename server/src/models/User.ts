import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { signTokenPair } from '../utils/tokens';
import { jsonTransform } from './shared.schemas';
import type { AuthTokens, UserRole } from '../types';

const BCRYPT_ROUNDS = 12;
/** Cap stored refresh tokens so one account cannot grow unbounded. */
const MAX_REFRESH_TOKENS = 5;

/**
 * A staff account. There are no customers.
 *
 * Fast Traders' buyers never register — they phone, message, or send an
 * inquiry, and an inquiry carries its own `customer` block
 * captured on the RFQ itself. So this collection holds Sharjeel and whoever
 * else works the counter, and nothing else. There is no registration route.
 */
export interface IUser {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  /** SHA-256 hashes of live refresh tokens (rotation + revocation). */
  refreshTokens: string[];
  isActive: boolean;
  lastLogin?: Date;
  /** Consecutive failed sign-ins. Reset to zero by any success. */
  failedLoginAttempts: number;
  /** Set when the account locks; cleared on the next successful sign-in. */
  lockedUntil?: Date;
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
    /*
     * No `customer` role. An account exists only to sign into the back office,
     * so the role answers "how much access", not "are you staff" — everyone
     * with a row in this collection is.
     */
    role: { type: String, enum: ['admin', 'manager'], default: 'manager', index: true },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiry: { type: Date, select: false },
    refreshTokens: { type: [String], default: [], select: false },

    isActive: { type: Boolean, default: true, index: true },

    /*
     * Brute-force lockout, layered under the 5-per-15-minutes IP limiter.
     *
     * The IP limiter alone is not enough: an attacker with a botnet gets a
     * fresh five attempts per address, and Sharjeel's staff all share one
     * shop connection so a single wrong password from the counter must not
     * lock out the office. Counting per *account* fixes both — it follows the
     * target rather than the source.
     */
    failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },
    lockedUntil: { type: Date, select: false },
    lastLogin: { type: Date },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */
// `email` is already unique. These support the admin user table.
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text' });

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

export const User: UserModelType = model<IUser, UserModelType>('User', userSchema);
