export type StreamKind = 'hls' | 'dash' | 'mp4';

export interface Track {
	id: string;
	lang: string | null;
	label: string | null;
	segmentPrefixes: string[];
	representationIds: string[];
}

export interface StreamRequest {
	url: string;
	type: string;
	contentType: string;
}

export interface ParsedManifest {
	tracks: Track[];
	variants: string[];
}

export interface Format {
	detect: (request: StreamRequest) => boolean;
	parse: ((manifest: string, url: string) => ParsedManifest) | null;
}
