// Production MCP startup accepts authority only from trusted Runtime composition.
export function requireTrustedRuntimeComposition({admission,receiptSink}={}) {
  if(typeof admission!=='function'||typeof receiptSink!=='function')
    throw new Error('TRUSTED_RUNTIME_COMPOSITION_REQUIRED');
  return Object.freeze({admission,receiptSink});
}
