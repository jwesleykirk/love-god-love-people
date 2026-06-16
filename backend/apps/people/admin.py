from django.contrib import admin

from .models import Child, Person

admin.site.register(Person)
admin.site.register(Child)
