from django.apps import AppConfig


class PeopleConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.people"
    label = "people"

    def ready(self) -> None:
        # Side-effect import — connects @receiver decorators.
        from . import signals  # noqa: F401
