import { type RefObject, useEffect, useRef } from 'react';

interface FlowsheetMessageHandlers {
  onClose: () => void;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Listens for the messages an embedded eMastercard flowsheet posts (see mastercard.js in the pihmalawi module):
 * a close when the user leaves the flowsheet, a saved after each save, and whether it has unsaved changes. Only messages from the flowsheet in
 * the given iframe, on this server, count.
 */
export function useFlowsheetMessages(iframeRef: RefObject<HTMLIFrameElement>, handlers: FlowsheetMessageHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      if (event.data?.type === 'pihmalawi:emastercard:close') {
        handlersRef.current.onClose();
      } else if (event.data?.type === 'pihmalawi:emastercard:saved') {
        handlersRef.current.onSaved();
      } else if (event.data?.type === 'pihmalawi:emastercard:dirty') {
        handlersRef.current.onDirtyChange(Boolean(event.data.dirty));
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [iframeRef]);
}
