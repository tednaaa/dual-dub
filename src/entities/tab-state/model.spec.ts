import type { CapturedSource, TabState } from './model';
import type { Track } from '@/shared/lib';
import { describe, expect, it } from 'vitest';
import { MAIN_TRACK } from '@/shared/lib';
import { assignEar, EMPTY_TAB_STATE, loadPage, navigate, playerFrame, recordManifest, recordSegment, recordSource, restoreEars } from './model';

const stream = (url: string, frameId = 3): CapturedSource => ({ url, kind: 'hls', frameId });
const urls = (state: TabState) => state.sources.map(source => source.url);
const running = (state: TabState): TabState => ({ ...state, playerFrameId: 3 });
const mainDub = (sourceUrl: string) => ({ sourceUrl, trackId: MAIN_TRACK.id });

function withSources(...streams: CapturedSource[]): TabState {
	return streams.reduce((state, captured) => recordSource(state, captured), EMPTY_TAB_STATE);
}

const dashUrl = 'https://cdn.example/khw4RhAaYa';
function dashTrack(id: string): Track {
	return {
		id,
		lang: `rus${id}`,
		label: null,
		segmentPrefixes: [`https://cdn.example/x/4.1-2ch-${id}/`],
		representationIds: [id],
	};
}
const segment = (id: string) => `https://cdn.example/x/4.1-2ch-${id}/7.webm?t=1`;
const dashDub = (trackId: string) => ({ sourceUrl: dashUrl, trackId });
const dash = recordManifest(
	recordSource(EMPTY_TAB_STATE, { url: dashUrl, kind: 'dash', frameId: 3 }),
	dashUrl,
	{ tracks: [dashTrack('0'), dashTrack('1')], variants: [] },
);

describe('recordSource', () => {
	it('moves a repeated url to the end instead of duplicating it', () => {
		const state = withSources(stream('https://a/ru.m3u8'), stream('https://a/en.m3u8'), stream('https://a/ru.m3u8'));

		expect(urls(state)).toEqual(['https://a/en.m3u8', 'https://a/ru.m3u8']);
	});

	it('numbers sources in capture order and keeps the number of a repeated url', () => {
		const state = withSources(stream('https://a/ru.m3u8'), stream('https://a/en.m3u8'), stream('https://a/ru.m3u8'), stream('https://a/uk.m3u8'));

		expect(state.sources.map(({ number }) => number)).toEqual([2, 1, 3]);
	});

	it('ignores the source of an ear loaded by the hidden player', () => {
		const assigned = recordSource(assignEar(withSources(stream('https://a/en.m3u8')), 'left', mainDub('https://a/en.m3u8')), stream('https://a/ru.m3u8'));

		const state = recordSource(running(assigned), stream('https://a/en.m3u8'));

		expect(urls(state)).toEqual(['https://a/en.m3u8', 'https://a/ru.m3u8']);
		expect(state.playing?.sourceUrl).toBe('https://a/ru.m3u8');
	});

	it('keeps a source assigned to an ear beyond the limit', () => {
		const assigned = assignEar(withSources(stream('https://a/0.m3u8')), 'left', mainDub('https://a/0.m3u8'));
		const later = Array.from({ length: 20 }, (_, index) => stream(`https://a/${index + 1}.m3u8`));

		expect(urls(later.reduce((state, captured) => recordSource(state, captured), assigned))[0]).toBe('https://a/0.m3u8');
	});

	it('ignores a known variant playlist', () => {
		const state = recordManifest(withSources(stream('https://a/master.m3u8')), 'https://a/master.m3u8', { tracks: [MAIN_TRACK], variants: ['https://a/1080/index.m3u8'] });

		expect(urls(recordSource(state, stream('https://a/1080/index.m3u8')))).toEqual(['https://a/master.m3u8']);
	});
});

describe('recordManifest', () => {
	it('drops variants captured before the master was parsed and plays the master', () => {
		const captured = withSources(stream('https://a/master.m3u8'), stream('https://a/1080/index.m3u8'));

		const state = recordManifest(captured, 'https://a/master.m3u8', { tracks: [MAIN_TRACK], variants: ['https://a/1080/index.m3u8'] });

		expect(urls(state)).toEqual(['https://a/master.m3u8']);
		expect(state.playing?.sourceUrl).toBe('https://a/master.m3u8');
	});

	it('waits for a segment to tell which of several tracks plays', () => {
		expect(dash.playing).toBeNull();
	});

	it('replaces a manifest with several tracks reloaded under a new url', () => {
		const reloadedUrl = `${dashUrl}?token=2`;
		const assigned: TabState = { ...dash, ears: { left: { sourceUrl: dashUrl, trackId: '0' } } };
		const reloaded = recordSource(assigned, { url: reloadedUrl, kind: 'dash', frameId: 3 });

		const state = recordManifest(reloaded, reloadedUrl, { tracks: [dashTrack('0'), dashTrack('1')], variants: [] });

		expect(urls(state)).toEqual([reloadedUrl]);
		expect(state.ears.left).toBeUndefined();
	});
});

describe('recordSegment', () => {
	it('marks the track whose segment the site loads', () => {
		expect(recordSegment(dash, segment('1')).playing).toEqual(dashDub('1'));
	});

	it('ignores segments of an ear loaded by the hidden player', () => {
		const assigned = assignEar(dash, 'left', dashDub('0'));

		const state = recordSegment(recordSegment(running(assigned), segment('1')), segment('0'));

		expect(state.playing).toEqual(dashDub('1'));
	});
});

describe('assignEar', () => {
	it('assigns the chosen track', () => {
		expect(assignEar(dash, 'right', dashDub('1')).ears.right).toEqual(dashDub('1'));
	});

	it('ignores a track the tab never captured', () => {
		expect(assignEar(dash, 'left', dashDub('9'))).toBe(dash);
	});
});

describe('restoreEars', () => {
	it('assigns the remembered tracks of a manifest with several tracks', () => {
		const state = restoreEars(dash, dashUrl, (tracks, ear) => tracks[ear === 'left' ? 1 : 0]);

		expect(state.ears).toEqual({ left: dashDub('1'), right: dashDub('0') });
	});

	it('keeps the ears picked on this page', () => {
		const assigned = assignEar(dash, 'left', dashDub('0'));

		expect(restoreEars(assigned, dashUrl, tracks => tracks[1])).toBe(assigned);
	});
});

describe('navigate', () => {
	it('keeps sources when only the hash changes', () => {
		const state = navigate(withSources(stream('https://a/ru.m3u8')), 'https://site/show/1#t:56');

		expect(navigate(state, 'https://site/show/1#t:110').sources).toHaveLength(1);
	});

	it('resets sources on another page', () => {
		const state = navigate(withSources(stream('https://a/ru.m3u8')), 'https://site/show/1');

		expect(navigate(state, 'https://site/show/2').sources).toEqual([]);
	});

	it('keeps only the sources of ears when the page loads again', () => {
		const captured = navigate(withSources(stream('https://a/ru.m3u8'), stream('https://a/en.m3u8')), 'https://site/show/1');
		const assigned = assignEar(captured, 'left', mainDub('https://a/ru.m3u8'));

		const state = loadPage(assigned, 'https://site/show/1');

		expect(urls(state)).toEqual(['https://a/ru.m3u8']);
		expect(state.ears.left).toEqual(mainDub('https://a/ru.m3u8'));
	});
});

describe('playerFrame', () => {
	it('targets the frame of the latest captured source', () => {
		expect(playerFrame(withSources(stream('https://a/en.m3u8', 3), stream('https://b/ru.m3u8', 7)))).toBe(7);
	});
});
