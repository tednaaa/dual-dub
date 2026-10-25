import type { Browser } from 'wxt/browser';
import type { CapturedSource, Dub, TabState } from '@/entities/tab-state';
import type { DubStream, PlayerCommand, PlayerPing, RuntimeRequest, StartResult } from '@/shared/api';
import type { Format, ParsedManifest, StreamKind } from '@/shared/lib';
import { onboarded } from '@/entities/preferences';
import { assignEar, clearTabState, findDub, loadPage, navigate, playerFrame, readTabState, recordManifest, recordSegment, recordSource, swapEars, updateTabState } from '@/entities/tab-state';
import { detectKind, FORMATS } from '@/shared/lib';

const BADGE_TEXT = 'L·R';
const BADGE_COLOR = '#8c5a3c';

interface FirefoxSidebar {
	sidebarAction: { toggle: () => Promise<void> };
}

const tabStates = new Map<number, TabState>();
const fetchedManifests = new Map<number, Set<string>>();

async function changeTabState(tabId: number, change: (state: TabState) => TabState) {
	const state = await updateTabState(tabId, change);
	tabStates.set(tabId, state);
	return state;
}

async function cachedTabState(tabId: number) {
	const state = tabStates.get(tabId) ?? await readTabState(tabId);
	if (!tabStates.has(tabId))
		tabStates.set(tabId, state);
	return state;
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

function claimManifest(tabId: number, url: string) {
	const fetched = fetchedManifests.get(tabId) ?? new Set<string>();
	fetchedManifests.set(tabId, fetched);
	if (fetched.has(url))
		return false;

	fetched.add(url);
	return true;
}

async function fetchInFrame(tabId: number, frameId: number, url: string): Promise<string | null> {
	const [injection] = await browser.scripting.executeScript({
		target: { tabId, frameIds: [frameId] },
		func: async (manifestUrl: string) => {
			const response = await fetch(manifestUrl).catch(() => undefined);
			return response?.ok ? response.text() : null;
		},
		args: [url],
	}).catch(() => []);
	return injection?.result ?? null;
}

function parseManifest({ parse }: Format, manifest: string, url: string): ParsedManifest | null {
	try {
		return parse?.(manifest, url) ?? null;
	}
	catch {
		return null;
	}
}

async function captureManifest(tabId: number, frameId: number, url: string, kind: StreamKind) {
	const format = FORMATS[kind];
	const manifest = format.parse && claimManifest(tabId, url) ? await fetchInFrame(tabId, frameId, url) : null;
	const parsed = manifest === null ? null : parseManifest(format, manifest, url);
	if (parsed)
		await changeTabState(tabId, state => recordManifest(state, url, parsed));
}

async function captureSource(tabId: number, captured: CapturedSource) {
	const state = await changeTabState(tabId, current => recordSource(current, captured));
	if (state.sources.some(({ url }) => url === captured.url))
		await captureManifest(tabId, captured.frameId, captured.url, captured.kind);
}

async function captureSegment(tabId: number, url: string) {
	const state = await cachedTabState(tabId);
	if (recordSegment(state, url) !== state)
		await changeTabState(tabId, current => recordSegment(current, url));
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
	await changeTabState(tabId, state => ({ ...state, playerFrameId }));
	await browser.action.setBadgeText({ tabId, text: playerFrameId === null ? '' : BADGE_TEXT });
}

async function stopDualDub(tabId: number) {
	const { playerFrameId } = await readTabState(tabId);
	if (playerFrameId !== null)
		await browser.tabs.sendMessage(tabId, { type: 'stop' } satisfies PlayerCommand, { frameId: playerFrameId }).catch(() => undefined);

	await setRunning(tabId, null);
}

function dubStream({ source, track }: Dub): DubStream {
	return { url: source.url, kind: source.kind, track };
}

async function startDualDub(tabId: number): Promise<StartResult> {
	const state = await readTabState(tabId);
	const left = findDub(state.sources, state.ears.left);
	const right = findDub(state.sources, state.ears.right);
	const frameId = playerFrame(state);
	if (!left || !right || frameId === undefined)
		return { ok: false, issue: 'no-ears' };

	if (state.playerFrameId !== null && state.playerFrameId !== frameId)
		await stopDualDub(tabId);

	const result = await ensurePlayer(tabId, frameId)
		.then(() => browser.tabs.sendMessage(tabId, { type: 'start', dubs: { left: dubStream(left), right: dubStream(right) } } satisfies PlayerCommand, { frameId }))
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
	const state = await changeTabState(tabId, update);
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
			return changeEars(message.tabId, state => assignEar(state, message.ear, message.dub));
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

	browser.webRequest.onHeadersReceived.addListener(({ tabId, frameId, url, type, responseHeaders }) => {
		if (tabId < 0)
			return;

		const contentType = responseHeaders?.find(({ name }) => name.toLowerCase() === 'content-type')?.value ?? '';
		const kind = detectKind({ url, type, contentType });
		if (kind)
			void captureSource(tabId, { url, kind, frameId });
		else
			void captureSegment(tabId, url);
	}, { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest'] }, ['responseHeaders']);

	browser.webRequest.onBeforeRequest.addListener(({ tabId, url }) => {
		if (tabId < 0)
			return;

		fetchedManifests.delete(tabId);
		void changeTabState(tabId, state => loadPage(state, url));
	}, { urls: ['<all_urls>'], types: ['main_frame'] });

	browser.tabs.onUpdated.addListener((tabId, { url }) => {
		if (!url)
			return;

		void changeTabState(tabId, state => navigate(state, url)).then(({ sources }) => {
			if (sources.length === 0)
				fetchedManifests.delete(tabId);
		});
	});

	browser.tabs.onRemoved.addListener((tabId) => {
		tabStates.delete(tabId);
		fetchedManifests.delete(tabId);
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
