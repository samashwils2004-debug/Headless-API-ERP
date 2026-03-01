from __future__ import annotations

import json
from collections import defaultdict

from fastapi import WebSocket


class WebSocketHub:
    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)

    @staticmethod
    def _channel(institution_id: str, project_id: str) -> str:
        return f"{institution_id}:{project_id}"

    async def connect(self, websocket: WebSocket, institution_id: str, project_id: str) -> None:
        await websocket.accept()
        self._channels[self._channel(institution_id, project_id)].add(websocket)

    def disconnect(self, websocket: WebSocket, institution_id: str, project_id: str) -> None:
        channel = self._channel(institution_id, project_id)
        if channel in self._channels:
            self._channels[channel].discard(websocket)

    async def broadcast(self, institution_id: str, project_id: str, payload: dict) -> None:
        channel = self._channel(institution_id, project_id)
        stale: list[WebSocket] = []
        for ws in self._channels.get(channel, set()):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                stale.append(ws)
        for ws in stale:
            self._channels[channel].discard(ws)


hub = WebSocketHub()

