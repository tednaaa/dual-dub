<script setup lang="ts">
import { HeadphonesIcon } from '@lucide/vue';
import { Button, Kbd, KbdGroup } from 'shonk-ui';
import { computed } from 'vue';
import { t } from '@/shared/lib';
import { useEarTest } from './use-ear-test';
import { useShortcut } from './use-shortcut';

const { testing, run } = useEarTest();
const toggleKeys = useShortcut('toggle-dual-dub');

const testLabel = computed(() => {
	if (testing.value === 'left')
		return t('testingLeft');
	if (testing.value === 'right')
		return t('testingRight');
	return t('testHeadphones');
});
</script>

<template>
	<footer class="flex items-center justify-between gap-2">
		<Button variant="ghost" size="sm" :aria-busy="testing !== null" @click="run">
			<HeadphonesIcon />
			<span aria-live="polite">{{ testLabel }}</span>
		</Button>

		<span v-if="toggleKeys.length" class="flex items-center gap-1.5 text-xs text-muted-foreground">
			<KbdGroup>
				<Kbd v-for="key in toggleKeys" :key="key">{{ key }}</Kbd>
			</KbdGroup>
			{{ t('shortcutToggle') }}
		</span>
	</footer>
</template>
