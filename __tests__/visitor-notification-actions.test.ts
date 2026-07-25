import { supabase } from '@/lib/supabase';
import {
  VISITOR_ACTION_APPROVE,
  VISITOR_ACTION_REJECT,
  handleVisitorNotificationAction,
} from '@/lib/visitor-notification-actions';

jest.mock('@/lib/notifications', () => ({
  notifyVisitorDecision: jest.fn(async () => undefined),
  notifyVisitorPending: jest.fn(async () => undefined),
  notifyVisitorCheckedIn: jest.fn(async () => undefined),
  notifyVisitorCheckedOut: jest.fn(async () => undefined),
}));

const fromMock = supabase.from as jest.Mock;

/** Chain used by updateVisitorStatus: update → eq → eq → eq → select → maybeSingle */
function mockVisitorUpdate(error: { message: string } | null = null, data: object | null = {
  id: 'v1',
  created_by: 'guard-1',
  name: 'Courier',
  society_id: 's1',
}) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: error ? null : data, error });
  const select = jest.fn().mockReturnValue({ maybeSingle });
  const eqStatus = jest.fn().mockReturnValue({ select });
  const eqFlat = jest.fn().mockReturnValue({ eq: eqStatus });
  const eqId = jest.fn().mockReturnValue({ eq: eqFlat });
  const update = jest.fn().mockReturnValue({ eq: eqId });
  fromMock.mockReturnValue({ update });
  return { update, eqId, eqFlat, eqStatus, select, maybeSingle };
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
        createdBy: 'guard-1',
      }),
    ).resolves.toEqual({ handled: true, error: 'RLS denied' });
  });

  it('loads createdBy from DB when missing on the notification', async () => {
    const selectMaybe = jest.fn().mockResolvedValue({
      data: { created_by: 'guard-2', name: 'Guest' },
      error: null,
    });
    const selectEqFlat = jest.fn().mockReturnValue({ maybeSingle: selectMaybe });
    const selectEqId = jest.fn().mockReturnValue({ eq: selectEqFlat });
    const select = jest.fn().mockReturnValue({ eq: selectEqId });

    const updateMaybe = jest.fn().mockResolvedValue({
      data: { id: 'v1', created_by: 'guard-2', name: 'Guest', society_id: 's1' },
      error: null,
    });
    const updateSelect = jest.fn().mockReturnValue({ maybeSingle: updateMaybe });
    const updateEqStatus = jest.fn().mockReturnValue({ select: updateSelect });
    const updateEqFlat = jest.fn().mockReturnValue({ eq: updateEqStatus });
    const updateEqId = jest.fn().mockReturnValue({ eq: updateEqFlat });
    const update = jest.fn().mockReturnValue({ eq: updateEqId });

    fromMock.mockReturnValue({ select, update });

    await expect(
      handleVisitorNotificationAction({
        actionId: VISITOR_ACTION_APPROVE,
        visitorId: 'v1',
        flatId: 'f1',
      }),
    ).resolves.toEqual({ handled: true, error: undefined });

    expect(select).toHaveBeenCalledWith('created_by, name');
    expect(update).toHaveBeenCalled();
  });
});
