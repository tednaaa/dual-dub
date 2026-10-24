<script setup lang="ts">
import type { EarSettings } from '@/entities/preferences';
import type { CapturedStream } from '@/entities/tab-state';
import type { Ear } from '@/shared/api';
import { AudioLinesIcon, Volume2Icon, VolumeXIcon } from '@lucide/vue';
import { Button, Card, Slider } from 'shonk-ui';
import { computed } from 'vue';
import { t } from '@/shared/lib';

const props = defineProps<{
	ear: Ear;
	stream: CapturedStream | undefined;
	level: number | null;
	canTake: boolean;
}>();

const emit = defineEmits<{
	take: [];
}>();

const settings = defineModel<EarSettings>('settings', { required: true });

const label = computed(() => t(props.ear === 'left' ? 'earLeft' : 'earRight'));

const streamLabel = computed(() => {
	if (!props.stream)
		return t('notAssigned');

	const { hostname, pathname } = new URL(props.stream.url);
	return `${hostname} · ${pathname.split('/').at(-1)}`;
});

const meterWidth = computed(() => `${Math.min(1, Math.sqrt(props.level ?? 0)) * 100}%`);

const volume = computed({
	get: () => [Math.round(settings.value.volume * 100)],
	set: ([value = 100]) => {
		settings.value = { ...settings.value, volume: value / 100 };
	},
});

const muted = computed({
	get: () => settings.value.muted,
	set: (value: boolean) => {
		settings.value = { ...settings.value, muted: value };
	},
});
</script>

<template>
	<Card class="gap-3 p-4">
		<div class="flex items-center gap-3">
			<span
				class="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
				:class="stream ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
				aria-hidden="true"
			>
				{{ ear === 'left' ? 'L' : 'R' }}
			</span>

			<div class="min-w-0 flex-1">
				<h2 class="text-sm font-semibold">{{ label }}</h2>
				<p class="truncate text-xs text-muted-foreground" :title="stream?.url">{{ streamLabel }}</p>
			</div>

			<Button v-model:pressed="muted" variant="ghost" size="icon-sm" :aria-label="t('mute', label)">
				<VolumeXIcon v-if="muted" />
				<Volume2Icon v-else />
			</Button>
		</div>

		<div
			role="meter"
			:aria-label="t('level', label)"
			aria-valuemin="0"
			aria-valuemax="1"
			:aria-valuenow="level ?? 0"
			class="h-1.5 overflow-hidden rounded-full bg-muted"
		>
			<div class="h-full rounded-full bg-primary transition-[width] duration-75 ease-out motion-reduce:transition-none" :style="{ width: meterWidth }" />
		</div>

		<div role="group" :aria-label="t('volume', label)">
			<Slider v-model="volume" :max="100" :step="1" :disabled="muted" />
		</div>

		<Button variant="secondary" size="sm" class="w-full" :disabled="!canTake" @click="emit('take')">
			<AudioLinesIcon />
			{{ t('takeCurrent') }}
		</Button>
	</Card>
</template>
