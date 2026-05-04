"""
Synapse Logger
Writes structured logs to logs/synapse.log and stdout.
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

LOG_DIR  = Path(__file__).parent.parent / "logs"
LOG_FILE = LOG_DIR / "synapse.log"

LOG_DIR.mkdir(exist_ok=True)

# ── Formatter ──────────────────────────────────────────────────────────────
class SynapseFormatter(logging.Formatter):
    FORMATS = {
        logging.DEBUG:    "\033[2m[DEBUG]\033[0m %(message)s",
        logging.INFO:     "\033[96m[INFO ]\033[0m %(message)s",
        logging.WARNING:  "\033[93m[WARN ]\033[0m %(message)s",
        logging.ERROR:    "\033[91m[ERROR]\033[0m %(message)s",
        logging.CRITICAL: "\033[91m\033[1m[CRIT ]\033[0m %(message)s",
    }
    FILE_FMT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"

    def format(self, record):
        self._style._fmt = self.FORMATS.get(record.levelno, self.FORMATS[logging.INFO])
        return super().format(record)


def get_logger(name: str = "synapse") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # Already configured

    logger.setLevel(logging.DEBUG)

    # Console handler (INFO and above)
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(SynapseFormatter())

    # File handler (DEBUG and above, rotating 5MB x 3)
    fh = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3)
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter(SynapseFormatter.FILE_FMT))

    logger.addHandler(ch)
    logger.addHandler(fh)
    return logger
