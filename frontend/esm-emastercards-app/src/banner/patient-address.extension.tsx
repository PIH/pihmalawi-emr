import React from 'react';
import { addressLine, BANNER_STYLE, bannerIdentifiers, inPatientChart } from './banner.resource';
import styles from './banner.scss';

/**
 * The second line of the chart's banner, as in the mockup: each identifier with its type, then the patient's village,
 * traditional authority and district. It takes the place of the banner's own details line.
 */
const PatientDetails: React.FC<{ patient: fhir.Patient }> = ({ patient }) => {
  if (!inPatientChart()) {
    return null;
  }
  const address = addressLine(patient);
  return (
    <span className={styles.details}>
      <style data-testid="banner-style">{BANNER_STYLE}</style>
      {bannerIdentifiers(patient).map((i) => (
        <span key={`${i.label}-${i.value}`}>
          {i.label} <span className={styles.identifier}>{i.value}</span>
        </span>
      ))}
      {address && <span>{address}</span>}
    </span>
  );
};

export default PatientDetails;
