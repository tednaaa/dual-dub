import type { WxtStorageItem } from 'wxt/utils/storage';
import { computed, onScopeDispose, shallowRef } from 'vue';

export function useStorageItem<T, TMetadata extends Record<string, unknown>>(item: WxtStorageItem<T, TMetadata>) {
	const value = shallowRef<T>(item.fallback);
	void item.getValue().then((stored) => {
		value.value = stored;
	});
	onScopeDispose(item.watch((next) => {
		value.value = next;
	}));

	return computed({
		get: () => value.value,
		set: (next) => {
			value.value = next;
			void item.setValue(next);
		},
	});
}
