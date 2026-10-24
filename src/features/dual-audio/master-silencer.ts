const taps = new WeakMap<HTMLMediaElement, GainNode>();

function tapOf(master: HTMLMediaElement) {
	const known = taps.get(master);
	if (known)
		return known;

	const context = new AudioContext();
	const gain = new GainNode(context);
	context.createMediaElementSource(master).connect(gain).connect(context.destination);
	taps.set(master, gain);
	return gain;
}

function muteMaster(master: HTMLMediaElement) {
	const muted = master.muted;
	master.muted = true;
	return () => {
		master.muted = muted;
	};
}

export function silenceMaster(master: HTMLMediaElement): () => void {
	// NOTE: only MSE output is untainted; Web Audio would keep a cross-origin src silent after stop.
	if (!master.currentSrc.startsWith('blob:'))
		return muteMaster(master);

	const tap = tapOf(master);
	tap.gain.value = 0;
	return () => {
		tap.gain.value = 1;
		void (tap.context as AudioContext).resume();
	};
}
