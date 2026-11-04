export type AudioPart = { url: string; duration: number };
export function audioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const duration = a.duration;
      a.removeAttribute("src");
      a.load();
      Number.isFinite(duration) && duration > 0
        ? resolve(duration)
        : reject(Error("Could not measure the prepared audio."));
    };
    a.onerror = () => reject(Error("A prepared audio part could not be read."));
    a.src = url;
  });
}
export function playOnce(
  parts: AudioPart[],
  speed: number,
  onAudio: (audio: HTMLAudioElement) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const players = parts.map((p) => {
      const a = new Audio(p.url);
      a.preload = "auto";
      a.playbackRate = speed;
      a.preservesPitch = true;
      return a;
    });
    let index = 0,
      finished = false;
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      for (const a of players) {
        a.onpause = null;
        a.onended = null;
        a.onerror = null;
        a.pause();
        a.removeAttribute("src");
        a.load();
      }
      reject(Error(message));
    };
    const play = () => {
      const a = players[index];
      onAudio(a);
      a.onpause = () => {
        if (!a.ended)
          fail("Playback was interrupted. This attempt was discarded.");
      };
      a.onerror = () =>
        fail("An audio part failed to play. This attempt was discarded.");
      a.onended = () => {
        a.onpause = null;
        a.onended = null;
        index++;
        if (index === players.length) {
          finished = true;
          resolve();
        } else play();
      };
      a.play().catch(() =>
        fail(
          "Your browser blocked playback. Allow audio for Attune and start a new session.",
        ),
      );
    };
    if (!parts.length) {
      reject(Error("Prepare the session audio first."));
      return;
    }
    play();
  });
}
