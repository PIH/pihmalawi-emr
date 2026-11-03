import React, { useEffect, useState } from 'react';
import { ExtensionSlot, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';

/** The chart page in the current URL: the part after /chart/, or '' */
function currentChartPage() {
  const match = window.location.pathname.match(/\/chart\/([^/]+)/);
  return match ? decodeURIComponent(match[1]).toLowerCase() : '';
}

function useChartPage() {
  const [page, setPage] = useState(currentChartPage);
  useEffect(() => {
    const update = () => setPage(currentChartPage());
    window.addEventListener('single-spa:routing-event', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('single-spa:routing-event', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return page;
}

/**
 * Shows the chart's vitals and biometrics header, which is configured into pihmalawi-vitals-header-slot, on every
 * page but those configured in pagesWithoutVitalsHeader
 */
const VitalsHeaderOnSomePages: React.FC<Record<string, unknown>> = (props) => {
  const { pagesWithoutVitalsHeader } = useConfig<ConfigObject>();
  const page = useChartPage();
  if (pagesWithoutVitalsHeader.some((p) => p.toLowerCase() === page)) {
    return null;
  }
  return <ExtensionSlot name="pihmalawi-vitals-header-slot" state={props} />;
};

export default VitalsHeaderOnSomePages;
