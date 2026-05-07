import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_email(to_email, subject, html_body, text_body=None):
    transport = settings.MAIL_TRANSPORT

    if transport == "console":
        print("=" * 72)
        print("EMAIL (console transport)")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        if text_body:
            print(text_body)
        else:
            print(html_body)
        print("=" * 72)
        return True, None

    if transport != "smtp":
        return False, "Unsupported mail transport"

    if not settings.MAIL_HOST or not settings.MAIL_FROM:
        return False, "SMTP settings are incomplete"

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject

    plain = text_body or "Please open this email with an HTML-capable client."
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.MAIL_HOST, settings.MAIL_PORT, timeout=20) as server:
            if settings.MAIL_USE_TLS:
                server.starttls()
            if settings.MAIL_USERNAME:
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, [to_email], msg.as_string())
        return True, None
    except Exception as exc:
        return False, str(exc)
