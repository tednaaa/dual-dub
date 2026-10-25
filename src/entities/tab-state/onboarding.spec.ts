import type { Source, TabState } from './model';
import { describe, expect, it } from 'vitest';
import { assignEar, EMPTY_TAB_STATE, recordSource } from './model';
import { ONBOARDING_DONE, onboardingStep } from './onboarding';

const stream = (url: string): Omit<Source, 'tracks'> => ({ url, kind: 'hls', frameId: 3 });

const original = recordSource(EMPTY_TAB_STATE, stream('https://a/en.m3u8'));
const leftAssigned = assignEar(original, 'left');
const switched = recordSource(leftAssigned, stream('https://a/ru.m3u8'));
const bothAssigned = assignEar(switched, 'right');

describe('onboardingStep', () => {
	it('asks to play the video until a dub plays', () => {
		expect(onboardingStep(EMPTY_TAB_STATE)).toBe(1);
	});

	it('asks to take the first dub once it plays', () => {
		expect(onboardingStep(original)).toBe(2);
	});

	it('asks to switch the dub while the site plays the assigned one', () => {
		expect(onboardingStep(leftAssigned)).toBe(3);
	});

	it('asks to take the second dub after switching', () => {
		expect(onboardingStep(switched)).toBe(4);
	});

	it('counts the right ear assigned first the same way', () => {
		expect(onboardingStep(assignEar(original, 'right'))).toBe(3);
	});

	it('asks to enable once both ears are assigned', () => {
		expect(onboardingStep(bothAssigned)).toBe(5);
	});

	it('is done while dual dub is running', () => {
		const running: TabState = { ...bothAssigned, playerFrameId: 3 };

		expect(onboardingStep(running)).toBe(ONBOARDING_DONE);
	});
});
