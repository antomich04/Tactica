import logging
import os
from azure.communication.email import EmailClient

logger = logging.getLogger(__name__)

def send_otp_email(email_to: str, otp_code: str, purpose: str) -> None:
    connection_string = os.getenv("MAIL_SERVER_ENDPOINT")
    sender_address = os.getenv("DONOTREPLY_AZURE_EMAIL")
    
    try:
        email_client = EmailClient.from_connection_string(connection_string)
        
        subject = "Verify your email" if purpose == "verify_email" else "Tactica Password Reset"
        body = f"Your one-time passcode is: <strong>{otp_code}</strong>. It expires in 3 minutes."
        
        message = {
            "senderAddress": sender_address,
            "recipients": {"to": [{"address": email_to}]},
            "content": {"subject": subject, "html": body}
        }
        
        email_client.begin_send(message)
        
    except Exception:
        logger.exception("Failed to send '%s' OTP email", purpose)