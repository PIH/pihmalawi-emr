import React, { useRef } from 'react';
import { useSWRConfig } from 'swr';
import { useFlowsheetMessages } from './use-flowsheet-messages';
import styles from './flowsheet.scss';

interface FlowsheetFrameProps {
  title: string;
  url: string;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * An eMastercard flowsheet in an iframe. It reports whether the flowsheet has unsaved changes, so the chart can
 * warn before closing it (the flowsheet itself asks before the user leaves it). The chart's data is refreshed after each save and when the flowsheet is
 * left, since a flowsheet can change encounters, vitals and the eMastercards themselves.
 */
const FlowsheetFrame: React.FC<FlowsheetFrameProps> = ({ title, url, onClose, onDirtyChange }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { mutate } = useSWRConfig();
  const refreshChart = () => mutate(() => true);

  useFlowsheetMessages(iframeRef, {
    onDirtyChange,
    onSaved: refreshChart,
    onClose: () => {
      refreshChart();
      onClose();
    },
  });

  return <iframe ref={iframeRef} title={title} src={url} className={styles.flowsheet} />;
};

export default FlowsheetFrame;
