from django.db import models


class ReadingDay(models.Model):
    guid = models.CharField(max_length=512, primary_key=True)
    title = models.CharField(max_length=255, blank=True, default="")
    pub_date = models.DateTimeField(null=True, blank=True)
    passage_reference = models.TextField(blank=True, default="")
    commentary = models.TextField(blank=True, default="")
    ot_reference = models.TextField(blank=True, default="")
    ot_link = models.URLField(blank=True, default="")
    nt_reference = models.TextField(blank=True, default="")
    nt_link = models.URLField(blank=True, default="")
    esv_day_audio_url = models.URLField(blank=True, default="")
    esv_day_audio_bytes = models.PositiveIntegerField(null=True, blank=True)
    esv_org_audio_url = models.URLField(blank=True, default="")
    esv_ot_html = models.TextField(blank=True, default="")
    esv_ot_text = models.TextField(blank=True, default="")
    esv_nt_html = models.TextField(blank=True, default="")
    esv_nt_text = models.TextField(blank=True, default="")
    raw_content_html = models.TextField(blank=True, default="")
    audio_cached_path = models.TextField(blank=True, default="")
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-pub_date"]

    def __str__(self) -> str:
        return self.title or self.guid
