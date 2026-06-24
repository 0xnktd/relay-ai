import json
from typing import Optional
from dataclasses import dataclass
from datetime import datetime

from app.core.supabase import get_supabase_admin_client

@dataclass
class QueueMessage:
    msg_id: int
    read_ct: int
    enqueued_at: datetime
    vt: datetime
    message: dict

class PgmqClient:
    """Client for pgmq"""

    def __init__(self):
        self.supabase = get_supabase_admin_client()
    
    def send(self, queue_name: str, payload: dict) -> int:
        """Send a message to a queue. Returns message ID."""
        result = self.supabase.rpc(
            'pgmq_send',
            {'queue_name': queue_name, 'message': payload}
        ).execute()
        return result.data
    
    def send_delayed(self, queue_name: str, payload: dict, delay_seconds: int) -> int:
        """Send a message to the queue with some delay"""
        result = self.supabase.rpc(
            'pgmq_send_delay',
            {'queue_name': queue_name, 'message': payload, 'delay_seconds': delay_seconds}
        ).execute()
        return result
    
    def read(self, queue_name: str, visibility_timeout: int = 30, batch_size: int = 1) -> list[QueueMessage]:
        """Read messages from queue. Messages are hidden for visibility_timeout seconds."""
        result = self.supabase.rpc(
            'pgmq_read',
            {
                'queue_name': queue_name,
                'vt': visibility_timeout,
                'qty': batch_size
            }
        ).execute()

        if not result.data:
            return []

        return [
            # (msg_id, read_ct, enqueued_at, vt, message, headers)
            QueueMessage(
                msg_id=msg['msg_id'],
                read_ct=msg['read_ct'],
                enqueued_at=msg['enqueued_at'],
                vt=msg['vt'],
                message=msg['message'] if isinstance(msg, dict) else json.loads(msg)
            )
            for msg in result.data
        ]
    
    def delete(self, queue_name: str, msg_id: int) -> bool:
        """Delete message after successful processing"""
        result = self.supabase.rpc(
            'pgmq_delete',
            {'queue_name': queue_name, 'msg_id': msg_id},
        ).execute()
        return result.data
    
    def archive(self, queue_name: str, msg_id: int) -> bool:
        """Archive message instead of deleting"""
        result = self.supabase.rpc(
            'pgmq_archive',
            {'queue_name': queue_name, 'msg_id': msg_id},
        ).execute()
        return result.data