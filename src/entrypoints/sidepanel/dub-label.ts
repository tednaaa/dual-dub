import type { NumberedDub } from './dub-groups';
import { t } from '@/shared/lib';

const LANGUAGE_CODE = /^[a-z]{2,3}/i;

const languageNames = new Intl.DisplayNames([browser.i18n.getUILanguage()], { type: 'language', fallback: 'none' });

function languageName(lang: string | null) {
	const code = lang?.match(LANGUAGE_CODE)?.[0];
	return code ? languageNames.of(code) : undefined;
}

export function trackName({ dub: { track }, number }: NumberedDub): string {
	const name = track.label ?? t('dubNumber', String(number));
	const language = languageName(track.lang);
	return language ? `${name} · ${language}` : name;
}
