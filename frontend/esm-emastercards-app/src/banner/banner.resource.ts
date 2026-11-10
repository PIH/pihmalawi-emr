/** Whether the banner is the patient chart's: the tags and address are shown there, not in patient search results */
export const inPatientChart = () => /\/patient\/[^/]+\/chart/.test(window.location.pathname);

/** Each program's tag colour in the banner */
export const PROGRAM_TAG_TYPES: Record<string, string> = {
  hiv: 'blue',
  'teen-club': 'cyan',
  'chronic-care': 'purple',
  'mental-health': 'magenta',
  pdc: 'teal',
  'palliative-care': 'warm-gray',
  tb: 'cool-gray',
  nutrition: 'green',
};

/** A program's short name for its tag, e.g. HIV for the HIV Program */
export const programTagName = (label: string) => label.replace(/ Program$/i, '');

/** The patient's identifiers, each with its type, e.g. ARV Number NNO 91003 */
export function bannerIdentifiers(patient: fhir.Patient | undefined): Array<{ label: string; value: string }> {
  return (patient?.identifier ?? [])
    .filter((i) => i.value && i.use !== 'old')
    .map((i) => ({ label: i.type?.text ?? i.type?.coding?.[0]?.display ?? '', value: i.value }));
}

/** Where the patient lives, as Malawi addresses keep it: village, traditional authority and district */
export function addressLine(patient: fhir.Patient | undefined): string | null {
  const address = patient?.address?.find((a) => a.use !== 'old') ?? patient?.address?.[0];
  const parts = [
    address?.city ? `Village: ${address.city}` : null,
    address?.district ? `TA: ${address.district}` : null,
    address?.state ? `District: ${address.state}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Reshapes the chart's banner as in the mockup: its own details line (age, birth date and identifiers) gives way to
 * ours, which the age and birth date beside the name and the identifiers and address below replace
 */
export const BANNER_STYLE =
  '[data-extension-slot-name="patient-header-slot"] div:has(> [data-extension-slot-name="patient-banner-bottom-slot"]) > ' +
  ':not([data-extension-slot-name="patient-banner-bottom-slot"]) { display: none; }';
