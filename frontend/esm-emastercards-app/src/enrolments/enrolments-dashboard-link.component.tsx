import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension } from '@openmrs/esm-framework';

/** The Enrolments entry in the patient chart's left navigation */
const EnrolmentsDashboardLink: React.FC<{ basePath: string }> = ({ basePath }) => (
  <BrowserRouter>
    <DashboardExtension basePath={basePath} title="Enrolments" path="enrolments" icon="omrs-icon-programs" />
  </BrowserRouter>
);

export default EnrolmentsDashboardLink;
