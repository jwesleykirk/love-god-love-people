import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";
import { fetchGuideSettings, regenerateSegments, regenerateTodaysGuide } from "../api";

export function SettingsRoute() {
  const { auth, logout } = useAuth();
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof fetchGuideSettings>> | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingGuide, setRegeneratingGuide] = useState(false);
  const [guideRegenMessage, setGuideRegenMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchGuideSettings().then(setSettings);
  }, []);

  const handleRegen = async () => {
    setRegenerating(true);
    try {
      await regenerateSegments();
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenGuide = async () => {
    setRegeneratingGuide(true);
    setGuideRegenMessage(null);
    try {
      const result = await regenerateTodaysGuide();
      setGuideRegenMessage(result.message);
    } finally {
      setRegeneratingGuide(false);
    }
  };

  return (
    <main className="container stack-lg">
      <Link to="/" className="session-back">← Home</Link>
      <h1>Settings</h1>
      <p className="muted section-sub">Control build timing and narration voice behavior.</p>

      <div className="card stack">
        <p className="muted">
          Rebuild today&apos;s reading, prayer narrations, and playlist if you&apos;ve updated topics or
          people.
        </p>
        <button
          type="button"
          className="secondary"
          onClick={() => void handleRegenGuide()}
          disabled={regeneratingGuide}
        >
          {regeneratingGuide ? "Queuing…" : "Regenerate today's guide"}
        </button>
        {guideRegenMessage && <p className="muted">{guideRegenMessage}</p>}
      </div>

      {settings && (
        <div className="card stack">
          <p><span className="muted">Build time</span><br />{settings.build_time_hour}:00 AM Pacific</p>
          <p><span className="muted">Voice</span><br />{settings.elevenlabs_voice_id}</p>
          <p className="muted">
            TTS {settings.tts_available ? "enabled" : "disabled"} ·
            AI narration {settings.openrouter_available ? "enabled" : "disabled"}
          </p>
          {settings.tts_available && (
            <>
              <audio controls src="/api/guide/voice-preview/" style={{ width: "100%" }} />
              <button className="secondary" onClick={() => void handleRegen()} disabled={regenerating}>
                {regenerating ? "Queuing…" : "Regenerate liturgy segments"}
              </button>
            </>
          )}
        </div>
      )}

      {auth?.auth_enabled && auth.authenticated && (
        <div className="card stack">
          <p className="muted">Signed in as {auth.user?.email}</p>
          <button className="secondary" onClick={logout}>Sign out</button>
        </div>
      )}
    </main>
  );
}
