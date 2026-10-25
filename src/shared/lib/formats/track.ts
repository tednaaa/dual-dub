import type { Track } from './types';

export const MAIN_TRACK: Track = { id: 'main', lang: null, label: null, segmentPrefixes: [], representationIds: [] };

export function matchSegment(tracks: Track[], url: string): Track | undefined {
	const matches = tracks.flatMap(track => track.segmentPrefixes
		.filter(prefix => url.startsWith(prefix))
		.map(prefix => ({ track, length: prefix.length })));
	return matches.sort((a, b) => b.length - a.length)[0]?.track;
}
