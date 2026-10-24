import type { CapturedStream, TabState } from './model';
import { describe, expect, it } from 'vitest';
import { assignEar, EMPTY_TAB_STATE, loadPage, navigate, playerFrame, recordStream, recordVariants } from './model';

const stream = (url: string, frameId = 3): CapturedStream => ({ url, kind: 'hls', frameId });

function withStreams(...streams: CapturedStream[]): TabState {
	return streams.reduce(recordStream, EMPTY_TAB_STATE);
}

describe('recordStream', () => {
	it('moves a repeated url to the end instead of duplicating it', () => {
		const state = withStreams(stream('https://a/ru.m3u8'), stream('https://a/en.m3u8'), stream('https://a/ru.m3u8'));

		expect(state.streams.map(captured => captured.url)).toEqual(['https://a/en.m3u8', 'https://a/ru.m3u8']);
	});

	it('ignores a url already assigned to an ear', () => {
		const assigned = assignEar(withStreams(stream('https://a/ru.m3u8'), stream('https://a/en.m3u8')), 'left');

		const state = recordStream(recordStream(assigned, stream('https://a/ru.m3u8')), stream('https://a/en.m3u8'));

		expect(state.streams.map(captured => captured.url)).toEqual(['https://a/en.m3u8', 'https://a/ru.m3u8']);
	});

	it('ignores a known variant playlist', () => {
		const state = recordVariants(withStreams(stream('https://a/master.m3u8')), ['https://a/1080/index.m3u8']);

		expect(recordStream(state, stream('https://a/1080/index.m3u8')).streams.map(captured => captured.url)).toEqual(['https://a/master.m3u8']);
	});
});

describe('recordVariants', () => {
	it('drops variants captured before the master was parsed', () => {
		const state = withStreams(stream('https://a/master.m3u8'), stream('https://a/1080/index.m3u8'));

		expect(recordVariants(state, ['https://a/1080/index.m3u8']).streams.map(captured => captured.url)).toEqual(['https://a/master.m3u8']);
	});
});

describe('assignEar', () => {
	it('assigns the latest captured stream', () => {
		const state = withStreams(stream('https://a/en.m3u8'), stream('https://a/ru.m3u8'));

		expect(assignEar(state, 'right').ears.right?.url).toBe('https://a/ru.m3u8');
	});

	it('leaves the state unchanged when nothing was captured', () => {
		expect(assignEar(EMPTY_TAB_STATE, 'left')).toBe(EMPTY_TAB_STATE);
	});
});

describe('navigate', () => {
	it('keeps streams when only the hash changes', () => {
		const state = navigate(withStreams(stream('https://a/ru.m3u8')), 'https://site/show/1#t:56');

		expect(navigate(state, 'https://site/show/1#t:110').streams).toHaveLength(1);
	});

	it('resets streams on another page', () => {
		const state = navigate(withStreams(stream('https://a/ru.m3u8')), 'https://site/show/1');

		expect(navigate(state, 'https://site/show/2').streams).toEqual([]);
	});

	it('keeps only the ears when the page loads again', () => {
		const assigned = assignEar(navigate(withStreams(stream('https://a/ru.m3u8')), 'https://site/show/1'), 'left');

		const state = loadPage(recordStream(assigned, stream('https://a/en.m3u8')), 'https://site/show/1');

		expect(state.streams).toEqual([]);
		expect(state.ears.left?.url).toBe('https://a/ru.m3u8');
	});
});

describe('playerFrame', () => {
	it('targets the frame of the latest captured stream', () => {
		expect(playerFrame(withStreams(stream('https://a/en.m3u8', 3), stream('https://b/ru.m3u8', 7)))).toBe(7);
	});
});
