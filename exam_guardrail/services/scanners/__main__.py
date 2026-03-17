# python -m exam_guardrail.services.scanners --session-id abc123
import asyncio
from exam_guardrail.services.scanners.agent_runner import _main
asyncio.run(_main())
