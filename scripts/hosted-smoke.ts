type JsonRecord = Record<string, unknown>;

const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, '');
const demoToken = process.env.DEMO_ACCESS_TOKEN;
const secondaryToken = process.env.SECONDARY_ACCESS_TOKEN;
const runMutatingSmoke = process.env.RUN_MUTATING_SMOKE === 'true';
const runAccountDeletionSmoke = process.env.RUN_ACCOUNT_DELETION_SMOKE === 'true';

if (apiBaseUrl === undefined || apiBaseUrl.length === 0) {
  throw new Error('API_BASE_URL is required.');
}
if ((runMutatingSmoke || runAccountDeletionSmoke) && demoToken === undefined) {
  throw new Error('DEMO_ACCESS_TOKEN is required for mutating or account-deletion smoke tests.');
}
if (runAccountDeletionSmoke && !runMutatingSmoke) {
  throw new Error('RUN_ACCOUNT_DELETION_SMOKE requires RUN_MUTATING_SMOKE=true.');
}

const asRecord = (value: unknown, label: string): JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} was not an object.`);
  }
  return value as JsonRecord;
};

const asArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${label} was not an array.`);
  return value;
};

const asString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} was not a non-empty string.`);
  }
  return value;
};

const asNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} was not a number.`);
  }
  return value;
};

const responseData = (value: unknown, label: string): JsonRecord =>
  asRecord(asRecord(value, label).data, `${label}.data`);

const request = async (
  path: string,
  options: {
    readonly method?: string;
    readonly token?: string;
    readonly body?: unknown;
    readonly expected?: readonly number[];
  } = {},
): Promise<{ readonly status: number; readonly body: unknown }> => {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.token !== undefined) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  const body = text.length === 0 ? null : (JSON.parse(text) as unknown);
  const expected = options.expected ?? [200];
  if (!expected.includes(response.status)) {
    const error = body === null ? {} : asRecord(body, 'error response');
    const code = typeof error.code === 'string' ? error.code : 'unknown_error';
    throw new Error(`${options.method ?? 'GET'} ${path} returned ${response.status} (${code}).`);
  }
  return { status: response.status, body };
};

const idsFrom = (value: unknown, label: string): string[] =>
  asArray(value, label).map((entry, index) =>
    asString(asRecord(entry, `${label}[${index}]`).id, `${label}[${index}].id`),
  );

const publicSmoke = async (): Promise<JsonRecord> => {
  const health = responseData((await request('/healthz')).body, 'health response');
  if (health.status !== 'ok') throw new Error('Liveness check did not report ok.');
  const ready = responseData((await request('/readyz')).body, 'readiness response');
  if (ready.status !== 'ready') throw new Error('Readiness check did not report ready.');
  const references = responseData(
    (await request('/v1/reference-data')).body,
    'reference-data response',
  );
  const exercises = asRecord(
    (await request('/v1/exercises?limit=1')).body,
    'exercise-list response',
  );
  if (asArray(exercises.data, 'exercise-list response.data').length !== 1) {
    throw new Error('Exercise catalog smoke did not return one row.');
  }
  return references;
};

const authenticatedReadSmoke = async (token: string): Promise<void> => {
  await request('/v1/users/me', { token });
  await request('/v1/settings', { token });
  await request('/v1/movement-profile', { token });
  await request('/v1/workouts?limit=1', { token });
  await request('/v1/workout-sessions?limit=1', { token });
  await request('/v1/progress/summary', { token });
};

const metricRows = (targetSets: number, targetReps: number): JsonRecord[] => {
  const rows: JsonRecord[] = [];
  const reps = targetReps === 0 ? 0 : targetReps;
  for (let setNumber = 1; setNumber <= targetSets; setNumber += 1) {
    for (let repNumber = 1; repNumber <= reps; repNumber += 1) {
      rows.push({
        setNumber,
        repNumber,
        counted: true,
        durationMs: 3000,
        rangeOfMotionDeg: 80,
        targetPositionReached: true,
        accuracyScore: 90,
        controlScore: 90,
        stabilityScore: 90,
        formScore: 90,
        trackingConfidence: 0.95,
        feedbackCodes: [],
      });
    }
  }
  return rows;
};

const runCoreLoop = async (token: string, references: JsonRecord): Promise<void> => {
  const originalProfile = responseData(
    (await request('/v1/movement-profile', { token })).body,
    'movement-profile response',
  );
  let sessionId: string | undefined;
  let workoutId: string | undefined;
  let profileChanged = false;

  const restoreProfile = async (): Promise<void> => {
    if (!profileChanged) return;
    const current = responseData(
      (await request('/v1/movement-profile', { token })).body,
      'current movement-profile response',
    );
    await request('/v1/movement-profile', {
      method: 'PUT',
      token,
      body: {
        expectedVersion: asNumber(current.version, 'current profile version'),
        bodyRegions: asRecord(originalProfile.bodyRegions, 'original body regions'),
        capabilities: asRecord(originalProfile.capabilities, 'original capabilities'),
        equipmentIds: asArray(originalProfile.equipmentIds, 'original equipment IDs'),
        goalIds: asArray(originalProfile.goalIds, 'original goal IDs'),
        intensityPreference: asString(
          originalProfile.intensityPreference,
          'original intensity preference',
        ),
      },
    });
    profileChanged = false;
  };

  const cleanup = async (): Promise<void> => {
    if (sessionId !== undefined) {
      await request(`/v1/workout-sessions/${sessionId}`, {
        method: 'DELETE',
        token,
        expected: [204, 404],
      });
      sessionId = undefined;
    }
    if (workoutId !== undefined) {
      await request(`/v1/workouts/${workoutId}`, {
        method: 'DELETE',
        token,
        expected: [200, 404],
      });
      workoutId = undefined;
    }
    await restoreProfile();
  };

  try {
    const bodyRegionIds = idsFrom(references.bodyRegions, 'body regions');
    const capabilityIds = idsFrom(references.capabilities, 'capabilities');
    const equipmentIds = idsFrom(references.equipment, 'equipment');
    const goalIds = idsFrom(references.goals, 'goals');
    const bodyRegions = Object.fromEntries(bodyRegionIds.map((id) => [id, 'neutral']));
    const capabilities = Object.fromEntries(capabilityIds.map((id) => [id, 'available']));

    await request('/v1/movement-profile', {
      method: 'PUT',
      token,
      body: {
        expectedVersion: asNumber(originalProfile.version, 'original profile version'),
        bodyRegions,
        capabilities,
        equipmentIds,
        goalIds,
        intensityPreference: 'standard',
      },
    });
    profileChanged = true;

    const generated = responseData(
      (
        await request('/v1/workouts/generate', {
          method: 'POST',
          token,
          expected: [201],
          body: {
            clientRequestId: crypto.randomUUID(),
            durationMinutes: 5,
            equipmentIds,
            intensityPreference: 'standard',
          },
        })
      ).body,
      'generated-workout response',
    );
    workoutId = asString(generated.workoutId, 'generated workout ID');

    const createdSession = responseData(
      (
        await request('/v1/workout-sessions', {
          method: 'POST',
          token,
          expected: [201],
          body: { clientRequestId: crypto.randomUUID(), workoutId },
        })
      ).body,
      'workout-session response',
    );
    sessionId = asString(createdSession.id, 'workout session ID');

    const exerciseList = asRecord(
      (await request(`/v1/workout-sessions/${sessionId}/exercise-sessions`, { token })).body,
      'exercise-session list response',
    );
    const exerciseSessions = asArray(exerciseList.data, 'exercise-session list response.data');
    for (const [index, value] of exerciseSessions.entries()) {
      const initial = asRecord(value, `exercise session ${index}`);
      const exerciseSessionId = asString(initial.id, `exercise session ${index} ID`);
      const activated = responseData(
        (
          await request(`/v1/exercise-sessions/${exerciseSessionId}`, {
            method: 'PATCH',
            token,
            body: {
              expectedVersion: asNumber(initial.version, `exercise session ${index} version`),
              state: 'active',
            },
          })
        ).body,
        `activated exercise session ${index}`,
      );
      const rows = metricRows(
        asNumber(activated.targetSets, `exercise session ${index} target sets`),
        asNumber(activated.targetReps, `exercise session ${index} target reps`),
      );
      for (let offset = 0; offset < rows.length; offset += 100) {
        await request(`/v1/exercise-sessions/${exerciseSessionId}/metrics`, {
          method: 'POST',
          token,
          body: { batchId: crypto.randomUUID(), metrics: rows.slice(offset, offset + 100) },
        });
      }
      const current = responseData(
        (await request(`/v1/exercise-sessions/${exerciseSessionId}`, { token })).body,
        `current exercise session ${index}`,
      );
      await request(`/v1/exercise-sessions/${exerciseSessionId}/complete`, {
        method: 'POST',
        token,
        body: { expectedVersion: asNumber(current.version, `exercise session ${index} version`) },
      });
      await request(`/v1/exercise-sessions/${exerciseSessionId}/analysis`, { token });
    }

    const currentSession = responseData(
      (await request(`/v1/workout-sessions/${sessionId}`, { token })).body,
      'current workout session',
    );
    await request(`/v1/workout-sessions/${sessionId}/complete`, {
      method: 'POST',
      token,
      body: { expectedVersion: asNumber(currentSession.version, 'workout session version') },
    });
    await request('/v1/progress/summary', { token });
    await request('/v1/progress/activity', { token });

    if (secondaryToken !== undefined) {
      await request(`/v1/workout-sessions/${sessionId}`, {
        token: secondaryToken,
        expected: [404],
      });
    }

    await cleanup();
    await request(`/v1/workout-sessions/${asString(currentSession.id, 'deleted session ID')}`, {
      token,
      expected: [404],
    });
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error('Hosted smoke cleanup also failed.', cleanupError);
    }
    throw error;
  }
};

const references = await publicSmoke();
console.log('Public deployment smoke passed.');

if (demoToken !== undefined) {
  await authenticatedReadSmoke(demoToken);
  console.log('Authenticated read smoke passed.');
}

if (runMutatingSmoke && demoToken !== undefined) {
  await runCoreLoop(demoToken, references);
  console.log('Mutating workout/session/progress smoke passed and test data was cleaned up.');
}

if (runAccountDeletionSmoke && demoToken !== undefined) {
  await request('/v1/users/me', { method: 'DELETE', token: demoToken, expected: [204] });
  await request('/v1/users/me', { token: demoToken, expected: [401] });
  console.log('Disposable-account deletion smoke passed.');
}
