const SILENT_LEVEL = 1e-4;
const SILENCE_ALERT_MS = 3000;

export function trackSilence(silentMs: number, level: number, playing: boolean, elapsedMs: number): number {
	if (!playing || level > SILENT_LEVEL)
		return 0;

	return silentMs + elapsedMs;
}

export const isSilent = (silentMs: number) => silentMs >= SILENCE_ALERT_MS;
