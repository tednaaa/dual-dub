import { describe, expect, it } from 'vitest';
import { parseVariants, streamKind } from './stream-url';

describe('streamKind', () => {
	it('detects an HLS manifest regardless of query', () => {
		expect(streamKind('https://cdn.example/x/master.m3u8?token=abc', 'xmlhttprequest')).toBe('hls');
	});

	it('ignores HLS segments', () => {
		expect(streamKind('https://cdn.example/x/seg-12.ts', 'xmlhttprequest')).toBeNull();
		expect(streamKind('https://cdn.example/x/seg-12.m4s', 'xmlhttprequest')).toBeNull();
		expect(streamKind('https://cdn.example/x/seg-12.aac', 'xmlhttprequest')).toBeNull();
	});

	it('detects an mp4 loaded by a media element', () => {
		expect(streamKind('https://cdn.example/x/720.mp4?expires=1', 'media')).toBe('mp4');
	});

	it('ignores mp4 fetched by a script as a segment', () => {
		expect(streamKind('https://cdn.example/x/chunk-3.mp4', 'xmlhttprequest')).toBeNull();
	});

	it('ignores unrelated requests', () => {
		expect(streamKind('https://site.example/api/episodes?id=1', 'xmlhttprequest')).toBeNull();
	});
});

describe('parseVariants', () => {
	const masterUrl = 'https://cdn.example/hls/master.m3u8?token=abc';

	it('resolves variant playlists against the manifest url', () => {
		const manifest = [
			'#EXTM3U',
			'#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360',
			'360/index.m3u8',
			'#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080',
			'https://other.example/1080/index.m3u8',
		].join('\n');

		expect(parseVariants(manifest, masterUrl)).toEqual([
			'https://cdn.example/hls/360/index.m3u8',
			'https://other.example/1080/index.m3u8',
		]);
	});

	it('collects audio renditions and i-frame playlists', () => {
		const manifest = [
			'#EXTM3U',
			'#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="ru",URI="audio/ru.m3u8"',
			'#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=90000,URI="iframes.m3u8"',
		].join('\r\n');

		expect(parseVariants(manifest, masterUrl)).toEqual([
			'https://cdn.example/hls/audio/ru.m3u8',
			'https://cdn.example/hls/iframes.m3u8',
		]);
	});

	it('finds nothing in a media playlist', () => {
		const manifest = ['#EXTM3U', '#EXT-X-TARGETDURATION:6', '#EXTINF:6.0,', 'seg-1.ts'].join('\n');

		expect(parseVariants(manifest, masterUrl)).toEqual([]);
	});
});
