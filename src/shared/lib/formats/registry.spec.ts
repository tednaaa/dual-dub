import { describe, expect, it } from 'vitest';
import { detectKind } from './registry';

const request = (url: string, type = 'xmlhttprequest', contentType = '') => ({ url, type, contentType });

describe('detectKind', () => {
	it('detects an HLS manifest regardless of query', () => {
		expect(detectKind(request('https://cdn.example/x/master.m3u8?token=abc'))).toBe('hls');
	});

	it('ignores HLS segments', () => {
		expect(detectKind(request('https://cdn.example/x/seg-12.ts'))).toBeNull();
		expect(detectKind(request('https://cdn.example/x/seg-12.m4s'))).toBeNull();
		expect(detectKind(request('https://cdn.example/x/seg-12.aac'))).toBeNull();
	});

	it('detects a DASH manifest by extension', () => {
		expect(detectKind(request('https://cdn.example/x/manifest.mpd?token=abc'))).toBe('dash');
	});

	it('detects a DASH manifest without extension by its content type', () => {
		expect(detectKind(request('https://cdn.example/khw4RhAaYa8x', 'xmlhttprequest', 'Application/Dash+XML; charset=utf-8'))).toBe('dash');
	});

	it('ignores DASH segments', () => {
		expect(detectKind(request('https://cdn.example/khw4RhAaYa8x', 'xmlhttprequest', 'video/webm'))).toBeNull();
	});

	it('detects an mp4 loaded by a media element', () => {
		expect(detectKind(request('https://cdn.example/x/720.mp4?expires=1', 'media'))).toBe('mp4');
	});

	it('ignores mp4 fetched by a script as a segment', () => {
		expect(detectKind(request('https://cdn.example/x/chunk-3.mp4'))).toBeNull();
	});

	it('ignores unrelated requests', () => {
		expect(detectKind(request('https://site.example/api/episodes?id=1'))).toBeNull();
	});
});
