import React from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { useLatestObs } from './latest-obs.resource';
import { VitalsItem } from './latest-vitals.extension';
import styles from './vitals-header.scss';

interface Enrollment {
  program: { uuid: string };
  dateCompleted: string | null;
  voided?: boolean;
}

function useInHivProgram(patientUuid: string, programUuid: string) {
  const { data } = useSWR(
    patientUuid ? `${restBaseUrl}/programenrollment?patient=${patientUuid}&v=custom:(program:(uuid),dateCompleted,voided)` : null,
    (url: string) => openmrsFetch<{ results: Array<Enrollment> }>(url).then((res) => res.data?.results ?? []),
  );
  return (data ?? []).some((e) => e.program?.uuid === programUuid && !e.dateCompleted && !e.voided);
}

/**
 * For patients in the HIV program, the latest viral load and CD4 count with their dates, as the legacy patient
 * dashboard's header showed them: the viral load is the latest numeric result, or LDL when a later test was below
 * detection
 */
const HivSummary: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { hiv } = useConfig<ConfigObject>();
  const inHivProgram = useInHivProgram(patientUuid, hiv.programUuid);
  const { latest } = useLatestObs(inHivProgram ? patientUuid : null, [
    hiv.viralLoadConceptUuid,
    hiv.viralLoadLdlConceptUuid,
    hiv.cd4CountConceptUuid,
  ]);
  if (!inHivProgram) {
    return null;
  }

  const numeric = latest.get(hiv.viralLoadConceptUuid);
  const ldl = latest.get(hiv.viralLoadLdlConceptUuid);
  const ldlCounts = ldl?.value === true && (!numeric || ldl.date > numeric.date);
  const viralLoad = ldlCounts
    ? { value: t('ldl', 'LDL'), date: ldl.date }
    : numeric?.value != null
      ? { value: [numeric.value, numeric.unit].filter(Boolean).join(' '), date: numeric.date }
      : null;
  const cd4 = latest.get(hiv.cd4CountConceptUuid);

  return (
    <div className={styles.hivLine}>
      <span className={styles.title}>{t('hiv', 'HIV')}</span>
      <div className={styles.grid}>
        <VitalsItem label={t('viralLoad', 'Viral load')} value={viralLoad?.value ?? null} date={viralLoad?.date ?? null} />
        <VitalsItem
          label={t('cd4Count', 'CD4 count')}
          value={cd4?.value != null ? [cd4.value, cd4.unit].filter(Boolean).join(' ') : null}
          date={cd4?.date ?? null}
        />
      </div>
    </div>
  );
};

export default HivSummary;
