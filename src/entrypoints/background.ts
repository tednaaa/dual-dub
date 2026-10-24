import type { Browser } from 'wxt/browser';
import type { TabState } from '@/entities/tab-state';
import type { PlayerCommand, PlayerPing, RuntimeRequest, StartResult } from '@/shared/api';
import { onboarded } from '@/entities/preferences';
import { assignEar, clearTabState, loadPage, navigate, playerFrame, readTabState, recordStream, recordVariants, swapEars, updateTabState } from '@/entities/tab-state';
import { parseVariants, streamKind } from '@/shared/lib';

const BADGE_TEXT = 'L·R';
const BADGE_COLOR = '#8c5a3c';

interface FirefoxSidebar {
	sidebarAction: { toggle: () => Promise<void> };
}

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

async function pingPlayer(tabId: number, frameId: number): Promise<PlayerPing | undefined> {
	return browser.tabs.sendMessage(tabId, { type: 'ping' } satisfies PlayerCommand, { frameId }).catch(() => undefined);
}

async function ensurePlayer(tabId: number, frameId: number) {
	if (await pingPlayer(tabId, frameId))
		return;

	await browser.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ['/content-scripts/player.js'] });
}

async function setRunning(tabId: number, playerFrameId: number | null) {
	await updateTabState(tabId, state => ({ ...state, playerFrameId }));
	await browser.action.setBadgeText({ tabId, text: playerFrameId === null ? '' : BADGE_TEXT });
}

async function stopDualDub(tabId: number) {
	const { playerFrameId } = await readTabState(tabId);
	if (playerFrameId !== null)
		await browser.tabs.sendMessage(tabId, { type: 'stop' } satisfies PlayerCommand, { frameId: playerFrameId }).catch(() => undefined);

	await setRunning(tabId, null);
}

async function startDualDub(tabId: number): Promise<StartResult> {
	const state = await readTabState(tabId);
	const { left, right } = state.ears;
	const frameId = playerFrame(state);
	if (!left || !right || frameId === undefined)
		return { ok: false, issue: 'no-ears' };

	if (state.playerFrameId !== null && state.playerFrameId !== frameId)
		await stopDualDub(tabId);

	const result = await ensurePlayer(tabId, frameId)
		.then(() => browser.tabs.sendMessage(tabId, { type: 'start', streams: { left, right } } satisfies PlayerCommand, { frameId }))
		.catch((): StartResult => ({ ok: false, issue: 'failed' }));
	if (!result.ok)
		return result;

	await setRunning(tabId, frameId);
	await onboarded.setValue(true);
	return result;
}

async function refreshRunning(tabId: number) {
	const { playerFrameId } = await readTabState(tabId);
	if (playerFrameId === null)
		return;

	const ping = await pingPlayer(tabId, playerFrameId);
	if (!ping?.running)
		await setRunning(tabId, null);
}

async function changeEars(tabId: number, update: (state: TabState) => TabState) {
	const state = await updateTabState(tabId, update);
	if (state.playerFrameId !== null)
		await startDualDub(tabId);
}

async function toggleDualDub(tabId: number) {
	await refreshRunning(tabId);
	const { playerFrameId } = await readTabState(tabId);
	if (playerFrameId === null)
		await startDualDub(tabId);
	else
		await stopDualDub(tabId);
}

function handleRequest(message: RuntimeRequest, sender: Browser.runtime.MessageSender): Promise<unknown> | undefined {
	const senderTabId = sender.tab?.id;
	switch (message.type) {
		case 'allow-cors':
			return senderTabId === undefined || !sender.url ? undefined : allowCors(senderTabId, sender.url);
		case 'revoke-cors':
			return senderTabId === undefined ? undefined : revokeCors(senderTabId);
		case 'assign':
			return changeEars(message.tabId, state => assignEar(state, message.ear));
		case 'swap':
			return changeEars(message.tabId, swapEars);
		case 'enable':
			return startDualDub(message.tabId);
		case 'disable':
			return stopDualDub(message.tabId);
		case 'refresh':
			return refreshRunning(message.tabId);
	}
}

function openPanelOnActionClick() {
	if (!import.meta.env.FIREFOX) {
		void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
		return;
	}

	const { sidebarAction } = browser as unknown as FirefoxSidebar;
	browser.action.onClicked.addListener(() => void sidebarAction.toggle());
}

async function activeTabId() {
	const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
	return tab?.id;
}

export default defineBackground(() => {
	void browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
	openPanelOnActionClick();

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

	browser.runtime.onMessage.addListener((message: RuntimeRequest, sender, sendResponse) => {
		const task = handleRequest(message, sender);
		if (!task)
			return;

		void task.then(sendResponse, () => sendResponse(undefined));
		return true;
	});

	browser.commands.onCommand.addListener((command) => {
		void activeTabId().then((tabId) => {
			if (tabId === undefined)
				return;
			if (command === 'toggle-dual-dub')
				return toggleDualDub(tabId);
			if (command === 'swap-ears')
				return changeEars(tabId, swapEars);
		});
	});
});
