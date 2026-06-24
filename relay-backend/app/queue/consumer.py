import asyncio
import signal
import logging
from typing import Callable, Dict

from app.queue.client import PgmqClient, QueueMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QueueConsumer:
    """Worker that polls pgmq queues and processes messages"""

    def __init__(self):
        self.client = PgmqClient()
        self.handlers: Dict[str, Callable] = {}
        self.running = False
        self.poll_interval = 1 # seconds

    def register(self, queue_name: str, handler: Callable):
        """Register a handler for a queue"""
        self.handlers[queue_name] = handler
        logger.info(f"Registered handler for queue: {queue_name}")

    async def process_messages(self, queue_name: str, message: QueueMessage) -> bool:
        """Process a single message"""
        handler = self.handlers.get(queue_name)
        if not handler:
            logger.error(f'No handler registered for queue: {queue_name}')
            return False
        
        try:
            logger.info(f'Processing msg {message.msg_id} from {queue_name}')
            await handler(message.message)

            # Delete on success
            self.client.delete(queue_name, message.msg_id)
            logger.info(f'Completed msg {message.msg_id}')
            return True
        except Exception as exp:
            logger.error(f'Error processing msg {message.msg_id}: {exp}',exc_info=True)

            # Archive after max retries
            if message.read_ct >= 3:
                logger.warning(f"Max retries for msg {message.msg_id}, archiving....")
                self.client.archive(queue_name, message.msg_id)
            
            return False
    
    async def poll_queue(self, queue_name: str):
        messages = self.client.read(queue_name, visibility_timeout=60, batch_size=5)
        for message in messages:
            await self.process_messages(queue_name, message)
    
    # Main Loop
    async def run(self):
        self.running = True
        logger.info(f"Starting consume for queues: {list(self.handlers.keys())}")

        while self.running:
            try:
                for queue_name in self.handlers.keys():
                    await self.poll_queue(queue_name)
                await asyncio.sleep(self.poll_interval)
            except Exception as exp:
                logger.error(f"Consumer error: {exp}", exc_info=True)
                await asyncio.sleep(5)
    
    def stop(self):
        "Stop the consumer"
        self.running = False
        logger.info("Stopping consume......")

async def main():
    from app.queue.handlers.call_handlers import (
        handle_execute_call,
        handle_extraction,
        handle_notification,
    )

    consumer = QueueConsumer()
    consumer.register('call_queue', handle_execute_call)
    consumer.register('extraction_queue', handle_extraction)
    consumer.register('notification_queue', handle_notification)

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, consumer.stop)
    
    await consumer.run()

if __name__ == '__main__':
    asyncio.run(main())