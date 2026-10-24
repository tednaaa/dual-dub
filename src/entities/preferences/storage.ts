import type { Ear } from '@/shared/api';

export interface EarSettings {
	volume: number;
	muted: boolean;
}

export const earSettings = storage.defineItem<Record<Ear, EarSettings>>('local:ear-settings', {
	fallback: { left: { volume: 1, muted: false }, right: { volume: 1, muted: false } },
});

export const onboarded = storage.defineItem<boolean>('local:onboarded', { fallback: false });

export const earGain = ({ volume, muted }: EarSettings) => muted ? 0 : volume;
