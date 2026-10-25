import type { Ear } from '@/shared/api';
import type { Track } from '@/shared/lib';

export interface RememberedTrack {
	lang: string | null;
	index: number;
}

export interface SiteDubs {
	ears: Partial<Record<Ear, RememberedTrack>>;
	autoStart: boolean;
}

export const siteDubs = storage.defineItem<Record<string, SiteDubs>>('local:site-dubs', { fallback: {} });

export function rememberTrack(tracks: Track[], trackId: string): RememberedTrack | undefined {
	const index = tracks.findIndex(({ id }) => id === trackId);
	const track = tracks[index];
	return track && { lang: track.lang, index };
}

export function recallTrack(tracks: Track[], { lang, index }: RememberedTrack): Track | undefined {
	const sameLang = lang === null ? [] : tracks.filter(track => track.lang === lang);
	const atIndex = tracks[index];
	if (atIndex && sameLang.includes(atIndex))
		return atIndex;

	return sameLang[0] ?? atIndex;
}
