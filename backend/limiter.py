from slowapi import Limiter
from slowapi.util import get_remote_address

# Centralized rate limiter shared across all routers and main application
limiter = Limiter(key_func=get_remote_address)
