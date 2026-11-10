import React, { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading } from '@carbon/react';
import { ConfigurableLink, useConfig } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { type LatestObs, formatObsDate, useLatestBloodPressure, useLatestObs } from './latest-obs.resource';
import styles from './vitals-header.scss';

interface VitalsConcepts {
  systolicBloodPressureUuid: string;
  diastolicBloodPressureUuid: string;
  pulseUuid: string;
  temperatureUuid: string;
  oxygenSaturationUuid: string;
  respiratoryRateUuid: string;
  heightUuid: string;
  weightUuid: string;
  midUpperArmCircumferenceUuid: string;
}

export const VitalsItem: React.FC<{ label: string; value: string | null; date: string | null }> = ({ label, value, date }) => (
  <div className={styles.item}>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value ?? '--'}</span>
    {value && date ? <span className={styles.date}>{formatObsDate(date)}</span> : null}
  </div>
);

function withUnit(obs: LatestObs | undefined) {
  return obs && obs.value != null ? [obs.value, obs.unit].filter((v) => v != null && v !== '').join(' ') : null;
}

/**
 * Opens the vitals app's own vitals and biometrics form, as its header does: after starting a visit, if the patient
 * has none. Saving refreshes the chart, this header included.
 */
export function useRecordVitals(patientUuid: string) {
  const { patient, visitContext, mutateVisitContext } = usePatientChartStore(patientUuid);
  const { mutate } = useSWRConfig();
  const launch = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-vitals-biometrics-form-workspace');
  return useCallback(
    () =>
      launch(
        {},
        {},
        {
          patient,
          patientUuid,
          visitContext,
          mutateVisitContext: () => {
            mutateVisitContext?.();
            mutate(() => true);
          },
        },
      ),
    [launch, mutate, mutateVisitContext, patient, patientUuid, visitContext],
  );
}

/**
 * The patient's latest vitals and biometrics, each measure from the most recent time it was recorded, with its date
 */
const LatestVitals: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { concepts } = useConfig<{ concepts: VitalsConcepts }>({ externalModuleName: '@openmrs/esm-patient-vitals-app' });
  const { bloodPressure, isLoading: loadingBp } = useLatestBloodPressure(
    patientUuid,
    concepts?.systolicBloodPressureUuid,
    concepts?.diastolicBloodPressureUuid,
  );
  const { latest, isLoading } = useLatestObs(patientUuid, [
    concepts?.pulseUuid,
    concepts?.temperatureUuid,
    concepts?.oxygenSaturationUuid,
    concepts?.respiratoryRateUuid,
    concepts?.weightUuid,
    concepts?.heightUuid,
    concepts?.midUpperArmCircumferenceUuid,
  ]);
  // ConfigurableLink fills in ${openmrsSpaBase}
  const vitalsPage = '${openmrsSpaBase}/patient/' + patientUuid + '/chart/vitals-and-biometrics';
  const recordVitals = useRecordVitals(patientUuid);

  if (isLoading || loadingBp) {
    return <InlineLoading className={styles.loading} description={t('loading', 'Loading...')} />;
  }

  const weight = latest.get(concepts.weightUuid);
  const height = latest.get(concepts.heightUuid);
  const bmi =
    weight && height && typeof weight.value === 'number' && typeof height.value === 'number' && height.value > 0
      ? (weight.value / (height.value / 100) ** 2).toFixed(1)
      : null;
  const bmiDate = weight && height ? (weight.date > height.date ? weight.date : height.date) : null;
  const bp = bloodPressure
    ? `${bloodPressure.systolic.value} / ${bloodPressure.diastolic.value}${bloodPressure.systolic.unit ? ` ${bloodPressure.systolic.unit}` : ''}`
    : null;
  const obs = (uuid: string) => latest.get(uuid);

  return (
    <div className={styles.strip}>
      <div className={styles.heading}>
        <span className={styles.title}>{t('vitalsAndBiometrics', 'Vitals and biometrics')}</span>
        <ConfigurableLink className={styles.link} to={vitalsPage}>
          {t('vitalsHistory', 'Vitals history')}
        </ConfigurableLink>
        <Button className={styles.recordVitals} kind="ghost" size="sm" onClick={recordVitals}>
          {t('recordVitals', 'Record vitals')}
        </Button>
      </div>
      <div className={styles.grid}>
        <VitalsItem label={t('bp', 'BP')} value={bp} date={bloodPressure?.systolic.date ?? null} />
        <VitalsItem label={t('heartRate', 'Heart rate')} value={withUnit(obs(concepts.pulseUuid))} date={obs(concepts.pulseUuid)?.date} />
        <VitalsItem label={t('respiratoryRate', 'R. rate')} value={withUnit(obs(concepts.respiratoryRateUuid))} date={obs(concepts.respiratoryRateUuid)?.date} />
        <VitalsItem label={t('spo2', 'SpO2')} value={withUnit(obs(concepts.oxygenSaturationUuid))} date={obs(concepts.oxygenSaturationUuid)?.date} />
        <VitalsItem label={t('temperature', 'Temp')} value={withUnit(obs(concepts.temperatureUuid))} date={obs(concepts.temperatureUuid)?.date} />
        <VitalsItem label={t('weight', 'Weight')} value={withUnit(weight)} date={weight?.date} />
        <VitalsItem label={t('height', 'Height')} value={withUnit(height)} date={height?.date} />
        <VitalsItem label={t('bmi', 'BMI')} value={bmi ? `${bmi} kg/m²` : null} date={bmiDate} />
        <VitalsItem label={t('muac', 'MUAC')} value={withUnit(obs(concepts.midUpperArmCircumferenceUuid))} date={obs(concepts.midUpperArmCircumferenceUuid)?.date} />
      </div>
    </div>
  );
};

export default LatestVitals;
