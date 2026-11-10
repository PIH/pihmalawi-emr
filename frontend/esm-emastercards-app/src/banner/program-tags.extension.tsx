import React from 'react';
import { Tag } from '@carbon/react';
import { age, formatPartialDate } from '@openmrs/esm-framework';
import { useQuickPrograms } from '../enrolments/enrolments.resource';
import { inPatientChart, PROGRAM_TAG_TYPES, programTagName } from './banner.resource';
import styles from './banner.scss';

/**
 * Beside the patient's name and gender in the chart's banner, as in the mockup: their age and birth date, then a tag
 * for each program they are enrolled in
 */
const ProgramTags: React.FC<{ patientUuid: string; patient?: fhir.Patient }> = ({ patientUuid, patient }) => {
  const chart = inPatientChart();
  const { programs } = useQuickPrograms(chart ? patientUuid : null);
  if (!chart) {
    return null;
  }
  const enrolled = programs.filter((p) => p.enrolment);
  return (
    <>
      {patient?.birthDate && (
        <span className={styles.demographics}>
          · {age(patient.birthDate)} · {formatPartialDate(patient.birthDate, { time: false })}
        </span>
      )}
      {enrolled.map((p) => (
        <Tag key={p.key} type={(PROGRAM_TAG_TYPES[p.key] ?? 'gray') as 'gray'} size="sm">
          {programTagName(p.label)}
        </Tag>
      ))}
    </>
  );
};

export default ProgramTags;
