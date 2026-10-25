import type { Source } from '@/entities/tab-state';
import type { StreamKind, Track } from '@/shared/lib';
import { describe, expect, it } from 'vitest';
import { MAIN_TRACK } from '@/shared/lib';
import { groupDubs } from './dub-groups';

const track = (id: string): Track => ({ id, lang: null, label: null, segmentPrefixes: [], representationIds: [id] });

function source(url: string, kind: StreamKind, number: number, tracks: Track[] = [MAIN_TRACK]): Source {
	return { url, kind, frameId: 3, tracks, number };
}

describe('groupDubs', () => {
	it('merges single streams of one kind into one group numbered in capture order', () => {
		const sources = [
			source('https://b/master.m3u8', 'hls', 5),
			source('https://cdn/manifest.mpd', 'dash', 3, [track('0'), track('1')]),
			source('https://a/master.m3u8', 'hls', 2),
			source('https://c/video.mp4', 'mp4', 4),
		];

		const groups = groupDubs(sources).map(({ host, dubs }) => ({ host, dubs: dubs.map(({ dub, number }) => [dub.source.url, number]) }));

		expect(groups).toEqual([
			{ host: 'cdn', dubs: [['https://cdn/manifest.mpd', 1], ['https://cdn/manifest.mpd', 2]] },
			{ host: null, dubs: [['https://a/master.m3u8', 1], ['https://b/master.m3u8', 2]] },
			{ host: null, dubs: [['https://c/video.mp4', 1]] },
		]);
	});
});
