import type { TabState } from './model';
import { describe, expect, it } from 'vitest';
import { MAIN_TRACK } from '@/shared/lib';
import { assignEar, EMPTY_TAB_STATE, recordManifest, recordSource } from './model';
import { hasSingleDub, ONBOARDING_DONE, onboardingStep } from './onboarding';

const enUrl = 'https://a/en.m3u8';
const ruUrl = 'https://a/ru.m3u8';
const dub = (sourceUrl: string) => ({ sourceUrl, trackId: MAIN_TRACK.id });

const captured = recordSource(recordSource(EMPTY_TAB_STATE, { url: enUrl, kind: 'hls', frameId: 3 }), { url: ruUrl, kind: 'hls', frameId: 3 });
const bothAssigned = assignEar(assignEar(captured, 'left', dub(enUrl)), 'right', dub(ruUrl));

describe('onboardingStep', () => {
	it('asks to play the video until a dub is captured', () => {
		expect(onboardingStep(EMPTY_TAB_STATE)).toBe(1);
	});

	it('asks to pick a dub for one ear once captured', () => {
		expect(onboardingStep(captured)).toBe(2);
	});

	it('asks to pick a dub for the other ear whichever ear came first', () => {
		expect(onboardingStep(assignEar(captured, 'right', dub(ruUrl)))).toBe(3);
	});

	it('asks to enable once both ears are assigned', () => {
		expect(onboardingStep(bothAssigned)).toBe(4);
	});

	it('is done while dual dub is running', () => {
		const running: TabState = { ...bothAssigned, playerFrameId: 3 };

		expect(onboardingStep(running)).toBe(ONBOARDING_DONE);
	});
});

describe('hasSingleDub', () => {
	it('is true while one stream with one dub is captured', () => {
		expect(hasSingleDub(recordSource(EMPTY_TAB_STATE, { url: enUrl, kind: 'hls', frameId: 3 }))).toBe(true);
	});

	it('is false for a manifest with several tracks', () => {
		const url = 'https://cdn.example/khw4RhAaYa';
		const track = (id: string) => ({ ...MAIN_TRACK, id });
		const state = recordManifest(recordSource(EMPTY_TAB_STATE, { url, kind: 'dash', frameId: 3 }), url, { tracks: [track('0'), track('1')], variants: [] });

		expect(hasSingleDub(state)).toBe(false);
	});
});
