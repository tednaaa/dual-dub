import { describe, expect, it } from 'vitest';
import { parseDash } from './dash';
import { MAIN_TRACK } from './track';

const manifestUrl = 'https://manifest.example/khw4RhAaYa';

function audioSet(id: number, lang: string) {
	return `
	<AdaptationSet id="${id}" lang="${lang}" contentType="audio">
		<Representation id="${id}" mimeType="audio/webm" codecs="opus">
			<SegmentTemplate initialization="4.1-2ch-${id}/init.webm?t=1" media="4.1-2ch-${id}/$Number$.webm?t=1" />
		</Representation>
	</AdaptationSet>`;
}

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static">
	<BaseURL>https://a.example/6BU4BG46/</BaseURL>
	<BaseURL>https://b.example/6BU4BG46/</BaseURL>
	<Period id="0">
		${audioSet(0, 'rus0')}
		${audioSet(1, 'eng1')}
		<AdaptationSet id="7" contentType="video">
			<Representation id="20" mimeType="video/webm" width="864" height="486">
				<SegmentTemplate media="20.1/$Number$.webm?t=1" />
			</Representation>
			<Representation id="21" mimeType="video/webm" width="1280" height="720">
				<SegmentTemplate media="21.1/$Number$.webm?t=1" />
			</Representation>
		</AdaptationSet>
	</Period>
</MPD>`;

describe('parseDash', () => {
	it('turns audio adaptation sets into tracks with a segment prefix per base url', () => {
		expect(parseDash(manifest, manifestUrl).tracks).toEqual([
			{
				id: '0',
				lang: 'rus0',
				label: null,
				representationIds: ['0'],
				segmentPrefixes: ['https://a.example/6BU4BG46/4.1-2ch-0/', 'https://b.example/6BU4BG46/4.1-2ch-0/'],
			},
			{
				id: '1',
				lang: 'eng1',
				label: null,
				representationIds: ['1'],
				segmentPrefixes: ['https://a.example/6BU4BG46/4.1-2ch-1/', 'https://b.example/6BU4BG46/4.1-2ch-1/'],
			},
		]);
	});

	it('drops a segment prefix that other adaptation sets share', () => {
		const shared = `<MPD><Period>
			<SegmentTemplate media="seg-$Number$.m4s" />
			<AdaptationSet id="0" lang="ru"><Representation id="a" mimeType="audio/mp4" /></AdaptationSet>
			<AdaptationSet id="1" lang="en"><Representation id="v" mimeType="video/mp4" /></AdaptationSet>
			<AdaptationSet id="2" lang="uk"><Representation id="b" mimeType="audio/mp4" /></AdaptationSet>
		</Period></MPD>`;

		expect(parseDash(shared, 'https://cdn.example/x/manifest.mpd').tracks.map(track => track.segmentPrefixes)).toEqual([[], []]);
	});

	it('falls back to the main track when no adaptation set is audio', () => {
		const muxed = '<MPD><Period><AdaptationSet id="0"><Representation id="0" mimeType="video/mp4" /></AdaptationSet></Period></MPD>';

		expect(parseDash(muxed, manifestUrl).tracks).toEqual([MAIN_TRACK]);
	});
});
