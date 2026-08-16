// public domain surface. route handlers import from here instead of copying rules.
// named exports are the engines; star exports are types plus helpers those files own.
export * from './analytics.js';
export { CURATED_EXERCISES } from './catalog.js'; // catalog is data, not an engine. keep the helper fns private.
export { evaluateCompatibility } from './compatibility.js';
export { exerciseCountForDuration, generateWorkout, rankExercises } from './generation.js';
export * from './session-state.js';
export * from './types.js';
export { clamp } from './utils.js'; // only public util. do not grow a kitchen-sink helpers module.
// keep this barrel boring. do not add side effects or re-export intelligence from here.
