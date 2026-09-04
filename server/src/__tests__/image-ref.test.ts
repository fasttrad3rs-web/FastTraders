import { imageRefSchema } from '../validators/common.validators';
import { createBannerSchema } from '../validators/admin.taxonomy.validators';
import { banners } from '../seed/data/banners';

/**
 * Image references come in two legitimate shapes, and a plain `z.string().url()`
 * only accepts one of them. That mismatch is not theoretical: it let a seeded
 * banner be listed in the admin but rejected on save, with the error pointing
 * at a field the operator had never edited.
 */

describe('imageRefSchema', () => {
  it.each([
    'https://res.cloudinary.com/by9gftmc/image/upload/v1/hero.jpg',
    'http://localhost:5050/static/x.png',
    '/placeholders/banners/trade-strip.svg',
    '/placeholders/default.svg',
  ])('accepts %s', (value) => {
    expect(imageRefSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ['a bare filename', 'hero.jpg'],
    ['a relative path', './placeholders/x.svg'],
    ['a parent traversal', '../secrets/x.svg'],
    ['a protocol-relative URL', '//evil.example.com/x.svg'],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(imageRefSchema.safeParse(value).success).toBe(false);
  });

  it('still rejects a javascript: URL', () => {
    // eslint-disable-next-line no-script-url -- asserting this is refused
    expect(imageRefSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });
});

describe('the seeded banners', () => {
  it('would all pass the admin create validator', () => {
    // If they do not, the shop cannot edit its own seeded homepage.
    for (const banner of banners) {
      const result = createBannerSchema.safeParse(banner);
      expect(result.success).toBe(true);
    }
  });

  it('uses local artwork rather than a third-party placeholder service', () => {
    for (const banner of banners) {
      expect(banner.image.startsWith('/')).toBe(true);
      if (banner.mobileImage) expect(banner.mobileImage.startsWith('/')).toBe(true);
    }
  });
});
