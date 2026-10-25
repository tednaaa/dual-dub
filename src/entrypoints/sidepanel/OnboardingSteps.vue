<script setup lang="ts">
import { CheckIcon } from '@lucide/vue';
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperSeparator, StepperTitle } from 'shonk-ui';
import { computed } from 'vue';
import { ONBOARDING_STEPS } from '@/entities/tab-state';
import { t } from '@/shared/lib';

const props = defineProps<{
	step: number;
	singleDub: boolean;
}>();

const steps = computed(() => ONBOARDING_STEPS.map(step => ({
	step,
	title: t(`step${step}Title`),
	description: step === 3 && props.singleDub ? t('step3SwitchDescription') : t(`step${step}Description`),
})));

const current = computed(() => Math.min(props.step, ONBOARDING_STEPS.length));
</script>

<template>
	<Stepper :model-value="current" orientation="vertical" class="flex-col gap-0">
		<StepperItem
			v-for="item in steps"
			:key="item.step"
			:step="item.step"
			:completed="item.step < step"
			class="relative items-start gap-3 pb-4 last:pb-0"
		>
			<StepperIndicator class="size-7 shrink-0 bg-muted text-xs font-semibold">
				<CheckIcon v-if="item.step < step" class="size-4" />
				<span v-else>{{ item.step }}</span>
			</StepperIndicator>

			<div class="flex min-w-0 flex-col gap-0.5 pt-1">
				<StepperTitle class="whitespace-normal">{{ item.title }}</StepperTitle>
				<StepperDescription class="text-xs text-muted-foreground">{{ item.description }}</StepperDescription>
			</div>

			<StepperSeparator
				v-if="item.step < ONBOARDING_STEPS.length"
				class="absolute top-8 bottom-1 left-3.5 w-0.5 -translate-x-1/2 rounded-full"
			/>
		</StepperItem>
	</Stepper>
</template>
