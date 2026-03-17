# exam_guardrail/middleware/native_agent.py
# ASGI Middleware for native agent scanning — add it like CORSMiddleware.
#
# Usage:
#   from exam_guardrail.middleware import NativeAgentMiddleware
#   app.add_middleware(NativeAgentMiddleware, block=True, scan_interval=3)

import asyncio
import logging

from starlette.types import ASGIApp, Receive, Scope, Send

log = logging.getLogger('exam_guardrail.middleware.native_agent')


class NativeAgentMiddleware:
    """
    ASGI middleware that runs the native agent scanner in the background.

    Scans for hidden AI agents, screen sharing software, and cheating
    browser extensions every `scan_interval` seconds. Optionally blocks
    detected threats by terminating processes and disabling extensions.

    Usage:
        app.add_middleware(
            NativeAgentMiddleware,
            block=True,
            scan_interval=3,
            session_id='__server__',
        )
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        block: bool = True,
        scan_interval: int = 3,
        session_id: str = '__server__',
        enabled: bool = True,
    ):
        self.app = app
        self.block = block
        self.scan_interval = scan_interval
        self.session_id = session_id
        self.enabled = enabled
        self._agent = None
        self._task = None
        self._started = False

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Start the agent on the first lifespan or http request
        if not self._started and self.enabled:
            self._started = True
            await self._start_agent()

        # Handle lifespan events for clean shutdown
        if scope['type'] == 'lifespan':
            await self._handle_lifespan(scope, receive, send)
            return

        await self.app(scope, receive, send)

    async def _handle_lifespan(self, scope: Scope, receive: Receive, send: Send):
        """Intercept lifespan to hook startup/shutdown."""
        async def wrapped_receive():
            message = await receive()
            if message['type'] == 'lifespan.startup':
                pass  # agent already started on first call
            return message

        async def wrapped_send(message):
            if message['type'] == 'lifespan.shutdown.complete':
                await self._stop_agent()
            await send(message)

        await self.app(scope, wrapped_receive, wrapped_send)

    async def _start_agent(self):
        """Start the native agent scanner as a background task."""
        try:
            from exam_guardrail.services.scanners.agent_runner import NativeAgent

            self._agent = NativeAgent(
                session_id=self.session_id,
                api_base='http://127.0.0.1:8000/api',
                scan_interval=self.scan_interval,
                block=self.block,
                embedded=True,
            )

            async def _run():
                try:
                    await self._agent.start()
                except Exception as e:
                    log.error(f'Native agent error: {e}')

            self._task = asyncio.create_task(_run())
            log.info(f'Native agent middleware started — block={self.block}, interval={self.scan_interval}s')
            print(f'[ExamGuardrail] Native agent started — block={self.block}, interval={self.scan_interval}s')

        except Exception as e:
            log.error(f'Failed to start native agent middleware: {e}')

    async def _stop_agent(self):
        """Stop the agent and restore blocked extensions."""
        if self._agent:
            self._agent.stop()

        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        # Restore blocked extensions
        try:
            from exam_guardrail.services.scanners.extension_detector import restore_extensions
            restored = restore_extensions()
            if restored:
                print(f'[ExamGuardrail] Restored {restored} blocked extensions.')
        except Exception:
            pass

        print('[ExamGuardrail] Native agent stopped.')
