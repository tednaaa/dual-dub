export type DriftCorrection = { seek: number } | { rate: number };

const SEEK_THRESHOLD = 1;
const IN_SYNC_THRESHOLD = 0.05;
const NUDGE_PER_SECOND = 0.3;
const MAX_NUDGE = 0.03;

export function driftCorrection(masterTime: number, slaveTime: number, masterRate: number): DriftCorrection {
	const drift = masterTime - slaveTime;
	if (Math.abs(drift) > SEEK_THRESHOLD)
		return { seek: masterTime };
	if (Math.abs(drift) < IN_SYNC_THRESHOLD)
		return { rate: masterRate };

	const nudge = Math.min(MAX_NUDGE, Math.max(-MAX_NUDGE, drift * NUDGE_PER_SECOND));
	return { rate: masterRate * (1 + nudge) };
}
