import {
  computePollExpiry,
  defaultCustomExpiryDate,
  describePollExpiry,
  mergeDateAndTime,
  validatePollForm,
} from '@/lib/poll-form';

describe('poll-form', () => {
  it('mergeDateAndTime combines calendar day with clock time', () => {
    const datePart = new Date('2026-07-24T00:00:00');
    const timePart = new Date('2026-01-01T18:30:00');
    const merged = mergeDateAndTime(datePart, timePart);
    expect(merged.getFullYear()).toBe(2026);
    expect(merged.getMonth()).toBe(6);
    expect(merged.getDate()).toBe(24);
    expect(merged.getHours()).toBe(18);
    expect(merged.getMinutes()).toBe(30);
  });

  it('defaultCustomExpiryDate is ~7 days out at 18:00', () => {
    const end = defaultCustomExpiryDate();
    const now = new Date();
    const diffDays = (end.getTime() - now.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThan(6);
    expect(diffDays).toBeLessThan(8);
    expect(end.getHours()).toBe(18);
    expect(end.getMinutes()).toBe(0);
  });

  it('computePollExpiry returns null for no limit', () => {
    expect(computePollExpiry('none')).toBeNull();
  });

  it('computePollExpiry rejects past custom dates', () => {
    expect(() => computePollExpiry('custom', new Date(Date.now() - 60_000))).toThrow(
      /future/i,
    );
    expect(() => computePollExpiry('custom')).toThrow(/pick an end date/i);
  });

  it('computePollExpiry accepts future custom dates', () => {
    const future = new Date(Date.now() + 86_400_000);
    const iso = computePollExpiry('custom', future);
    expect(iso).toBe(future.toISOString());
  });

  it('validatePollForm requires question and two options', () => {
    expect(() =>
      validatePollForm({ question: '  ', options: ['Yes', 'No'], duration: '1d' }),
    ).toThrow(/question is required/i);

    expect(() =>
      validatePollForm({ question: 'OK?', options: ['Only one'], duration: '1d' }),
    ).toThrow(/two options/i);

    const result = validatePollForm({
      question: '  Should we paint?  ',
      options: [' Yes ', '', ' No '],
      duration: 'none',
    });
    expect(result.question).toBe('Should we paint?');
    expect(result.options).toEqual(['Yes', 'No']);
    expect(result.expiresAt).toBeNull();
  });

  it('describePollExpiry covers none and custom presets', () => {
    expect(describePollExpiry('none')).toMatch(/manually/i);
    const future = new Date(Date.now() + 86_400_000);
    expect(describePollExpiry('custom', future)).toMatch(/closes/i);
    // Missing custom date goes through computePollExpiry and surfaces picker copy.
    expect(describePollExpiry('custom')).toMatch(/future date and time/i);
  });
});
