import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { type QuickProgram, availableActions, formatDate, launchEnrolmentPanel } from './enrolments.resource';
import styles from './enrolments.scss';

interface ProgramCardProps {
  program: QuickProgram;
  patientUuid: string;
}

/** One Quick Programs program: where the patient is in it, and buttons for what can be done there */
const ProgramCard: React.FC<ProgramCardProps> = ({ program, patientUuid }) => {
  const { t } = useTranslation();
  const actions = availableActions(program);
  const headingId = `enrolment-program-${program.key}`;
  const last = program.lastEnrolment;

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h4 id={headingId} className={styles.cardTitle}>
        {program.label}
      </h4>
      {program.enrolment ? (
        <>
          <p className={styles.line}>
            {t('enrolledOn', 'Enrolled {{date}} at {{location}}', {
              date: formatDate(program.enrolment.dateEnrolled),
              location: program.enrolment.location?.display ?? '',
            })}
          </p>
          {program.workflows
            .filter((w) => w.currentState)
            .map((w) => (
              <p key={w.uuid} className={styles.line}>
                {program.multipleWorkflows
                  ? t('workflowState', '{{workflow}}: {{state}} since {{date}}', {
                      workflow: w.name,
                      state: w.currentState.name,
                      date: formatDate(w.currentState.startDate),
                    })
                  : t('state', '{{state}} since {{date}}', {
                      state: w.currentState.name,
                      date: formatDate(w.currentState.startDate),
                    })}
              </p>
            ))}
        </>
      ) : (
        <>
          <p className={styles.line}>{t('notEnrolled', 'Not enrolled')}</p>
          {last ? (
            <p className={styles.line}>
              {t('lastEnrolment', 'Last enrolled {{enrolled}} at {{location}}, ended {{ended}} ({{exitState}})', {
                enrolled: formatDate(last.dateEnrolled),
                location: last.location?.display ?? '',
                ended: last.dateCompleted ? formatDate(last.dateCompleted) : '',
                exitState: last.exitState?.name ?? '',
              })}
            </p>
          ) : null}
        </>
      )}
      {!program.available ? <p className={styles.line}>{t('notAvailable', 'Not available')}</p> : null}
      <div className={styles.actions}>
        {actions.enrol ? (
          <Button size="sm" kind="tertiary" onClick={() => launchEnrolmentPanel(program, 'enrol', patientUuid)}>
            {t('enrol', 'Enrol')}
          </Button>
        ) : null}
        {actions.setState ? (
          <Button size="sm" kind="tertiary" onClick={() => launchEnrolmentPanel(program, 'enrol', patientUuid)}>
            {t('setState', 'Set state')}
          </Button>
        ) : null}
        {actions.change ? (
          <Button size="sm" kind="tertiary" onClick={() => launchEnrolmentPanel(program, 'change', patientUuid)}>
            {t('changeState', 'Change state')}
          </Button>
        ) : null}
        {actions.addCondition ? (
          <Button size="sm" kind="tertiary" onClick={() => launchEnrolmentPanel(program, 'enrol', patientUuid)}>
            {t('addCondition', 'Add condition')}
          </Button>
        ) : null}
        {actions.exit ? (
          <Button size="sm" kind="ghost" onClick={() => launchEnrolmentPanel(program, 'exit', patientUuid)}>
            {t('exit', 'Exit')}
          </Button>
        ) : null}
      </div>
    </section>
  );
};

export default ProgramCard;
