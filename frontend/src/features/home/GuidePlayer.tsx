import { useCallback, useEffect, useRef, useState } from "react";

import type { GuideClip } from "../types";

type Props = {
  clips: GuideClip[];
  sessionDate: string;
  legacyAudioUrl?: string | null;
  onComplete: () => void;
  onSkipToReview: () => void;
};

const ARTWORK = [
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GuidePlayer({
  clips,
  sessionDate,
  legacyAudioUrl,
  onComplete,
  onSkipToReview,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const indexRef = useRef(0);
  const [clipIndex, setClipIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const playlistMode = clips.length > 0;
  const currentClip = playlistMode ? clips[clipIndex] : null;

  const syncIndex = useCallback((next: number) => {
    indexRef.current = next;
    setClipIndex(next);
    setPosition(0);
    setDuration(0);
  }, []);

  const updateMediaSession = useCallback(
    (clip: GuideClip | null, pos: number, dur: number, isPlaying: boolean) => {
      if (!("mediaSession" in navigator) || !clip) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: clip.title,
        artist: clip.subtitle,
        album: `Today's Guide · ${sessionDate}`,
        artwork: ARTWORK,
      });

      if (typeof navigator.mediaSession.setPositionState === "function" && dur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: isPlaying ? 1 : 0,
            position: Math.min(pos, dur),
          });
        } catch {
          // Safari may reject position updates before metadata is ready.
        }
      }

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    },
    [sessionDate],
  );

  const loadClip = useCallback(
    async (index: number, autoplay: boolean) => {
      const audio = audioRef.current;
      if (!audio || !playlistMode) return;

      const clip = clips[index];
      if (!clip) return;

      audio.src = clip.audio_url;
      audio.load();

      updateMediaSession(clip, 0, 0, false);

      if (autoplay) {
        try {
          await audio.play();
          setPlaying(true);
          updateMediaSession(clip, 0, audio.duration || 0, true);
        } catch {
          setPlaying(false);
        }
      } else {
        setPlaying(false);
      }
    },
    [clips, playlistMode, updateMediaSession],
  );

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setPlaying(true);
      if (currentClip) {
        updateMediaSession(currentClip, audio.currentTime, audio.duration || duration, true);
      }
    } catch {
      setPlaying(false);
    }
  }, [currentClip, duration, updateMediaSession]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    if (currentClip) {
      updateMediaSession(currentClip, audio.currentTime, audio.duration || duration, false);
    }
  }, [currentClip, duration, updateMediaSession]);

  const goTo = useCallback(
    (index: number, autoplay = true) => {
      if (!playlistMode) return;
      if (index < 0 || index >= clips.length) {
        if (index >= clips.length) onComplete();
        return;
      }
      syncIndex(index);
      void loadClip(index, autoplay);
    },
    [clips.length, loadClip, onComplete, playlistMode, syncIndex],
  );

  const nextClip = useCallback(
    (autoplay = true) => {
      goTo(indexRef.current + 1, autoplay);
    },
    [goTo],
  );

  const prevClip = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    goTo(indexRef.current - 1, true);
  }, [goTo]);

  useEffect(() => {
    if (!playlistMode) return;

    if ("audioSession" in navigator) {
      try {
        (navigator as Navigator & { audioSession: { type: string } }).audioSession.type =
          "playback";
      } catch {
        // Optional iOS enhancement.
      }
    }

    syncIndex(0);
    void loadClip(0, false);
  }, [loadClip, playlistMode, syncIndex]);

  useEffect(() => {
    if (!playlistMode || !("mediaSession" in navigator)) return;

    const handlers: Array<[MediaSessionAction, () => void]> = [
      ["play", () => void play()],
      ["pause", () => pause()],
      ["nexttrack", () => nextClip(true)],
      ["previoustrack", () => prevClip()],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions are unsupported on older WebKit builds.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, [nextClip, pause, play, playlistMode, prevClip]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setPosition(audio.currentTime);
      if (currentClip) {
        updateMediaSession(currentClip, audio.currentTime, audio.duration || duration, !audio.paused);
      }
    };

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      if (currentClip) {
        updateMediaSession(currentClip, audio.currentTime, audio.duration || 0, !audio.paused);
      }
    };

    const onEnded = () => {
      if (playlistMode) {
        nextClip(true);
      } else {
        onComplete();
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [currentClip, duration, nextClip, onComplete, playlistMode, updateMediaSession]);

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  if (!playlistMode && legacyAudioUrl) {
    return (
      <div className="stack guide-player">
        <audio
          ref={audioRef}
          controls
          playsInline
          preload="metadata"
          src={legacyAudioUrl}
          style={{ width: "100%" }}
        />
        <button className="secondary" type="button" onClick={onSkipToReview}>
          Skip to review
        </button>
      </div>
    );
  }

  if (!currentClip) return null;

  return (
    <div className="stack guide-player">
      <audio ref={audioRef} playsInline preload="metadata" />

      <div className="guide-player-now">
        <p className="guide-player-eyebrow">{currentClip.subtitle}</p>
        <h2 className="guide-player-title">{currentClip.title}</h2>
        <p className="muted guide-player-progress-label">
          {clipIndex + 1} of {clips.length}
          {currentClip.kind === "topic" ? " · Prayer topic" : ""}
        </p>
      </div>

      <div className="session-progress" aria-hidden>
        <div className="session-progress-track">
          <div className="session-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="session-progress-label">
          {formatTime(position)} / {formatTime(duration)}
        </span>
      </div>

      <div className="guide-player-controls row row--wrap">
        <button
          className="secondary"
          type="button"
          aria-label="Previous section"
          disabled={clipIndex === 0}
          onClick={() => prevClip()}
        >
          Previous
        </button>
        <button
          className="primary-pill"
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => (playing ? pause() : void play())}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          className="secondary"
          type="button"
          aria-label="Next section"
          disabled={clipIndex >= clips.length - 1}
          onClick={() => nextClip(true)}
        >
          Next
        </button>
      </div>

      <button className="secondary" type="button" onClick={onSkipToReview}>
        Skip to review
      </button>
    </div>
  );
}
