/**
 * Model barrel.
 *
 * Importing this module registers every schema with Mongoose, which matters
 * for `populate()` and for `ref` resolution across files.
 */

export { User, type IUser, type IUserMethods, type UserDocument } from './User';
export { Category, type ICategory, type CategoryDocument, MAX_CATEGORY_DEPTH } from './Category';
export { Brand, type IBrand, type BrandDocument } from './Brand';
export { Product, type IProduct, type ProductDocument } from './Product';
export {
  Order,
  type IOrder,
  type IOrderItem,
  type IStatusHistoryEntry,
  type OrderDocument,
} from './Order';
export {
  Quotation,
  type IQuotation,
  type IQuotationItem,
  type QuotationDocument,
} from './Quotation';
export { Cart, type ICart, type ICartItem, type CartDocument } from './Cart';
export { Review, type IReview, type ReviewDocument } from './Review';
export { Coupon, type ICoupon, type CouponDocument } from './Coupon';
export { Contact, type IContact, type ContactDocument } from './Contact';
export { Newsletter, type INewsletterSubscriber, type NewsletterDocument } from './Newsletter';
export { Banner, type IBanner, type BannerDocument } from './Banner';
export { Setting, type ISetting, type SettingDocument } from './Setting';
export { AuditLog, type IAuditLog, type AuditLogDocument } from './AuditLog';
export { Counter, nextDocumentNumber, type ICounter } from './Counter';
