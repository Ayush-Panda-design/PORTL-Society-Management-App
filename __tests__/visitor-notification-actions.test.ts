import { supabase } from '@/lib/supabase';
import {
  VISITOR_ACTION_APPROVE,
  VISITOR_ACTION_REJECT,
  handleVisitorNotificationAction,
} from '@/lib/visitor-notification-actions';

const fromMock = supabase.from as jest.Mock;

function mockVisitorUpdate(error: { message: string } | null = null) {
  const eqFlat = jest.fn().mockResolvedValue({ error });
  const eqId = jest.fn().mockReturnValue({ eq: eqFlat });
  const update = jest.fn().mockReturnValue({ eq: eqId });
  fromMock.mockReturnValue({ update });
  return { update, eqId, eqFlat };
}

describe('handleVisitorNotificationAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unrelated action ids', async () => {
    await expect(
      handleVisitorNotificationAction({
        actionId: 'DISMISS',
        visitorId: 'v1',
        flatId: 'f1',
      }),
    ).resolves.toEqual({ handled: false });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('requires visitor and flat ids', async () => {
    await expect(
      handleVisitorNotificationAction({ actionId: VISITOR_ACTION_APPROVE }),
    ).resolves.toEqual({
      handled: true,
      error: 'Missing visitor details on notification.',
    });
  });

  it('approves pending visitors from lock-screen action', async () => {
    const { update } = mockVisitorUpdate(null);
    await expect(
      handleVisitorNotificationAction({
        actionId: VISITOR_ACTION_APPROVE,
        visitorId: 'v1',
        flatId: 'f1',
        visitorName: 'Courier',
        createdBy: 'guard-1',
      }),
    ).resolves.toEqual({ handled: true, error: undefined });

    expect(fromMock).toHaveBeenCalledWith('visitors');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        reject_reason: null,
        is_missed: false,
      }),
    );
  });

  it('rejects with notification reason and surfaces DB errors', async () => {
    mockVisitorUpdate({ message: 'RLS denied' });
    await expect(
      handleVisitorNotificationAction({
        actionId: VISITOR_ACTION_REJECT,
        visitorId: 'v1',
        flatId: 'f1',
      }),
    ).resolves.toEqual({ handled: true, error: 'RLS denied' });
  });
});
