import type { TabState } from './model';
import { sameDub } from './model';

export const ONBOARDING_STEPS = [1, 2, 3, 4, 5] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_DONE = 6;

export function onboardingStep(state: TabState): OnboardingStep | typeof ONBOARDING_DONE {
	const { left, right } = state.ears;
	const { playing } = state;
	const assigned = left ?? right;

	if (state.playerFrameId !== null)
		return ONBOARDING_DONE;
	if (left && right)
		return 5;
	if (assigned)
		return playing && !sameDub(playing, assigned) ? 4 : 3;
	return playing ? 2 : 1;
}
