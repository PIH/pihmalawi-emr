import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension } from '@openmrs/esm-framework';

/** The eMastercards entry in the patient chart's left navigation */
const EMastercardsDashboardLink: React.FC<{ basePath: string }> = ({ basePath }) => (
  <BrowserRouter>
    <DashboardExtension basePath={basePath} title="eMastercards" path="eMastercards" icon="omrs-icon-programs" />
  </BrowserRouter>
);

export default EMastercardsDashboardLink;
