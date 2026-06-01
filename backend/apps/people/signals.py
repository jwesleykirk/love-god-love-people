"""Signals on Person.

When Person.birthday is set (or changed to a non-null value), any active
approximate_birth_year PersonProperty for that person is marked superseded.
The transition is captured by simple_history.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(post_save, sender="people.Person")
def supersede_approximate_birth_year(sender, instance, created, **kwargs):
    if not instance.birthday:
        return
    # Lazy import to avoid circular
    from apps.properties.models import (
        PersonProperty,
        PersonPropertyStatus,
        PropertyDef,
    )

    try:
        pdef = PropertyDef.objects.get(owner=instance.owner, name="approximate_birth_year")
    except PropertyDef.DoesNotExist:
        return

    affected = PersonProperty.objects.filter(
        person=instance,
        property_def=pdef,
        status__in=[
            PersonPropertyStatus.PENDING_REVIEW,
            PersonPropertyStatus.APPROVED,
            PersonPropertyStatus.EDITED,
        ],
    )
    for pp in affected:
        pp.status = PersonPropertyStatus.SUPERSEDED
        pp.reviewed_at = timezone.now()
        pp._change_reason = f"superseded:birthday_set_on_person={instance.pk}"
        pp.save(update_fields=["status", "reviewed_at"])
