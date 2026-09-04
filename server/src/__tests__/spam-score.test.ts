import { assessText } from '../services/spam-score.service';

/**
 * The blocklist's job is to flag obvious junk WITHOUT flagging the trade.
 *
 * The false-positive cases below matter more than the true positives. A spam
 * pitch that slips through costs Sharjeel five seconds; a real panel builder
 * marked as spam costs him an order, and he will never know it happened. So
 * every "clean" case here is drawn from how this industry actually writes.
 */

describe('spam scoring flags junk', () => {
  it('flags an SEO pitch', () => {
    const result = assessText(
      'Hello, I can rank your website on the first page of Google with quality backlinks.',
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.join(' ')).toMatch(/rank your website|backlink/);
  });

  it('flags crypto and loan spam', () => {
    expect(assessText('Invest in bitcoin today').score).toBeGreaterThan(0);
    expect(assessText('Exclusive payday loan offer for you').score).toBeGreaterThan(0);
  });

  it('flags a message stuffed with links', () => {
    const result = assessText('see https://a.com https://b.com https://c.com www.d.com');

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.join(' ')).toMatch(/links/);
  });

  it('caps the reasons so the admin badge stays readable', () => {
    const everything = [
      'seo services',
      'backlink',
      'bitcoin',
      'forex',
      'casino',
      'viagra',
      'payday loan',
    ].join(' ');

    expect(assessText(everything).reasons.length).toBeLessThanOrEqual(5);
  });
});

describe('spam scoring leaves genuine trade inquiries alone', () => {
  /*
   * Each of these is the kind of message that actually arrives at this shop.
   * If a change to the blocklist starts flagging one, that change is wrong.
   */
  const genuine = [
    'Need 3 x Terasaki S250-NJ 250A 36kA 3P urgently for a panel in Kot Lakhpat.',
    'AOA, kya aap ke pas Schneider MCCB 100A available hai? Rate bata dein.',
    'Please quote for 200 metres 4-core 16mm armoured cable + glands.',
    'Do you have Autonics E50S encoder? I need datasheet link.',
    'We are doing electrical work for a bank branch fit-out, need 12 RCCBs.',
    'REQUIRED: PILZ SAFETY RELAY PNOZ X2.8P 24VDC — URGENT',
    'Sir mujhe VFD chahiye 5.5kW ka, Mitsubishi ya Fuji dono chalega.',
    '', // an inquiry with no message at all is completely normal here
  ];

  it.each(genuine)('does not flag: %s', (message) => {
    expect(assessText(message)).toEqual({ score: 0, reasons: [] });
  });

  it('does not flag Urdu or Arabic script', () => {
    /*
     * Plenty of real customers write in Urdu. Flagging them would be both
     * wrong and insulting — only Cyrillic and CJK are treated as unexpected.
     */
    expect(assessText('السلام علیکم، مجھے سرکٹ بریکر چاہیے').score).toBe(0);
  });

  it('does not flag a single supplier datasheet link', () => {
    expect(assessText('Datasheet is at https://terasaki.co.jp/s250nj.pdf').score).toBe(0);
  });

  it('does not flag words that merely contain a blocked term', () => {
    // "seo" is inside "Seoul"; the blocklist uses phrases for this reason.
    expect(assessText('Shipping from Seoul, Korea').score).toBe(0);
  });
});
