# exam_guardrail — Exam Proctoring Middleware

__version__ = "1.0.0"

def __getattr__(name):
    if name == 'GuardrailConfig':
        from exam_guardrail.config import GuardrailConfig
        return GuardrailConfig
    if name == 'init_guardrail':
        from exam_guardrail.core import init_guardrail
        return init_guardrail
    if name == 'NativeAgentMiddleware':
        from exam_guardrail.middleware import NativeAgentMiddleware
        return NativeAgentMiddleware
    if name == 'NativeAgent':
        from exam_guardrail.services.scanners.agent_runner import NativeAgent
        return NativeAgent
    raise AttributeError(f'module {__name__!r} has no attribute {name!r}')

__all__ = ["init_guardrail", "GuardrailConfig", "NativeAgentMiddleware", "NativeAgent", "__version__"]
