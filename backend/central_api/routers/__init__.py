from .branches import router as branches_router
from .attendance import router as attendance_router
from .customers import router as customers_router
from .shutter import router as shutter_router
from .cash_door import router as cash_door_router
from .alerts import router as alerts_router
from .health import router as health_router

__all__ = [
    "branches_router",
    "attendance_router",
    "customers_router",
    "shutter_router",
    "cash_door_router",
    "alerts_router",
    "health_router",
]
