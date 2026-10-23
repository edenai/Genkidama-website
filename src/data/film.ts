/**
 * The film that closes 03 / The experiments. One place for its assets and its
 * copy. To replace the film: put the new MP4 and its first-frame poster at the
 * same two paths under `public/media/` and update the fields that changed; the
 * player derives everything else (aspect ratio, labels) from these values and
 * reads the running time from the medium itself once its metadata has loaded.
 *
 * Current film: the v5 ending revision (71 s): the robot discovers MCP-powered
 * tools, assembles its film, watches the result on the studio display and rewinds
 * it to the opening, which is where the film starts again.
 */
export interface Film {
  /** Public URL of the MP4, served from `public/media`. H.264 yuv420p + AAC stereo soundtrack, fast-start. */
  src: string;
  /** Public URL of the poster: the film's exact first frame, so playback starts without a visible jump. */
  poster: string;
  /** Picture size in pixels; the player reserves this aspect ratio before anything loads. */
  width: number;
  height: number;
  /** Running time in seconds, for the label and as the player's fallback before the medium's metadata arrives (the film loops). */
  duration: number;
  heading: string;
  text: string;
}

export const film: Film = {
  src: '/media/genkidama-film.mp4',
  poster: '/media/genkidama-film-poster.jpg',
  width: 1920,
  height: 1080,
  duration: 71,
  heading: 'Claude × MCP',
  text: 'A small experiment in creation with MCP-powered tools. Watch the robot discover its tools, assemble its film piece by piece, bring everything together, then see the finished result and rewind it back to the beginning.',
};
