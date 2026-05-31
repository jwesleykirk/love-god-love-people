"""django-allauth adapters that enforce the email allowlist for v0.1.

`GOOGLE_OAUTH_ALLOWED_EMAILS` (read in settings) is a lowercase list of
permitted addresses. Anything else is rejected at the OAuth callback,
before a Django user is created.
"""
from allauth.account.adapter import DefaultAccountAdapter
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.http import HttpResponseForbidden


def _is_allowed(email: str) -> bool:
    allowlist = getattr(settings, "GOOGLE_OAUTH_ALLOWED_EMAILS", []) or []
    if not allowlist:
        # Defensive: if the allowlist is empty AND auth is enabled, allow nobody.
        return False
    return (email or "").strip().lower() in allowlist


class AllowlistAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request) -> bool:  # type: ignore[override]
        return False  # No password signup. Google only.


class AllowlistSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin) -> None:  # type: ignore[override]
        email = (sociallogin.account.extra_data.get("email") or "").lower()
        if not _is_allowed(email):
            raise ImmediateHttpResponse(
                HttpResponseForbidden(
                    f"{email} is not on the allowlist for this app."
                )
            )

    def is_open_for_signup(self, request, sociallogin) -> bool:  # type: ignore[override]
        email = (sociallogin.account.extra_data.get("email") or "").lower()
        return _is_allowed(email)
