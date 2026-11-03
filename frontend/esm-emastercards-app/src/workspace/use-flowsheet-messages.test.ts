import { renderHook } from '@testing-library/react';
import { useFlowsheetMessages } from './use-flowsheet-messages';

function post(data: unknown, source: unknown, origin = window.location.origin) {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as MessageEventSource }));
}

describe('useFlowsheetMessages', () => {
  const frame = {} as Window;
  const iframeRef = { current: { contentWindow: frame } as HTMLIFrameElement };

  it('calls onClose and onSaved for the flowsheet in its own iframe', () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderHook(() => useFlowsheetMessages(iframeRef, { onClose, onSaved, onDirtyChange: vi.fn() }));

    post({ type: 'pihmalawi:emastercard:saved' }, frame);
    post({ type: 'pihmalawi:emastercard:close' }, frame);

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores messages from other windows or origins', () => {
    const onClose = vi.fn();
    renderHook(() => useFlowsheetMessages(iframeRef, { onClose, onSaved: vi.fn(), onDirtyChange: vi.fn() }));

    post({ type: 'pihmalawi:emastercard:close' }, {} as Window);
    post({ type: 'pihmalawi:emastercard:close' }, frame, 'https://elsewhere.example');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports whether the flowsheet has unsaved changes', () => {
    const onDirtyChange = vi.fn();
    renderHook(() => useFlowsheetMessages(iframeRef, { onClose: vi.fn(), onSaved: vi.fn(), onDirtyChange }));

    post({ type: 'pihmalawi:emastercard:dirty', dirty: true }, frame);
    post({ type: 'pihmalawi:emastercard:dirty', dirty: false }, frame);

    expect(onDirtyChange.mock.calls).toEqual([[true], [false]]);
  });
});
