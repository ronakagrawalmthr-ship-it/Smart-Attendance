"""
Smart Attendance - Real-Time WebSocket Connection Manager
Provides live roster streaming, broadcast alerts, and session synchronization.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Any
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        # Maps session_id (int) -> List of connected active WebSockets
        self.active_session_connections: Dict[int, List[WebSocket]] = {}
        # Global listeners (e.g. Admin overview dashboards)
        self.global_connections: List[WebSocket] = []

    async def connect_session(self, session_id: int, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_session_connections:
            self.active_session_connections[session_id] = []
        self.active_session_connections[session_id].append(websocket)
        print(f"[WS CONNECT] Client joined session {session_id}. Active clients for session: {len(self.active_session_connections[session_id])}")

    def disconnect_session(self, session_id: int, websocket: WebSocket):
        if session_id in self.active_session_connections:
            if websocket in self.active_session_connections[session_id]:
                self.active_session_connections[session_id].remove(websocket)
            if not self.active_session_connections[session_id]:
                del self.active_session_connections[session_id]
        print(f"[WS DISCONNECT] Client left session {session_id}.")

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.append(websocket)

    def disconnect_global(self, websocket: WebSocket):
        if websocket in self.global_connections:
            self.global_connections.remove(websocket)

    async def broadcast_to_session(self, session_id: int, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts an event to all clients actively watching this session (e.g. Teacher projector screen).
        """
        payload = {
            "type": event_type,
            "session_id": session_id,
            "data": data
        }
        raw_msg = json.dumps(payload)
        connections = self.active_session_connections.get(session_id, [])
        dead_connections = []
        for ws in connections:
            try:
                await ws.send_text(raw_msg)
            except Exception:
                dead_connections.append(ws)

        for dead in dead_connections:
            self.disconnect_session(session_id, dead)

    async def broadcast_global(self, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts an event to all global listeners.
        """
        payload = {
            "type": event_type,
            "data": data
        }
        raw_msg = json.dumps(payload)
        dead = []
        for ws in self.global_connections:
            try:
                await ws.send_text(raw_msg)
            except Exception:
                dead.append(ws)
        for d in dead:
            self.disconnect_global(d)

# Global singleton connection manager
ws_manager = ConnectionManager()
