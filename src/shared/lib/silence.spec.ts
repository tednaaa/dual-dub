import { describe, expect, it } from 'vitest';
import { isSilent, trackSilence } from './silence';

function track(levels: number[], playing = true, stepMs = 500) {
	return levels.reduce((silentMs, level) => trackSilence(silentMs, level, playing, stepMs), 0);
}

describe('trackSilence', () => {
	it('resets once a signal comes through', () => {
		expect(isSilent(track([0, 0, 0, 0, 0, 0, 0.2]))).toBe(false);
	});

	it('does not alert on a pause shorter than 3 s', () => {
		expect(isSilent(track([0, 0, 0, 0, 0]))).toBe(false);
	});

	it('alerts after 3 s of silence while playing', () => {
		expect(isSilent(track([0, 0, 0, 0, 0, 0]))).toBe(true);
	});

	it('does not count silence while the video is paused', () => {
		expect(isSilent(track([0, 0, 0, 0, 0, 0, 0, 0], false))).toBe(false);
	});
});
