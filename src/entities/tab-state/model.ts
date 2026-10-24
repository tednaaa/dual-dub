import type { Ear, StreamSource } from '@/shared/api';

const STREAMS_LIMIT = 20;
const VARIANTS_LIMIT = 200;

export interface CapturedStream extends StreamSource {
	frameId: number;
}

export interface TabState {
	page: string | null;
	streams: CapturedStream[];
	variants: string[];
	ears: Partial<Record<Ear, CapturedStream>>;
	playerFrameId: number | null;
}

export const EMPTY_TAB_STATE: TabState = { page: null, streams: [], variants: [], ears: {}, playerFrameId: null };

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
	const { page, ears } = navigate(state, url);
	return { ...EMPTY_TAB_STATE, page, ears };
}

export function recordStream(state: TabState, stream: CapturedStream): TabState {
	const assigned = Object.values(state.ears).some(ear => ear.url === stream.url);
	if (assigned || state.variants.includes(stream.url))
		return state;

	const streams = [...state.streams.filter(captured => captured.url !== stream.url), stream];
	return { ...state, streams: streams.slice(-STREAMS_LIMIT) };
}

export function recordVariants(state: TabState, variants: string[]): TabState {
	return {
		...state,
		streams: state.streams.filter(captured => !variants.includes(captured.url)),
		variants: [...new Set([...state.variants, ...variants])].slice(-VARIANTS_LIMIT),
	};
}

export function assignEar(state: TabState, ear: Ear): TabState {
	const latest = state.streams.at(-1);
	if (!latest)
		return state;

	return { ...state, ears: { ...state.ears, [ear]: latest } };
}

export function playerFrame(state: TabState): number | undefined {
	return state.streams.at(-1)?.frameId ?? state.ears.left?.frameId ?? state.ears.right?.frameId;
}

export function swapEars(state: TabState): TabState {
	return { ...state, ears: { left: state.ears.right, right: state.ears.left } };
}
