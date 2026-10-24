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
	let unwatch: (() => void) | undefined;

	async function load() {
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
		if (!await browser.permissions.contains(ALL_SITES)) {
			access.value = 'no-permission';
			return;
		}
		if (tab?.id === undefined || !tab.url?.startsWith('http')) {
			access.value = 'unsupported';
			return;
		}

		const id = tab.id;
		tabId.value = id;
		await browser.runtime.sendMessage({ type: 'refresh', tabId: id } satisfies RuntimeRequest);
		state.value = await readTabState(id);
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

	void load();
	onScopeDispose(() => unwatch?.());

	return { tabId, state, access, grantPermission, send };
}
