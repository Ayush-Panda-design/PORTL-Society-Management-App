import {
  addDaysISO,
  amenityDateOptions,
  amenitySlotCapacity,
  canPublishPoll,
  complaintStatusTone,
  isPollExpired,
  isPollPublished,
  parseJsonStringArray,
  pollRespondentLabel,
  pollStats,
  pollStatusKind,
  todayISODate,
} from '@/lib/community';
import type { Poll, PollVote, PollVoteWithProfile } from '@/types/database';

function poll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 'poll-1',
    society_id: 'soc-1',
    question: 'Paint lobby?',
    options: ['Yes', 'No'],
    created_by: 'admin-1',
    expires_at: null,
    results_published_at: null,
    ...overrides,
  };
}

describe('parseJsonStringArray', () => {
  it('normalizes arrays, JSON strings, and junk', () => {
    expect(parseJsonStringArray(['a', '', 'b'])).toEqual(['a', 'b']);
    expect(parseJsonStringArray('["x","y"]')).toEqual(['x', 'y']);
    expect(parseJsonStringArray('{not-json')).toEqual([]);
    expect(parseJsonStringArray(null)).toEqual([]);
    expect(parseJsonStringArray(42)).toEqual([]);
  });
});

describe('poll lifecycle helpers', () => {
  it('detects expiry and publish state', () => {
    expect(isPollExpired(null)).toBe(false);
    expect(isPollExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isPollExpired(new Date(Date.now() + 60_000).toISOString())).toBe(false);

    expect(isPollPublished(poll())).toBe(false);
    expect(isPollPublished(poll({ results_published_at: '2026-01-02T00:00:00Z' }))).toBe(true);
  });

  it('allows publish only after expiry and before results', () => {
    expect(canPublishPoll(poll({ expires_at: null }))).toBe(false);
    expect(
      canPublishPoll(poll({ expires_at: new Date(Date.now() - 1000).toISOString() })),
    ).toBe(true);
    expect(
      canPublishPoll(
        poll({
          expires_at: new Date(Date.now() - 1000).toISOString(),
          results_published_at: '2026-01-02T00:00:00Z',
        }),
      ),
    ).toBe(false);
  });

  it('maps status kind live → closed → results', () => {
    expect(pollStatusKind(poll({ expires_at: new Date(Date.now() + 60_000).toISOString() }))).toBe(
      'live',
    );
    expect(pollStatusKind(poll({ expires_at: new Date(Date.now() - 1000).toISOString() }))).toBe(
      'closed',
    );
    expect(
      pollStatusKind(
        poll({
          expires_at: new Date(Date.now() - 1000).toISOString(),
          results_published_at: '2026-01-02T00:00:00Z',
        }),
      ),
    ).toBe('results');
  });
});

describe('pollStats and respondent labels', () => {
  it('counts votes per option', () => {
    const votes: PollVote[] = [
      { id: 'v1', poll_id: 'poll-1', user_id: 'u1', option: 'Yes' },
      { id: 'v2', poll_id: 'poll-1', user_id: 'u2', option: 'Yes' },
      { id: 'v3', poll_id: 'other', user_id: 'u3', option: 'No' },
    ];
    const stats = pollStats(poll(), votes);
    expect(stats.total).toBe(2);
    expect(stats.counts).toEqual({ Yes: 2, No: 0 });
  });

  it('formats respondent labels with tower/flat when present', () => {
    const withFlat: PollVoteWithProfile = {
      id: 'v1',
      poll_id: 'poll-1',
      user_id: 'u1',
      option: 'Yes',
      profile: {
        full_name: 'Ada',
        flats: { number: '12A', towers: { name: 'Cedar' } },
      },
    };
    expect(pollRespondentLabel(withFlat)).toBe('Ada · Cedar · Flat 12A');

    const noFlat: PollVoteWithProfile = {
      ...withFlat,
      profile: { full_name: '  ', flats: null },
    };
    expect(pollRespondentLabel(noFlat)).toMatch(/unnamed resident/i);
    expect(pollRespondentLabel(noFlat)).toMatch(/no flat assigned/i);
  });
});

describe('complaints and amenity booking helpers', () => {
  it('maps complaint status tones', () => {
    expect(complaintStatusTone('open').label).toBe('Open');
    expect(complaintStatusTone('in_progress').label).toBe('In progress');
    expect(complaintStatusTone('resolved').label).toBe('Resolved');
    expect(complaintStatusTone('reopened').label).toBe('Reopened');
  });

  it('builds rolling amenity date options within 1–14 days', () => {
    const today = '2026-07-24';
    const opts = amenityDateOptions(7, today);
    expect(opts).toHaveLength(7);
    expect(opts[0]).toEqual({ value: today, label: 'Today' });
    expect(opts[1].value).toBe(addDaysISO(today, 1));
    expect(opts[1].label).toBe('Tomorrow');
    // 0 is falsy after floor, so the helper falls back to the default of 7.
    expect(amenityDateOptions(0, today)).toHaveLength(7);
    expect(amenityDateOptions(1, today)).toHaveLength(1);
    expect(amenityDateOptions(99, today)).toHaveLength(14);
  });

  it('normalizes amenity slot capacity', () => {
    expect(amenitySlotCapacity(null)).toBe(1);
    expect(amenitySlotCapacity(0)).toBe(1);
    expect(amenitySlotCapacity(3.9)).toBe(3);
    expect(amenitySlotCapacity(5)).toBe(5);
  });

  it('formats todayISODate as YYYY-MM-DD', () => {
    expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
