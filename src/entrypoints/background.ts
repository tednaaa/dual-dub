import type { BackgroundRequest, Ear, PlayerCommand, PlayerStatus, StartResult, StreamSource } from '@/shared/api';

async function allowCors(tabId: number, frameUrl: string) {
	const { origin, hostname } = new URL(frameUrl);
	await browser.declarativeNetRequest.updateSessionRules({
		removeRuleIds: [tabId],
		addRules: [{
			id: tabId,
			condition: {
				tabIds: [tabId],
				initiatorDomains: [hostname],
				resourceTypes: ['media', 'xmlhttprequest'],
			},
			action: {
				type: 'modifyHeaders',
				responseHeaders: [{ header: 'Access-Control-Allow-Origin', operation: 'set', value: origin }],
			},
		}],
	});
}

async function revokeCors(tabId: number) {
	await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
}

async function ensurePlayer(tabId: number, frameId: number) {
	const alive = await browser.tabs.sendMessage(tabId, { type: 'ping' } satisfies PlayerCommand, { frameId }).catch(() => false);
	if (alive)
		return;

	await browser.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ['/content-scripts/player.js'] });
}

async function activeTabId() {
	const [tab] = await browser.tabs.query({ active: true, windowType: 'normal' });
	if (tab?.id === undefined)
		throw new Error('No active tab');

	return tab.id;
}

async function findPlayerFrame(tabId: number) {
	const frames = await browser.scripting.executeScript({
		target: { tabId, allFrames: true },
		func: () => Math.max(0, ...Array.from(document.querySelectorAll('video'), video => video.clientWidth * video.clientHeight)),
	});
	const [largest] = frames
		.map(frame => ({ frameId: frame.frameId, area: Number(frame.result) || 0 }))
		.filter(frame => frame.area > 0)
		.sort((a, b) => b.area - a.area);
	if (!largest)
		throw new Error('No video on this page');

	return largest.frameId;
}

function debugSource(url: string): StreamSource {
	return { url, kind: url.includes('.m3u8') ? 'hls' : 'mp4' };
}

let debugTarget = { tabId: 0, frameId: 0 };

const debug = {
	async start(left: string, right: string): Promise<StartResult> {
		const tabId = await activeTabId();
		const frameId = await findPlayerFrame(tabId);
		debugTarget = { tabId, frameId };
		await ensurePlayer(tabId, frameId);
		const command: PlayerCommand = { type: 'start', streams: { left: debugSource(left), right: debugSource(right) } };
		return browser.tabs.sendMessage(tabId, command, { frameId });
	},
	async stop() {
		await browser.tabs.sendMessage(debugTarget.tabId, { type: 'stop' } satisfies PlayerCommand, { frameId: debugTarget.frameId });
	},
	async volume(ear: Ear, value: number) {
		await browser.tabs.sendMessage(debugTarget.tabId, { type: 'volume', ear, value } satisfies PlayerCommand, { frameId: debugTarget.frameId });
	},
	async status(): Promise<PlayerStatus> {
		return browser.tabs.sendMessage(debugTarget.tabId, { type: 'status' } satisfies PlayerCommand, { frameId: debugTarget.frameId });
	},
};

export default defineBackground(() => {
	browser.runtime.onMessage.addListener((message: BackgroundRequest, sender, sendResponse) => {
		const tabId = sender.tab?.id;
		if (tabId === undefined || !sender.url)
			return;

		const task = message.type === 'allow-cors' ? allowCors(tabId, sender.url) : revokeCors(tabId);
		void task.then(() => sendResponse(true));
		return true;
	});

	// TODO: drop once the popup assigns ears
	Object.assign(globalThis, { dualDub: debug });
});
