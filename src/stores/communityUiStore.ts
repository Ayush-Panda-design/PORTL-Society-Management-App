import { create } from 'zustand';

import type { ComplaintStatus } from '@/types/database';

type CommunityUiState = {
  complaintStatusFilter: ComplaintStatus | 'all';
  complaintCategoryFilter: string | 'all';
  selectedAmenityId: string | null;
  editingNoticeId: string | null;
  setComplaintStatusFilter: (v: ComplaintStatus | 'all') => void;
  setComplaintCategoryFilter: (v: string | 'all') => void;
  setSelectedAmenityId: (id: string | null) => void;
  setEditingNoticeId: (id: string | null) => void;
};

export const useCommunityUiStore = create<CommunityUiState>((set) => ({
  complaintStatusFilter: 'all',
  complaintCategoryFilter: 'all',
  selectedAmenityId: null,
  editingNoticeId: null,
  setComplaintStatusFilter: (complaintStatusFilter) => set({ complaintStatusFilter }),
  setComplaintCategoryFilter: (complaintCategoryFilter) => set({ complaintCategoryFilter }),
  setSelectedAmenityId: (selectedAmenityId) => set({ selectedAmenityId }),
  setEditingNoticeId: (editingNoticeId) => set({ editingNoticeId }),
}));
