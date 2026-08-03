from typing import Any, Callable
import logging

logger = logging.getLogger("app")


class EventBus:
    def __init__(self):
        self._listeners: dict[str, list[Callable[[Any], None]]] = {}

    def subscribe(self, event_name: str, callback: Callable[[Any], None]) -> None:
        """
        Subscribes a listener callback to a specific business event.
        """
        if event_name not in self._listeners:
            self._listeners[event_name] = []
        self._listeners[event_name].append(callback)

    def publish(self, event_name: str, data: Any) -> None:
        """
        Synchronously dispatches the business event to all registered listeners.
        """
        logger.info(
            f"Publishing event: {event_name}",
            extra={"extra_info": {"event_name": event_name, "data": data}},
        )
        if event_name in self._listeners:
            for callback in self._listeners[event_name]:
                try:
                    callback(data)
                except Exception as e:
                    logger.exception(
                        f"Error in subscriber callback for event {event_name}: {e}",
                        extra={
                            "extra_info": {
                                "callback": str(callback),
                                "event_name": event_name,
                            }
                        },
                    )


event_bus = EventBus()
