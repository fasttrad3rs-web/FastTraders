import {
  updateBrandSchema,
  updateBannerSchema,
  updateCategorySchema,
} from '../validators/admin.taxonomy.validators';
import { updateTestimonialSchema } from '../validators/misc.validators';

/**
 * Optional fields must be *clearable*, not just settable.
 *
 * The admin's shared CRUD screen dropped blank values from an edit payload, so
 * clearing a banner subtitle or a brand country sent a PATCH that never
 * mentioned the field. The old value survived, the toast said "updated", and
 * the text came back on reload — there was no way to remove an optional value
 * at all.
 *
 * The client now sends `null` to mean "unset this". These tests pin the other
 * half of that contract: the update schemas must accept it. `updateBrandSchema`
 * and `updateTestimonialSchema` were `createSchema.partial()`, which makes
 * fields optional but *not* nullable — so `null` would have been rejected.
 */

describe('optional fields accept null to clear them', () => {
  it('a brand can have its logo, website and country removed', () => {
    const result = updateBrandSchema.safeParse({
      logo: null,
      website: null,
      country: null,
      description: null,
    });

    expect(result.success).toBe(true);
  });

  it('a banner can have its subtitle, link and mobile image removed', () => {
    const result = updateBannerSchema.safeParse({
      subtitle: null,
      link: null,
      ctaText: null,
      mobileImage: null,
    });

    expect(result.success).toBe(true);
  });

  it('a category can have its icon and image removed, and be promoted to top level', () => {
    // `parent: null` is how a nested category becomes a root one — the single
    // most consequential null on this screen.
    const result = updateCategorySchema.safeParse({ icon: null, image: null, parent: null });

    expect(result.success).toBe(true);
  });

  it('a testimonial can have its role, company and rating removed', () => {
    const result = updateTestimonialSchema.safeParse({
      role: null,
      company: null,
      rating: null,
    });

    expect(result.success).toBe(true);
  });
});

describe('clearing does not weaken the rules that matter', () => {
  it('still rejects a rubbish logo path', () => {
    // `null` clears; a bad string is still a bad string.
    expect(updateBrandSchema.safeParse({ logo: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('still rejects an out-of-range rating', () => {
    expect(updateTestimonialSchema.safeParse({ rating: 9 }).success).toBe(false);
  });

  it('still rejects a too-short name', () => {
    expect(updateBrandSchema.safeParse({ name: 'x' }).success).toBe(false);
  });

  it('still requires at least one field', () => {
    expect(updateBrandSchema.safeParse({}).success).toBe(false);
    expect(updateTestimonialSchema.safeParse({}).success).toBe(false);
  });

  it('a required field cannot be nulled', () => {
    // The client only converts blanks to null for fields it knows are
    // optional, and the schema is the backstop for that.
    expect(updateBannerSchema.safeParse({ title: null }).success).toBe(false);
    expect(updateTestimonialSchema.safeParse({ quote: null }).success).toBe(false);
  });
});
