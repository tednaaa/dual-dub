import type { Track } from './types';
import { describe, expect, it } from 'vitest';
import { matchSegment } from './track';

const track = (id: string, ...segmentPrefixes: string[]): Track => ({ id, lang: null, label: null, segmentPrefixes, representationIds: [] });

const tracks = [
	track('0', 'https://a.example/x/4.1-2ch-0/', 'https://b.example/x/4.1-2ch-0/'),
	track('1', 'https://a.example/x/4.1-2ch-1/', 'https://b.example/x/4.1-2ch-1/'),
];

describe('matchSegment', () => {
	it('finds the track of a segment loaded from any base url', () => {
		expect(matchSegment(tracks, 'https://b.example/x/4.1-2ch-1/12.webm?t=1')?.id).toBe('1');
	});

	it('ignores a video segment', () => {
		expect(matchSegment(tracks, 'https://a.example/x/20.1/12.webm?t=1')).toBeUndefined();
	});
});
