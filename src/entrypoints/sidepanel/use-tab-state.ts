import type { Browser } from 'wxt/browser';
import type { TabState } from '@/entities/tab-state';
import type { RuntimeRequest } from '@/shared/api';
import { onScopeDispose, ref, shallowRef } from 'vue';
import { EMPTY_TAB_STATE, readTabState, watchTabState } from '@/entities/tab-state';

const ALL_SITES = { origins: ['<all_urls>'] };

export type PageAccess = 'loading' | 'unsupported' | 'no-permission' | 'ready';

export function useTabState() {
	const tabId = ref<number>();
	const state = shallowRef<TabState>(EMPTY_TAB_STATE);
	const access = ref<PageAccess>('loading');
	let windowId: number | undefined;
	let loads = 0;
	let unwatch: (() => void) | undefined;

	function show(next: PageAccess) {
		tabId.value = undefined;
		state.value = EMPTY_TAB_STATE;
		access.value = next;
	}

	async function load() {
		const attempt = ++loads;
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
		const granted = await browser.permissions.contains(ALL_SITES);
		if (attempt !== loads)
			return;

		unwatch?.();
		unwatch = undefined;
		windowId = tab?.windowId;
		if (!granted) {
			show('no-permission');
			return;
		}
		if (tab?.id === undefined || !tab.url?.startsWith('http')) {
			show('unsupported');
			return;
		}

		const id = tab.id;
		await browser.runtime.sendMessage({ type: 'refresh', tabId: id } satisfies RuntimeRequest);
		const current = await readTabState(id);
		if (attempt !== loads)
			return;

		tabId.value = id;
		state.value = current;
		unwatch = watchTabState(id, (next) => {
			state.value = next;
		});
		access.value = 'ready';
	}

	async function grantPermission() {
		if (await browser.permissions.request(ALL_SITES))
			await load();
	}

	function send<T>(request: RuntimeRequest): Promise<T> {
		return browser.runtime.sendMessage(request);
	}

	function onActivated(info: Browser.tabs.OnActivatedInfo) {
		if (info.windowId === windowId)
			void load();
	}

	function onUpdated(_id: number, { url }: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab) {
		if (url && tab.active && tab.windowId === windowId)
			void load();
	}

	browser.tabs.onActivated.addListener(onActivated);
	browser.tabs.onUpdated.addListener(onUpdated);
	void load();
	onScopeDispose(() => {
		unwatch?.();
		browser.tabs.onActivated.removeListener(onActivated);
		browser.tabs.onUpdated.removeListener(onUpdated);
	});

	return { tabId, state, access, grantPermission, send };
}
