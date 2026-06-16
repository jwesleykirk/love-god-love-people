from django.contrib import admin

from .models import PrayerLog, PrayerSession, PrayerTopic

admin.site.register(PrayerTopic)
admin.site.register(PrayerSession)
admin.site.register(PrayerLog)
