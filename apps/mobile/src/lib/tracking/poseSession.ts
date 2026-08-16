import { create } from 'zustand';
import type { PoseRepRecord } from '@/lib/tracking/sessionMetrics';

type PoseSessionStore = {
  reps: PoseRepRecord[];
  beginPoseSession: () => void;
  recordPoseRep: (rep: PoseRepRecord) => void;
  clearPoseSession: () => void;
};

// in-memory only. never persist landmarks, frames, or this list to disk.
export const usePoseSession = create<PoseSessionStore>((set) => ({
  reps: [],
  beginPoseSession: () => set({ reps: [] }), // wipe derived reps only; nothing is on disk.
  recordPoseRep: (rep) =>
    set((state) => {
      // native can emit the same rep twice; keep the first derived row.
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
