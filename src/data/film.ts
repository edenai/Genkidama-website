/**
 * The film that closes 03 / The experiments. One place for its assets and its
 * copy. To replace the film: put the new MP4 and its first-frame poster at the
 * same two paths under `public/media/` and update the fields that changed; the
 * player derives everything else (aspect ratio, labels) from these values.
 */
export interface Film {
  /** Public URL of the MP4, served from `public/media`. H.264 yuv420p + AAC stereo soundtrack, fast-start. */
  src: string;
  /** Public URL of the poster: the film's exact first frame, so playback starts without a visible jump. */
  poster: string;
  /** Picture size in pixels; the player reserves this aspect ratio before anything loads. */
  width: number;
  height: number;
  /** Running time in seconds (the film loops). */
  duration: number;
  heading: string;
  text: string;
}

export const film: Film = {
  src: '/media/genkidama-film.mp4',
  poster: '/media/genkidama-film-poster.jpg',
  width: 1920,
  height: 1080,
  duration: 51,
  heading: 'Claude × MCP',
  text: 'A short film made with MCP-powered tools, bringing the experiment to life.',
};
