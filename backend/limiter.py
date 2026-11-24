import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# Centralized rate limiter shared across all routers and main application.
# Disabled automatically under the automated test environment so the suite is
# deterministic and never flakes on 429s; fully active in dev/prod.
_limiter_enabled = os.getenv("ENVIRONMENT", "production").lower() not in ("test",)

limiter = Limiter(key_func=get_remote_address, enabled=_limiter_enabled)