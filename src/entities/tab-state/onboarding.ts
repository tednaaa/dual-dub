import type { TabState } from './model';

export const ONBOARDING_STEPS = [1, 2, 3, 4] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_DONE = 5;

export function onboardingStep(state: TabState): OnboardingStep | typeof ONBOARDING_DONE {
	const { left, right } = state.ears;

	if (state.playerFrameId !== null)
		return ONBOARDING_DONE;
	if (left && right)
		return 4;
	if (left || right)
		return 3;
	return state.sources.length > 0 ? 2 : 1;
}

export function hasSingleDub(state: TabState): boolean {
	return state.sources.flatMap(source => source.tracks).length < 2;
}
