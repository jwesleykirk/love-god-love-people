from django.urls import path

from .views import (
    BuildNowView,
    GuideReadinessView,
    RegenerateSegmentsView,
    SessionAudioView,
    SettingsView,
    TodayGuideView,
    VoicePreviewView,
)

urlpatterns = [
    path("readiness/", GuideReadinessView.as_view(), name="guide-readiness"),
    path("today/", TodayGuideView.as_view(), name="guide-today"),
    path("build/", BuildNowView.as_view(), name="guide-build"),
    path("settings/", SettingsView.as_view(), name="guide-settings"),
    path("voice-preview/", VoicePreviewView.as_view(), name="guide-voice-preview"),
    path("segments/regenerate/", RegenerateSegmentsView.as_view(), name="guide-regen-segments"),
    path("sessions/<int:session_id>/audio/", SessionAudioView.as_view(), name="guide-session-audio"),
]
