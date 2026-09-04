/**
 * Model barrel.
 *
 * Importing this registers every schema with Mongoose, which matters for
 * `populate()` and cross-file `ref` resolution.
 *
 * Cart, Order, Coupon and Review were removed when the business moved to a
 * catalogue-only model — there is nothing to check out and nobody to verify
 * a reviewer.
 */

export { User, type IUser, type IUserMethods, type UserDocument } from './User';
export { Category, type ICategory, type CategoryDocument, MAX_CATEGORY_DEPTH } from './Category';
export { Brand, type IBrand, type BrandDocument } from './Brand';
export { Product, type IProduct, type ProductDocument } from './Product';
export {
  Inquiry,
  type IInquiry,
  type IInquiryItem,
  type IInquiryCustomer,
  type ISourcingDetails,
  type IFollowUp,
  type InquiryDocument,
  INQUIRY_TYPES,
  INQUIRY_STATUSES,
  INQUIRY_PRIORITIES,
  INQUIRY_SOURCES,
  CONTACT_METHODS,
  URGENCIES,
} from './Inquiry';
export {
  InquiryList,
  type IInquiryList,
  type IInquiryListItem,
  type InquiryListDocument,
} from './InquiryList';
export { Testimonial, type ITestimonial, type TestimonialDocument } from './Testimonial';
export { Contact, type IContact, type ContactDocument } from './Contact';
export { Newsletter, type INewsletterSubscriber, type NewsletterDocument } from './Newsletter';
export { Banner, type IBanner, type BannerDocument } from './Banner';
export { Setting, type ISetting, type SettingDocument } from './Setting';
export { AuditLog, type IAuditLog, type AuditLogDocument } from './AuditLog';
export { Counter, nextDocumentNumber, type ICounter } from './Counter';
