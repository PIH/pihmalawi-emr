import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification } from '@carbon/react';
import { useQuickPrograms } from './enrolments.resource';
import ProgramCard from './program-card.component';
import styles from './enrolments.scss';

interface EnrolmentsDashboardProps {
  patientUuid: string;
}

/** The patient's Quick Programs, one card per program, in the legacy dashboard's order */
const EnrolmentsDashboard: React.FC<EnrolmentsDashboardProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { programs, error, isLoading } = useQuickPrograms(patientUuid);

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }
  if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('loadEnrolmentsError', 'Could not load the enrolments')}
        subtitle={error.message}
      />
    );
  }
  return (
    <div className={styles.dashboard}>
      <h3 className={styles.title}>{t('enrolments', 'Enrolments')}</h3>
      <div className={styles.grid}>
        {programs.map((program) => (
          <ProgramCard key={program.key} program={program} patientUuid={patientUuid} />
        ))}
      </div>
    </div>
  );
};

export default EnrolmentsDashboard;
