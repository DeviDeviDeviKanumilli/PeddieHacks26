import { create } from 'zustand';
import type { PoseRepRecord } from '@/lib/tracking/sessionMetrics';

type PoseSessionStore = {
  reps: PoseRepRecord[];
  beginPoseSession: () => void;
  recordPoseRep: (rep: PoseRepRecord) => void;
  clearPoseSession: () => void;
};

export const usePoseSession = create<PoseSessionStore>((set) => ({
  reps: [],
  beginPoseSession: () => set({ reps: [] }),
  recordPoseRep: (rep) =>
    set((state) => {
      if (
        state.reps.some(
          (existing) =>
            existing.setNumber === rep.setNumber && existing.repNumber === rep.repNumber,
        )
      ) {
        return state;
      }
      return { reps: [...state.reps, rep] };
    }),
  clearPoseSession: () => set({ reps: [] }),
}));
