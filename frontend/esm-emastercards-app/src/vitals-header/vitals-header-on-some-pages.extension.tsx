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
 * Hides the patient banner's Show more / Show less button, which the banner (from the patient chart) shows on every
 * page: the button is the banner's one with the chevron icon
 */
export const HIDE_BANNER_DETAILS = ['down', 'up']
  .map((d) => `[data-extension-slot-name="patient-header-slot"] button:has(> svg > use[href="#omrs-icon-chevron-${d}"])`)
  .join(', ')
  .concat(' { display: none; }');

/**
 * Shows the chart's vitals and biometrics header, which is configured into pihmalawi-vitals-header-slot, on every
 * page but those configured in pagesWithoutVitalsHeader; and on the pages configured in pagesWithoutBannerDetails
 * (Programs, Enrolments, eMastercards and the card pages), hides the patient banner's Show more / Show less button
 */
const VitalsHeaderOnSomePages: React.FC<Record<string, unknown>> = (props) => {
  const { pagesWithoutVitalsHeader, pagesWithoutBannerDetails = [] } = useConfig<ConfigObject>();
  const page = useChartPage();
  const on = (pages: Array<string>) => pages.some((p) => p.toLowerCase() === page);
  return (
    <>
      {on(pagesWithoutBannerDetails) && <style data-testid="hide-banner-details">{HIDE_BANNER_DETAILS}</style>}
      {!on(pagesWithoutVitalsHeader) && <ExtensionSlot name="pihmalawi-vitals-header-slot" state={props} />}
    </>
  );
};

export default VitalsHeaderOnSomePages;
