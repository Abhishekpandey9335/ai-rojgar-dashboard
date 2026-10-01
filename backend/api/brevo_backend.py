import json
import urllib.request
import urllib.error
from email.utils import parseaddr
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


class BrevoEmailBackend(BaseEmailBackend):
    """Sends Django emails through Brevo's HTTP API (works where SMTP is blocked)."""

    def send_messages(self, email_messages):
        key = getattr(settings, "BREVO_API_KEY", "")
        sent = 0
        for m in email_messages:
            name, addr = parseaddr(m.from_email or "")
            addr = getattr(settings, "EMAIL_HOST_USER", "") or addr
            payload = {"sender": {"email": addr}, "to": [{"email": t} for t in m.to], "subject": m.subject}
            if name:
                payload["sender"]["name"] = name
            html, text = None, None
            if getattr(m, "content_subtype", "plain") == "html":
                html = m.body
            else:
                text = m.body
            for content, mime in getattr(m, "alternatives", []):
                if mime == "text/html":
                    html = content
            if html:
                payload["htmlContent"] = html
            if text or not html:
                payload["textContent"] = text or " "
            if m.cc:
                payload["cc"] = [{"email": t} for t in m.cc]
            if m.bcc:
                payload["bcc"] = [{"email": t} for t in m.bcc]
            if m.reply_to:
                payload["replyTo"] = {"email": m.reply_to[0]}
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=json.dumps(payload).encode("utf-8"),
                headers={"api-key": key, "content-type": "application/json", "accept": "application/json"},
                method="POST",
            )
            try:
                urllib.request.urlopen(req, timeout=15).read()
                sent += 1
            except urllib.error.HTTPError as e:
                if not self.fail_silently:
                    raise RuntimeError("Brevo error %s: %s" % (e.code, e.read().decode("utf-8", "ignore")[:300]))
            except Exception:
                if not self.fail_silently:
                    raise
        return sent
