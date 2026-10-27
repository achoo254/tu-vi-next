/**
 * The short vertical video of a yearly sign page ("Tử vi 2027 tuổi …"). The files are not in the repo: they are
 * uploaded once to /var/www/tuvi/media on the server and served by nginx under /media/ (docs/deployment-guide.md).
 * Their spoken script is content/video-2027/<slug>.json; subtitles are burned into the picture, and the same lines
 * are a WebVTT caption track (off by default) for players and indexers that read captions.
 */
import { ZODIAC_SLUGS } from './year-routes';

export interface YearVideo {
  src: string;
  poster: string;
  /** WebVTT of the spoken lines (the same text is burned into the picture). */
  captions: string;
  width: number;
  height: number;
  /** Length in whole seconds (JSON-LD duration). */
  seconds: number;
  /** When the file was published, with its time zone (JSON-LD uploadDate). */
  uploaded: string;
}

/** Length of each 2027 video in seconds, in ZODIAC_SLUGS order (ffprobe of the published files). */
const SECONDS_2027 = [27, 34, 30, 28, 28, 36, 31, 28, 27, 36, 29, 29] as const;

const VIDEOS: Record<number, { seconds: readonly number[]; uploaded: string }> = {
  2027: { seconds: SECONDS_2027, uploaded: '2026-10-28T00:00:00+07:00' },
};

/** The video of a sign page, or null when that year has none. */
export function yearVideo(year: number, branchIndex: number): YearVideo | null {
  const set = VIDEOS[year];
  const slug = ZODIAC_SLUGS[branchIndex];
  const seconds = set?.seconds[branchIndex];
  if (set === undefined || slug === undefined || seconds === undefined) return null;
  const base = `/media/tu-vi-${year}/${slug}`;
  return { src: `${base}.mp4`, poster: `${base}.jpg`, captions: `${base}.vtt`, width: 1080, height: 1920, seconds, uploaded: set.uploaded };
}
