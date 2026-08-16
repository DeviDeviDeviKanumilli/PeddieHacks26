import type { RepMetric } from '@peddie/contracts';
import * as Crypto from 'expo-crypto';
import { mobileApi } from '@/lib/api';

export type LiveSessionContext = {
  workoutSessionId: string;
  workoutSessionVersion: number;
  exerciseSessionId: string;
  exerciseSessionVersion: number;
  remainingSessions: string;
};

export const buildCountedRepMetrics = (
  completedReps: number,
  repsPerSet: number,
  elapsedSeconds: number,
): RepMetric[] => {
  const safeRepsPerSet = Math.max(1, repsPerSet);
  const durationMs = completedReps > 0 ? Math.round((elapsedSeconds * 1000) / completedReps) : 0;
  return Array.from({ length: Math.max(0, completedReps) }, (_, index) => ({
    setNumber: Math.floor(index / safeRepsPerSet) + 1,
    repNumber: (index % safeRepsPerSet) + 1,
    counted: true,
    durationMs,
    feedbackCodes: [],
    recordedOffsetMs: Math.round(((index + 1) * elapsedSeconds * 1000) / completedReps),
  }));
};

const remainingFromChildren = (
  children: { id: string; version: number }[],
  selectedId: string,
): string =>
  children
    .filter((session) => session.id !== selectedId)
    .map((session) => `${session.id}:${session.version}`)
    .join(',');

const parseRemainingSessions = (encoded: string) =>
  encoded
    .split(',')
    .filter(Boolean)
    .map((value) => {
      const [id, version] = value.split(':');
      return { id, version: Number(version) };
    });

export const startLiveSession = async (
  workoutId: string,
  exerciseId: string,
  clientRequestId: string,
): Promise<LiveSessionContext> => {
  const workoutSession = await mobileApi.createWorkoutSession({ workoutId, clientRequestId });
  const children = await mobileApi.listExerciseSessions(workoutSession.id);
  const selected = children.find((session) => session.exerciseId === exerciseId);
  if (!selected) throw new Error('The selected exercise is not part of this workout.');
  const active = await mobileApi.patchExerciseSession(selected.id, {
    expectedVersion: selected.version,
    state: 'active',
  });
  return {
    workoutSessionId: workoutSession.id,
    workoutSessionVersion: workoutSession.version,
    exerciseSessionId: active.id,
    exerciseSessionVersion: active.version,
    remainingSessions: remainingFromChildren(children, selected.id),
  };
};

export const resumeLiveExercise = async (
  workoutSessionId: string,
  workoutSessionVersion: number,
  exerciseId: string,
): Promise<LiveSessionContext> => {
  const children = await mobileApi.listExerciseSessions(workoutSessionId);
  const selected =
    children.find((session) => session.exerciseId === exerciseId && session.state === 'pending') ??
    children.find(
      (session) =>
        session.exerciseId === exerciseId &&
        session.state !== 'completed' &&
        session.state !== 'skipped' &&
        session.state !== 'cancelled',
    );
  if (!selected) throw new Error('The selected exercise is not part of this workout.');
  const active =
    selected.state === 'active'
      ? selected
      : await mobileApi.patchExerciseSession(selected.id, {
          expectedVersion: selected.version,
          state: 'active',
        });
  return {
    workoutSessionId,
    workoutSessionVersion,
    exerciseSessionId: active.id,
    exerciseSessionVersion: active.version,
    remainingSessions: remainingFromChildren(
      children.filter(
        (session) =>
          session.state === 'pending' ||
          session.state === 'active' ||
          session.state === 'paused' ||
          session.state === 'resting',
      ),
      selected.id,
    ),
  };
};

export const finishLiveWorkout = async (context: LiveSessionContext): Promise<void> => {
  for (const session of parseRemainingSessions(context.remainingSessions)) {
    if (!session.id || !Number.isInteger(session.version)) continue;
    await mobileApi.patchExerciseSession(session.id, {
      expectedVersion: session.version,
      state: 'skipped',
    });
  }
  await mobileApi.completeWorkoutSession(context.workoutSessionId, context.workoutSessionVersion);
};

export const completeLiveSession = async (input: {
  context: LiveSessionContext;
  completedReps: number;
  repsPerSet: number;
  elapsedSeconds: number;
  metrics?: RepMetric[];
  finishWorkout?: boolean;
}): Promise<void> => {
  const metrics =
    input.metrics !== undefined && input.metrics.length > 0
      ? input.metrics
      : buildCountedRepMetrics(input.completedReps, input.repsPerSet, input.elapsedSeconds);
  for (let index = 0; index < metrics.length; index += 100) {
    await mobileApi.ingestMetrics(input.context.exerciseSessionId, {
      batchId: Crypto.randomUUID(),
      metrics: metrics.slice(index, index + 100),
    });
  }
  await mobileApi.completeExerciseSession(
    input.context.exerciseSessionId,
    input.context.exerciseSessionVersion,
  );
  if (input.finishWorkout === false) return;
  await finishLiveWorkout(input.context);
};
