const area = (video: HTMLVideoElement) => video.clientWidth * video.clientHeight;

export function findMasterVideo(root: ParentNode = document): HTMLVideoElement | null {
	const videos = Array.from(root.querySelectorAll('video'));
	return videos.sort((a, b) => area(b) - area(a))[0] ?? null;
}
