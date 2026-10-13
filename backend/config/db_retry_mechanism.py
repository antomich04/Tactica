import logging
from sqlalchemy.exc import DBAPIError, InterfaceError, OperationalError
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_random_exponential,
)

logger = logging.getLogger("db_retry")

TRANSIENT_SQLSTATES = frozenset({
    "40001",  # serialization_failure
    "40P01",  # deadlock_detected
    "57P01",  # admin_shutdown (restart / failover)
    "57P02",  # crash_shutdown
    "57P03",  # cannot_connect_now (server starting up)
    "08000",  # connection_exception
    "08001",  # sqlclient_unable_to_establish_sqlconnection
    "08003",  # connection_does_not_exist
    "08004",  # sqlserver_rejected_establishment_of_sqlconnection
    "08006",  # connection_failure
})


def _sqlstate(exc: DBAPIError) -> str | None:
    """Extracts the SQLSTATE from the wrapped driver error."""

    orig = getattr(exc, "orig", None)
    
    for candidate in (orig, getattr(orig, "__cause__", None)):
        code = getattr(candidate, "sqlstate", None) or getattr(candidate, "pgcode", None)
        if code:
            return code
        
    return None


def is_transient_db_error(exc: BaseException) -> bool:
    """True only for failures that may succeed if the same transaction is run again.

    Constraint violations, syntax errors, permission errors and pool-checkout
    timeouts (a sign of overload) are deliberately NOT retried.
    """
    if isinstance(exc, DBAPIError):
        if exc.connection_invalidated:
            return True
        code = _sqlstate(exc)
        if code in TRANSIENT_SQLSTATES:
            return True
        if code is not None:
            return False
    return isinstance(exc, (OperationalError, InterfaceError, ConnectionError))


def db_retry(*, max_attempts: int = 3, base_delay: float = 0.1, max_delay: float = 0.5):

    return retry(
        retry=retry_if_exception(is_transient_db_error),
        stop=stop_after_attempt(max_attempts),
        wait=wait_random_exponential(multiplier=base_delay, max=max_delay),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


# Default policy used across the services.
with_db_retry = db_retry()