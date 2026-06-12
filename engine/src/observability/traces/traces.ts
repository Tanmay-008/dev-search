import { trace, Tracer } from '@opentelemetry/api';

const tracer: Tracer = trace.getTracer('order-service', '2.1.0');

export { tracer };