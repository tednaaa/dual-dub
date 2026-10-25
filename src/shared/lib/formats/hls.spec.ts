import { describe, expect, it } from 'vitest';
import { parseVariants } from './hls';

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
