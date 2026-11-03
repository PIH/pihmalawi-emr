import useSWR from 'swr';
import dayjs from 'dayjs';
import { fhirBaseUrl, openmrsFetch } from '@openmrs/esm-framework';

/** One observation, as read from a FHIR Observation */
export interface LatestObs {
  code: string;
  value: number | boolean | null;
  unit: string | null;
  date: string;
  encounter: string | null;
}

interface FhirObservation {
  code?: { coding?: Array<{ code?: string }> };
  effectiveDateTime?: string;
  encounter?: { reference?: string };
  valueQuantity?: { value?: number; unit?: string };
  valueBoolean?: boolean;
}

function toLatestObs(resource: FhirObservation): LatestObs {
  return {
    code: resource.code?.coding?.[0]?.code ?? '',
    value: resource.valueQuantity?.value ?? resource.valueBoolean ?? null,
    unit: resource.valueQuantity?.unit ?? null,
    date: resource.effectiveDateTime,
    encounter: resource.encounter?.reference?.replace('Encounter/', '') ?? null,
  };
}

function observationsUrl(patientUuid: string, codes: Array<string>, count: number) {
  return `${fhirBaseUrl}/Observation?subject:Patient=${patientUuid}&code=${codes.join(',')}&_sort=-date&_count=${count}`;
}

async function fetchObservations(url: string): Promise<Array<LatestObs>> {
  const res = await openmrsFetch<{ entry?: Array<{ resource: FhirObservation }> }>(url);
  return (res.data?.entry ?? []).map((e) => toLatestObs(e.resource));
}

/**
 * The patient's latest observation of each concept, read one concept at a time so that one concept recorded often
 * can't push another out of the results
 */
export function useLatestObs(patientUuid: string, conceptUuids: Array<string>) {
  const codes = conceptUuids.filter(Boolean);
  const { data, isLoading, error } = useSWR(
    patientUuid && codes.length ? ['pihmalawi-latest-obs', patientUuid, ...codes] : null,
    () =>
      Promise.all(codes.map((code) => fetchObservations(observationsUrl(patientUuid, [code], 1)))).then((results) => {
        const latest = new Map<string, LatestObs>();
        results.forEach((obs, i) => obs[0] && latest.set(codes[i], obs[0]));
        return latest;
      }),
  );
  return { latest: data ?? new Map<string, LatestObs>(), isLoading, error };
}

/**
 * The patient's latest blood pressure recorded as a pair: the most recent encounter with both a systolic and a
 * diastolic reading, which is what the vitals table shows
 */
export function useLatestBloodPressure(patientUuid: string, systolicUuid: string, diastolicUuid: string) {
  const { data, isLoading, error } = useSWR(
    patientUuid && systolicUuid && diastolicUuid
      ? observationsUrl(patientUuid, [systolicUuid, diastolicUuid], 100)
      : null,
    fetchObservations,
  );
  let pair: { systolic: LatestObs; diastolic: LatestObs } | null = null;
  for (const systolic of (data ?? []).filter((o) => o.code === systolicUuid)) {
    const diastolic = data.find((o) => o.code === diastolicUuid && o.encounter === systolic.encounter);
    if (diastolic) {
      pair = { systolic, diastolic };
      break;
    }
  }
  return { bloodPressure: pair, isLoading, error };
}

export function formatObsDate(date: string) {
  return dayjs(date).format('DD-MMM-YYYY');
}
