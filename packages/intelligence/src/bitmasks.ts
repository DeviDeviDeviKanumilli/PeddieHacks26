import type { CatalogExercise, EquipmentToken, MovementProfile, Position } from './types.js';

export const EQUIPMENT_BITS: Record<EquipmentToken, number> = {
  chair: 1,
  wall: 2,
  band: 4,
  dumbbells: 8,
};

export const POSITION_BITS: Record<Position, number> = {
  seated: 1,
  standing: 2,
  floor: 4,
  kneeling: 8,
};

export const packEquipment = (tokens: readonly EquipmentToken[]): number =>
  tokens.reduce((mask, token) => mask | EQUIPMENT_BITS[token], 0);

export const packPosition = (position: Position): number => POSITION_BITS[position];

const availableEquipment = (profile: MovementProfile): number => {
  if (profile.equipment.length === 0) return EQUIPMENT_BITS.chair;
  return packEquipment(profile.equipment);
};

export const equipmentEligible = (exercise: CatalogExercise, profile: MovementProfile): boolean => {
  const available = availableEquipment(profile);
  const required = packEquipment(exercise.equipment);
  if (required === 0) return true;
  if (exercise.equipmentOrGroup) return (required & available) !== 0;
  return (required & available) === required;
};
