import type { Dub, Source } from '@/entities/tab-state';
import type { StreamKind } from '@/shared/lib';

export interface NumberedDub {
	dub: Dub;
	number: number;
}

export interface DubGroup {
	key: string;
	kind: StreamKind;
	host: string | null;
	dubs: NumberedDub[];
}

const dubsOf = (source: Source): Dub[] => source.tracks.map(track => ({ source, track }));

const numbered = (dubs: Dub[]): NumberedDub[] => dubs.map((dub, index) => ({ dub, number: index + 1 }));

export function groupDubs(sources: Source[]): DubGroup[] {
	const manifests = sources
		.filter(({ tracks }) => tracks.length > 1)
		.toReversed()
		.map(source => ({ key: source.url, kind: source.kind, host: new URL(source.url).hostname, dubs: numbered(dubsOf(source)) }));
	const streams = sources.filter(({ tracks }) => tracks.length === 1).toSorted((a, b) => a.number - b.number);
	const kinds = [...new Set(streams.map(({ kind }) => kind))];
	return [
		...manifests,
		...kinds.map(kind => ({ key: kind, kind, host: null, dubs: numbered(streams.filter(source => source.kind === kind).flatMap(dubsOf)) })),
	];
}
