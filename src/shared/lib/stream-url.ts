import type { StreamKind } from '@/shared/api';

const URI_ATTRIBUTE = /URI="([^"]+)"/;

export function streamKind(url: string, requestType: string): StreamKind | null {
	const pathname = new URL(url).pathname.toLowerCase();
	if (pathname.endsWith('.m3u8'))
		return 'hls';
	if (pathname.endsWith('.mp4') && requestType === 'media')
		return 'mp4';
	return null;
}

export function parseVariants(manifest: string, manifestUrl: string): string[] {
	const lines = manifest.split(/\r?\n/).map(line => line.trim());
	const uris = lines.flatMap((line, index) => {
		if (line.startsWith('#EXT-X-STREAM-INF'))
			return lines.slice(index + 1).find(next => next && !next.startsWith('#')) ?? [];
		if (line.startsWith('#EXT-X-I-FRAME-STREAM-INF') || line.startsWith('#EXT-X-MEDIA'))
			return line.match(URI_ATTRIBUTE)?.[1] ?? [];
		return [];
	});
	return uris.map(uri => new URL(uri, manifestUrl).href);
}
