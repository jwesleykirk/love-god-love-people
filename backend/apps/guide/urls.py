from django.urls import path

from .views import (
    BuildNowView,
    DbrAudioView,
    GuideReadinessView,
    RegenerateSegmentsView,
    SegmentAudioView,
    SessionAudioView,
    SettingsView,
    SilenceAudioView,
    TodayGuideView,
    TopicAudioView,
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
    path("audio/segments/<str:key>/", SegmentAudioView.as_view(), name="guide-segment-audio"),
    path("audio/dbr/<int:reading_id>/", DbrAudioView.as_view(), name="guide-dbr-audio"),
    path("audio/topics/<int:topic_id>/", TopicAudioView.as_view(), name="guide-topic-audio"),
    path("audio/silence/<int:seconds>/", SilenceAudioView.as_view(), name="guide-silence-audio"),
]
