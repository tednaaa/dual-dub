import type { XmlNode } from '@svta/cml-xml';
import type { Format, ParsedManifest, Track } from './types';
import { parseXml } from '@svta/cml-xml';
import { MAIN_TRACK } from './track';

const DASH_CONTENT_TYPE = 'application/dash+xml';

interface AdaptationSet {
	track: Omit<Track, 'segmentPrefixes'>;
	audio: boolean;
	prefixes: string[];
}

const childrenOf = (node: XmlNode, name: string) => node.childNodes.filter(child => child.localName === name);

const textOf = (node: XmlNode) => node.childNodes.map(child => child.nodeValue ?? '').join('').trim();

function resolveBases(node: XmlNode, parents: string[]): string[] {
	const own = childrenOf(node, 'BaseURL').map(textOf);
	if (own.length === 0)
		return parents;

	return [...new Set(own.flatMap(url => parents.map(parent => new URL(url, parent).href)))];
}

function mediaPrefix(representation: XmlNode, ancestors: XmlNode[]): string {
	const media = [representation, ...ancestors]
		.map(node => childrenOf(node, 'SegmentTemplate')[0]?.attributes.media)
		.find(template => template !== undefined) ?? '';
	const filled = media
		.replaceAll('$RepresentationID$', representation.attributes.id ?? '')
		.replaceAll('$Bandwidth$', representation.attributes.bandwidth ?? '');
	return filled.split('$')[0] ?? '';
}

function isAudio(set: XmlNode): boolean {
	return [set, ...childrenOf(set, 'Representation')]
		.some(({ attributes }) => attributes.contentType === 'audio' || attributes.mimeType?.startsWith('audio/'));
}

function describeSet(set: XmlNode, period: XmlNode, periodBases: string[], index: number): AdaptationSet {
	const bases = resolveBases(set, periodBases);
	const representations = childrenOf(set, 'Representation');
	return {
		track: {
			id: set.attributes.id ?? String(index),
			lang: set.attributes.lang ?? null,
			label: childrenOf(set, 'Label').map(textOf)[0] ?? null,
			representationIds: representations.flatMap(representation => representation.attributes.id ?? []),
		},
		audio: isAudio(set),
		prefixes: representations.flatMap((representation) => {
			const prefix = mediaPrefix(representation, [set, period]);
			return resolveBases(representation, bases).map(base => new URL(prefix, base).href);
		}),
	};
}

function ownersOf(sets: AdaptationSet[]): Map<string, Set<string>> {
	const owners = new Map<string, Set<string>>();
	for (const { track, prefixes } of sets) {
		for (const prefix of prefixes)
			owners.set(prefix, (owners.get(prefix) ?? new Set()).add(track.id));
	}
	return owners;
}

export function parseDash(manifest: string, url: string): ParsedManifest {
	const mpd = parseXml(manifest).childNodes.find(node => node.localName === 'MPD');
	const mpdBases = mpd ? resolveBases(mpd, [url]) : [];
	const sets = (mpd ? childrenOf(mpd, 'Period') : []).flatMap((period) => {
		const periodBases = resolveBases(period, mpdBases);
		return childrenOf(period, 'AdaptationSet').map((set, index) => describeSet(set, period, periodBases, index));
	});
	const owners = ownersOf(sets);

	const tracks = new Map<string, Track>();
	for (const { track, prefixes } of sets.filter(set => set.audio)) {
		const own = prefixes.filter(prefix => owners.get(prefix)?.size === 1);
		const known = tracks.get(track.id);
		tracks.set(track.id, {
			...track,
			segmentPrefixes: [...new Set([...(known?.segmentPrefixes ?? []), ...own])],
			representationIds: [...(known?.representationIds ?? []), ...track.representationIds],
		});
	}

	return { tracks: tracks.size > 0 ? [...tracks.values()] : [MAIN_TRACK], variants: [] };
}

export const dash: Format = {
	detect: ({ url, contentType }) => new URL(url).pathname.toLowerCase().endsWith('.mpd')
		|| contentType.split(';')[0]?.trim().toLowerCase() === DASH_CONTENT_TYPE,
	parse: parseDash,
};
