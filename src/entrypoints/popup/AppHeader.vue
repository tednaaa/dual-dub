<script setup lang="ts">
import { HeadphonesIcon } from '@lucide/vue';
import { Switch } from 'shonk-ui';
import { t } from '@/shared/lib';

defineProps<{
	running: boolean;
	canEnable: boolean;
}>();

const emit = defineEmits<{
	toggle: [on: boolean];
}>();
</script>

<template>
	<header class="flex items-center gap-3">
		<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
			<HeadphonesIcon class="size-5" />
		</span>

		<div class="min-w-0 flex-1">
			<h1 class="text-base leading-tight font-semibold">Dual Dub</h1>
			<p class="text-xs text-muted-foreground">{{ running ? t('statusOn') : t('statusOff') }}</p>
		</div>

		<Switch
			:model-value="running"
			:disabled="!canEnable && !running"
			:aria-label="t('enable')"
			@update:model-value="emit('toggle', $event)"
		/>
	</header>
</template>
