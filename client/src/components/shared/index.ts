/**
 * The contact surface.
 *
 * Every path from "I want this" to "I have asked" goes through one of these,
 * which is why they live together: the copy, the tracking and the phone
 * numbers stay identical wherever they appear.
 */
export type { InquirableProduct } from './types';
export { CallButton, type CallButtonProps, type CallVariant } from './call-button';
export { WhatsAppButton, type WhatsAppButtonProps } from './whatsapp-button';
export { AddToInquiryButton, type AddToInquiryButtonProps } from './add-to-inquiry-button';
export { PriceOnRequest, type PriceOnRequestProps, type PriceOnRequestSize } from './price-on-request';
export { AvailabilityBadge, type AvailabilityBadgeProps } from './availability-badge';
export { ContactCard, type ContactCardProps, type ContactCardVariant } from './contact-card';
export { SourcingCTA } from './sourcing-cta';
export { ChinaFlag } from './china-flag';
