import type { Dub } from '@/entities/tab-state';
import { t } from '@/shared/lib';

const LANGUAGE_CODE = /^[a-z]{2,3}/i;

const languageNames = new Intl.DisplayNames([browser.i18n.getUILanguage()], { type: 'language', fallback: 'none' });

function languageName(lang: string | null) {
	const code = lang?.match(LANGUAGE_CODE)?.[0];
	return code ? languageNames.of(code) : undefined;
}

export function dubLabel({ source, track }: Dub): string {
	if (source.tracks.length === 1) {
		const { hostname, pathname } = new URL(source.url);
		return `${hostname} · ${pathname.split('/').at(-1)}`;
	}

	const name = track.label ?? t('dubNumber', String(source.tracks.indexOf(track) + 1));
	const language = languageName(track.lang);
	return language ? `${name} · ${language}` : name;
}
