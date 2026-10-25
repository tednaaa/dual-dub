import type { DubRef, Ear } from '@/shared/api';
import type { ParsedManifest, StreamKind, Track } from '@/shared/lib';
import { MAIN_TRACK, matchSegment } from '@/shared/lib';

const SOURCES_LIMIT = 20;
const VARIANTS_LIMIT = 200;

export interface Source {
	url: string;
	kind: StreamKind;
	frameId: number;
	tracks: Track[];
	number: number;
}

export type CapturedSource = Omit<Source, 'tracks' | 'number'>;

export interface Dub {
	source: Source;
	track: Track;
}

export interface TabState {
	page: string | null;
	sources: Source[];
	variants: string[];
	ears: Partial<Record<Ear, DubRef>>;
	playing: DubRef | null;
	playerFrameId: number | null;
}

export const EMPTY_TAB_STATE: TabState = { page: null, sources: [], variants: [], ears: {}, playing: null, playerFrameId: null };

export function sameDub(a: DubRef | null | undefined, b: DubRef | null | undefined): boolean {
	return Boolean(a && b && a.sourceUrl === b.sourceUrl && a.trackId === b.trackId);
}

export function findDub(sources: Source[], ref: DubRef | null | undefined): Dub | undefined {
	const source = sources.find(({ url }) => url === ref?.sourceUrl);
	const track = source?.tracks.find(({ id }) => id === ref?.trackId);
	return source && track ? { source, track } : undefined;
}

const dubOf = (source: Source, track: Track): DubRef => ({ sourceUrl: source.url, trackId: track.id });

const earDubs = (state: TabState) => [state.ears.left, state.ears.right].filter(ear => ear !== undefined);

const earSources = (state: TabState) => new Set(earDubs(state).map(ear => ear.sourceUrl));

const isRunning = (state: TabState) => state.playerFrameId !== null;

function keepRecent(state: TabState, sources: Source[]): Source[] {
	const assigned = earSources(state);
	return sources.filter((source, index) => index >= sources.length - SOURCES_LIMIT || assigned.has(source.url));
}

const nextNumber = (state: TabState) => Math.max(0, ...state.sources.map(({ number }) => number)) + 1;

function play(state: TabState, dub: DubRef): TabState {
	const fromHiddenPlayer = isRunning(state) && earDubs(state).some(ear => sameDub(ear, dub));
	if (fromHiddenPlayer || sameDub(state.playing, dub))
		return state;

	return { ...state, playing: dub };
}

function pageOf(url: string) {
	const { origin, pathname } = new URL(url);
	return origin + pathname;
}

export function navigate(state: TabState, url: string): TabState {
	const page = pageOf(url);
	if (state.page !== null && state.page !== page)
		return { ...EMPTY_TAB_STATE, page };

	return { ...state, page };
}

export function loadPage(state: TabState, url: string): TabState {
	const next = navigate(state, url);
	const assigned = earSources(next);
	return { ...EMPTY_TAB_STATE, page: next.page, ears: next.ears, sources: next.sources.filter(source => assigned.has(source.url)) };
}

export function recordSource(state: TabState, captured: CapturedSource): TabState {
	const fromHiddenPlayer = isRunning(state) && earSources(state).has(captured.url);
	if (fromHiddenPlayer || state.variants.includes(captured.url))
		return state;

	const known = state.sources.find(({ url }) => url === captured.url);
	const source: Source = { ...captured, tracks: known?.tracks ?? [MAIN_TRACK], number: known?.number ?? nextNumber(state) };
	const sources = [...state.sources.filter(({ url }) => url !== captured.url), source];
	const next = { ...state, sources: keepRecent(state, sources) };
	const [only] = source.tracks;
	return only && source.tracks.length === 1 ? play(next, dubOf(source, only)) : next;
}

export function recordManifest(state: TabState, url: string, { tracks, variants }: ParsedManifest): TabState {
	const assigned = earSources(state);
	const replaced = (source: Source) => source.url !== url && source.tracks.length > 1 && tracks.length > 1;
	const sources = state.sources
		.filter(source => (!variants.includes(source.url) || assigned.has(source.url)) && !replaced(source))
		.map(source => source.url === url ? { ...source, tracks } : source);
	const kept = (ear: DubRef | undefined) => sources.some(source => source.url === ear?.sourceUrl) ? ear : undefined;
	const next = {
		...state,
		sources,
		ears: { left: kept(state.ears.left), right: kept(state.ears.right) },
		variants: [...new Set([...state.variants, ...variants])].slice(-VARIANTS_LIMIT),
	};
	if (!state.playing || findDub(sources, state.playing))
		return next;

	const source = sources.find(candidate => candidate.url === url);
	const [only] = tracks;
	return { ...next, playing: source && only && tracks.length === 1 ? dubOf(source, only) : null };
}

export function recordSegment(state: TabState, url: string): TabState {
	for (const source of state.sources) {
		const track = matchSegment(source.tracks, url);
		if (track)
			return play(state, dubOf(source, track));
	}
	return state;
}

export function assignEar(state: TabState, ear: Ear, dub: DubRef): TabState {
	if (!findDub(state.sources, dub))
		return state;

	return { ...state, ears: { ...state.ears, [ear]: dub } };
}

export function playerFrame(state: TabState): number | undefined {
	return state.sources.at(-1)?.frameId;
}

export function swapEars(state: TabState): TabState {
	return { ...state, ears: { left: state.ears.right, right: state.ears.left } };
}
