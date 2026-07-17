import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/app-storage';

type ReadState = {
  /** Notice IDs the current device has opened / seen. */
  seenNotices: Record<string, true>;
  /** Complaint IDs the admin has opened / seen. */
  seenComplaints: Record<string, true>;
  markNoticeSeen: (id: string) => void;
  markNoticesSeen: (ids: string[]) => void;
  markComplaintSeen: (id: string) => void;
  isNoticeUnread: (id: string) => boolean;
  isComplaintUnread: (id: string) => boolean;
};

export const useReadStateStore = create<ReadState>()(
  persist(
    (set, get) => ({
      seenNotices: {},
      seenComplaints: {},
      markNoticeSeen: (id) =>
        set((s) =>
          s.seenNotices[id] ? s : { seenNotices: { ...s.seenNotices, [id]: true } },
        ),
      markNoticesSeen: (ids) =>
        set((s) => {
          let changed = false;
          const next = { ...s.seenNotices };
          for (const id of ids) {
            if (!next[id]) {
              next[id] = true;
              changed = true;
            }
          }
          return changed ? { seenNotices: next } : s;
        }),
      markComplaintSeen: (id) =>
        set((s) =>
          s.seenComplaints[id]
            ? s
            : { seenComplaints: { ...s.seenComplaints, [id]: true } },
        ),
      isNoticeUnread: (id) => !get().seenNotices[id],
      isComplaintUnread: (id) => !get().seenComplaints[id],
    }),
    {
      name: 'portl-read-state',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        seenNotices: state.seenNotices,
        seenComplaints: state.seenComplaints,
      }),
    },
  ),
);
