"""
Synapse Retry Utility
Exponential backoff for Ollama API calls.
"""

import time
import functools
from core.logger import get_logger

log = get_logger("synapse.retry")


def with_retry(max_attempts: int = 3, base_delay: float = 1.0, exceptions=(Exception,)):
    """
    Decorator: retry a function with exponential backoff.
    Usage:
        @with_retry(max_attempts=3)
        def call_ollama(): ...
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        log.error(f"{func.__name__} failed after {max_attempts} attempts: {e}")
                        raise
                    log.warning(f"{func.__name__} attempt {attempt} failed: {e}. Retrying in {delay:.1f}s...")
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
        return wrapper
    return decorator


def safe_call(func, *args, default=None, **kwargs):
    """
    Call a function safely, returning default on any exception.
    Use for non-critical operations that shouldn't crash the app.
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        log.debug(f"safe_call caught: {e}")
        return default
