import type { Format } from './types';
import { MAIN_TRACK } from './track';

const URI_ATTRIBUTE = /URI="([^"]+)"/;

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

export const hls: Format = {
	detect: ({ url }) => new URL(url).pathname.toLowerCase().endsWith('.m3u8'),
	parse: (manifest, url) => ({ tracks: [MAIN_TRACK], variants: parseVariants(manifest, url) }),
};
