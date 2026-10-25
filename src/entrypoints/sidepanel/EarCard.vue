<script setup lang="ts">
import type { EarSettings } from '@/entities/preferences';
import type { Source } from '@/entities/tab-state';
import type { DubRef, Ear } from '@/shared/api';
import { PipetteIcon, Volume2Icon, VolumeXIcon } from '@lucide/vue';
import { Button, Card, Slider, Tooltip } from 'shonk-ui';
import { computed } from 'vue';
import { sameDub } from '@/entities/tab-state';
import { t } from '@/shared/lib';
import DubSelect from './DubSelect.vue';

const props = defineProps<{
	ear: Ear;
	dub: DubRef | undefined;
	sources: Source[];
	playing: DubRef | null;
	level: number | null;
}>();

const emit = defineEmits<{
	assign: [dub: DubRef];
}>();

const settings = defineModel<EarSettings>('settings', { required: true });

const label = computed(() => t(props.ear === 'left' ? 'earLeft' : 'earRight'));

const meterWidth = computed(() => `${Math.min(1, Math.sqrt(props.level ?? 0)) * 100}%`);

const canTake = computed(() => props.playing !== null && !sameDub(props.playing, props.dub));

function assign(dub: DubRef | null | undefined) {
	if (dub)
		emit('assign', { sourceUrl: dub.sourceUrl, trackId: dub.trackId });
}

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
				:class="dub ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
				aria-hidden="true"
			>
				{{ ear === 'left' ? 'L' : 'R' }}
			</span>

			<h2 class="min-w-0 flex-1 text-sm font-semibold">{{ label }}</h2>

			<Button v-model:pressed="muted" variant="ghost" size="icon-sm" :aria-label="t('mute', label)">
				<VolumeXIcon v-if="muted" />
				<Volume2Icon v-else />
			</Button>
		</div>

		<div class="flex items-center gap-2">
			<div class="min-w-0 flex-1">
				<DubSelect
					:model-value="dub ?? null"
					:sources="sources"
					:playing="playing"
					:label="t('dubFor', label)"
					@update:model-value="assign"
				/>
			</div>

			<Tooltip :content="t('takePlaying')">
				<Button variant="secondary" size="icon-sm" :disabled="!canTake" :aria-label="t('takePlayingFor', label)" @click="assign(playing)">
					<PipetteIcon />
				</Button>
			</Tooltip>
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
	</Card>
</template>
