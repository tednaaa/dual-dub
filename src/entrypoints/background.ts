import type { TabState } from '@/entities/tab-state';
import type { BackgroundRequest, Ear, PlayerCommand, PlayerStatus, StartResult } from '@/shared/api';
import { assignEar, clearTabState, loadPage, navigate, playerFrame, readTabState, recordStream, recordVariants, updateTabState } from '@/entities/tab-state';
import { parseVariants, streamKind } from '@/shared/lib';

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

async function captureVariants(tabId: number, manifestUrl: string) {
	const response = await fetch(manifestUrl, { credentials: 'include' }).catch(() => undefined);
	if (!response?.ok)
		return;

	const variants = parseVariants(await response.text(), manifestUrl);
	if (variants.length > 0)
		await updateTabState(tabId, state => recordVariants(state, variants));
}

async function ensurePlayer(tabId: number, frameId: number) {
	const alive = await browser.tabs.sendMessage(tabId, { type: 'ping' } satisfies PlayerCommand, { frameId }).catch(() => false);
	if (alive)
		return;

	await browser.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ['/content-scripts/player.js'] });
}

async function startDualDub(tabId: number): Promise<StartResult> {
	const state = await readTabState(tabId);
	const { left, right } = state.ears;
	const frameId = playerFrame(state);
	if (!left || !right || frameId === undefined)
		return { ok: false, error: 'Assign both ears first' };

	await ensurePlayer(tabId, frameId);
	await updateTabState(tabId, current => ({ ...current, playerFrameId: frameId }));
	return browser.tabs.sendMessage(tabId, { type: 'start', streams: { left, right } } satisfies PlayerCommand, { frameId });
}

async function sendToPlayer<T>(tabId: number, command: PlayerCommand): Promise<T> {
	const { playerFrameId } = await readTabState(tabId);
	if (playerFrameId === null)
		throw new Error('Dual dub has not started in this tab');

	return browser.tabs.sendMessage(tabId, command, { frameId: playerFrameId });
}

async function activeTabId() {
	const [tab] = await browser.tabs.query({ active: true, windowType: 'normal' });
	if (tab?.id === undefined)
		throw new Error('No active tab');

	return tab.id;
}

async function assignActiveEar(ear: Ear) {
	const state = await updateTabState(await activeTabId(), current => assignEar(current, ear));
	return state.ears[ear]?.url;
}

const debug = {
	state: async (): Promise<TabState> => readTabState(await activeTabId()),
	left: () => assignActiveEar('left'),
	right: () => assignActiveEar('right'),
	start: async () => startDualDub(await activeTabId()),
	stop: async () => sendToPlayer<void>(await activeTabId(), { type: 'stop' }),
	volume: async (ear: Ear, value: number) => sendToPlayer<void>(await activeTabId(), { type: 'volume', ear, value }),
	status: async () => sendToPlayer<PlayerStatus>(await activeTabId(), { type: 'status' }),
};

export default defineBackground(() => {
	browser.webRequest.onBeforeRequest.addListener((details) => {
		const kind = details.tabId < 0 ? null : streamKind(details.url, details.type);
		if (!kind)
			return;

		const { tabId, frameId, url } = details;
		void updateTabState(tabId, state => recordStream(state, { url, kind, frameId }));
		if (kind === 'hls')
			void captureVariants(tabId, url);
	}, { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest'] });

	browser.webRequest.onBeforeRequest.addListener(({ tabId, url }) => {
		if (tabId >= 0)
			void updateTabState(tabId, state => loadPage(state, url));
	}, { urls: ['<all_urls>'], types: ['main_frame'] });

	browser.tabs.onUpdated.addListener((tabId, { url }) => {
		if (url)
			void updateTabState(tabId, state => navigate(state, url));
	});

	browser.tabs.onRemoved.addListener((tabId) => {
		void clearTabState(tabId);
		void revokeCors(tabId);
	});

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
