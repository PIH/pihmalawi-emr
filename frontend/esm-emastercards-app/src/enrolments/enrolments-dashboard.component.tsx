import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, MenuButton, MenuItem } from '@carbon/react';
import { availableActions, launchEnrolmentPanel, useQuickPrograms } from './enrolments.resource';
import ProgramCard from './program-card.component';
import styles from './enrolments.scss';

interface EnrolmentsDashboardProps {
  patientUuid: string;
}

/**
 * The patient's Quick Programs, in the legacy dashboard's order: a card for each program they are in, then each they
 * have left, then one card listing the programs they were never enrolled in
 */
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
  const active = programs.filter((p) => p.enrolment);
  const ended = programs.filter((p) => !p.enrolment && p.lastEnrolment);
  const never = programs.filter((p) => !p.enrolment && !p.lastEnrolment);
  const enrollable = programs.filter((p) => availableActions(p).enrol);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h3 className={styles.title}>{t('enrolments', 'Enrolments')}</h3>
        {enrollable.length > 0 && (
          <MenuButton label={t('enrolInAProgram', 'Enrol in a program')} kind="tertiary" size="md" menuAlignment="bottom-end">
            {enrollable.map((p) => (
              <MenuItem key={p.key} label={p.label} onClick={() => launchEnrolmentPanel(p, 'enrol', patientUuid)} />
            ))}
          </MenuButton>
        )}
      </div>
      <div className={styles.grid}>
        {[...active, ...ended].map((program) => (
          <ProgramCard key={program.key} program={program} patientUuid={patientUuid} />
        ))}
        {never.length > 0 && (
          <section className={styles.card} aria-label={t('notEnrolled', 'Not enrolled')}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>{t('notEnrolled', 'Not enrolled')}</h4>
            </div>
            <ul className={styles.notEnrolled}>
              {never.map((p) => (
                <li key={p.key}>
                  <span>{p.label}</span>
                  {availableActions(p).enrol ? (
                    <Button
                      size="sm"
                      kind="ghost"
                      aria-label={t('enrolIn', 'Enrol in {{program}}', { program: p.label })}
                      onClick={() => launchEnrolmentPanel(p, 'enrol', patientUuid)}
                    >
                      {t('enrol', 'Enrol')}
                    </Button>
                  ) : (
                    <span className={styles.note}>{t('notAvailable', 'Not available')}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default EnrolmentsDashboard;
