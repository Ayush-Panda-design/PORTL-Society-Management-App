/**
 * @jest-environment node
 */
import { notifyUsers } from '@/lib/notifications';
import { invokeSendPush } from '@/lib/push-notifications';

const mockedInvoke = invokeSendPush as jest.MockedFunction<typeof invokeSendPush>;

describe('notifyUsers', () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue({ ok: true, sent: 1 });
  });

  it('returns structured failure when invokeSendPush fails', async () => {
    mockedInvoke.mockResolvedValue({ ok: false, error: 'Edge down', sent: 0 });

    const result = await notifyUsers({
      userIds: ['user-1'],
      title: 'Test',
      body: 'Body',
      data: { type: 'payment_due' },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Edge down');
    expect(mockedInvoke).toHaveBeenCalled();
  });

  it('reports ok when at least one message is sent', async () => {
    mockedInvoke.mockResolvedValue({ ok: true, sent: 2 });

    const result = await notifyUsers({
      userIds: ['user-1', 'user-2'],
      title: 'Test',
      body: 'Body',
      data: { type: 'amenity_booked' },
    });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(2);
  });
});
