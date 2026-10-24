import { describe, expect, it } from 'vitest';
import { driftCorrection } from './drift';

describe('driftCorrection', () => {
	it('seeks to the master when the drift is beyond a second', () => {
		expect(driftCorrection(42, 40.5, 1)).toEqual({ seek: 42 });
	});

	it('speeds up a lagging player, capped at 3%', () => {
		expect(driftCorrection(42, 41.5, 1)).toEqual({ rate: 1.03 });
	});

	it('slows down a leading player in proportion to the drift', () => {
		const correction = driftCorrection(42, 42.06, 1);

		expect('rate' in correction && correction.rate).toBeCloseTo(0.982);
	});

	it('follows the master rate once in sync', () => {
		expect(driftCorrection(42, 42.02, 1.5)).toEqual({ rate: 1.5 });
	});
});
