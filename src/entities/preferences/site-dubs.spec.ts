import type { Track } from '@/shared/lib';
import { describe, expect, it } from 'vitest';
import { recallTrack } from './site-dubs';

const track = (id: string, lang: string): Track => ({ id, lang, label: null, segmentPrefixes: [], representationIds: [id] });

describe('recallTrack', () => {
	it('finds the language that moved to another position', () => {
		const tracks = [track('0', 'rus'), track('1', 'eng'), track('2', 'ukr')];

		expect(recallTrack(tracks, { lang: 'ukr', index: 1 })?.id).toBe('2');
	});

	it('picks the remembered position among tracks of one language', () => {
		const tracks = [track('0', 'ru'), track('1', 'ru'), track('2', 'ru')];

		expect(recallTrack(tracks, { lang: 'ru', index: 2 })?.id).toBe('2');
	});

	it('falls back to the position when the language is gone', () => {
		const tracks = [track('0', 'rus0'), track('1', 'rus1')];

		expect(recallTrack(tracks, { lang: 'eng6', index: 1 })?.id).toBe('1');
	});

	it('finds nothing when neither the language nor the position exists', () => {
		expect(recallTrack([track('0', 'rus0')], { lang: 'eng6', index: 6 })).toBeUndefined();
	});
});
