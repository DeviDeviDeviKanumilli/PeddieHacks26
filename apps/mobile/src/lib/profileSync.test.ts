import { movementProfileRequest, settingsPatch } from '@/lib/profileSync';
import type { MovementProfile } from '@/types';

const profile: MovementProfile = {
  goals: ['Build strength', 'Improve balance'],
  regions: {
    shoulders: 'focus',
    'left-knee': 'avoid',
    ankles: 'limited',
  },
  capabilities: {
    'seated-posture': 'focus',
    standing: 'limited',
    'grip-with-left-hand': 'avoid',
  },
  equipment: ['None', 'Stable chair', 'Resistance band'],
  accessibility: ['Reduced motion', 'Spoken feedback', 'Haptic feedback'],
  onboardingComplete: true,
};

describe('mobile profile synchronization', () => {
  it('maps display labels to reviewed backend reference identifiers', () => {
    expect(movementProfileRequest(profile, 3)).toEqual({
      expectedVersion: 3,
      bodyRegions: {
        shoulders: 'focus',
        left_knee: 'avoid',
        ankles_feet: 'limited',
      },
      capabilities: {
        seated_posture: 'available',
        standing: 'limited',
        left_grip: 'avoid',
      },
      equipmentIds: ['stable-chair', 'resistance_band'],
      goalIds: ['strength', 'balance'],
      intensityPreference: 'standard',
    });
  });

  it('converts communication choices into a narrow settings patch', () => {
    expect(settingsPatch(profile)).toEqual({
      accessibilityPreferences: {
        reducedMotion: true,
        highContrast: false,
        largerText: false,
      },
      feedbackPreferences: {
        spokenFeedback: true,
        hapticFeedback: true,
        visualFeedback: true,
      },
    });
  });
});
