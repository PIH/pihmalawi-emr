import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tag } from '@carbon/react';
import { ConfigurableLink } from '@openmrs/esm-framework';
import { type QuickProgram, availableActions, formatDate, launchEnrolmentPanel } from './enrolments.resource';
import styles from './enrolments.scss';

/** The chart page each program's cards are on, by program key */
const PROGRAM_PAGES: Record<string, { path: string; title: string }> = {
  hiv: { path: 'hivCare', title: 'HIV Care' },
  'teen-club': { path: 'hivCare?card=teen-club', title: 'HIV Care' },
  'chronic-care': { path: 'chronicCare', title: 'Chronic Care' },
  'mental-health': { path: 'mentalHealth', title: 'Mental Health' },
  pdc: { path: 'pediatricDevelopment', title: 'Pediatric Development (PDC)' },
};

interface ProgramCardProps {
  program: QuickProgram;
  patientUuid: string;
}

/**
 * A program the patient is or was enrolled in: Active, with each workflow's state, since when, where and the chart
 * page of its cards; or Completed, with the outcome and dates. Its actions are what Quick Programs offers.
 */
const ProgramCard: React.FC<ProgramCardProps> = ({ program, patientUuid }) => {
  const { t } = useTranslation();
  const actions = availableActions(program);
  const enrolment = program.enrolment;
  const last = program.lastEnrolment;
  const page = PROGRAM_PAGES[program.key];
  const launch = (mode: 'enrol' | 'change' | 'exit') => () => launchEnrolmentPanel(program, mode, patientUuid);
  const states = program.workflows.filter((w) => w.currentState);

  const rows: Array<[string, React.ReactNode]> = enrolment
    ? [
        ...(program.multipleWorkflows
          ? states.map((w): [string, React.ReactNode] => [w.name, `${w.currentState.name} · ${formatDate(w.currentState.startDate)}`])
          : states.flatMap((w): Array<[string, React.ReactNode]> => [
              [t('programState', 'State'), w.currentState.name],
              [t('programSince', 'Since'), formatDate(w.currentState.startDate)],
            ])),
        [t('programEnrolled', 'Enrolled'), formatDate(enrolment.dateEnrolled)],
        [t('location', 'Location'), enrolment.location?.display ?? '–'],
        ...(page
          ? [
              [
                t('programPage', 'Page'),
                <ConfigurableLink key="page" to={`\${openmrsSpaBase}/patient/${patientUuid}/chart/${page.path}`}>
                  {t(`programPage_${program.key}`, page.title)}
                </ConfigurableLink>,
              ] as [string, React.ReactNode],
            ]
          : []),
      ]
    : [
        // completed with no exit state or outcome recorded, e.g. from the Programs tab of a program without outcomes
        [t('outcome', 'Outcome'), last?.exitState?.name ?? (last?.dateCompleted ? t('treatmentCompleted', 'Treatment completed') : '–')],
        [t('dates', 'Dates'), `${formatDate(last.dateEnrolled)} – ${last.dateCompleted ? formatDate(last.dateCompleted) : ''}`],
        [t('location', 'Location'), last?.location?.display ?? '–'],
      ];

  return (
    <section className={styles.card} aria-label={program.label}>
      <div className={styles.cardHeader}>
        <h4 className={enrolment ? styles.cardTitle : `${styles.cardTitle} ${styles.ended}`}>{program.label}</h4>
        {enrolment ? (
          <Tag type="green" size="sm">
            {t('active', 'Active')}
          </Tag>
        ) : (
          <Tag type="gray" size="sm">
            {t('completed', 'Completed')}
          </Tag>
        )}
      </div>
      <dl className={styles.fields}>
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </React.Fragment>
        ))}
      </dl>
      {!program.available ? <p className={styles.note}>{t('notAvailable', 'Not available')}</p> : null}
      <div className={styles.actions}>
        {actions.enrol ? (
          <Button size="sm" kind="ghost" onClick={launch('enrol')}>
            {t('enrolAgain', 'Enrol again')}
          </Button>
        ) : null}
        {actions.setState ? (
          <Button size="sm" kind="ghost" onClick={launch('enrol')}>
            {t('setState', 'Set state')}
          </Button>
        ) : null}
        {actions.change ? (
          <Button size="sm" kind="ghost" onClick={launch('change')}>
            {t('changeState', 'Change state')}
          </Button>
        ) : null}
        {actions.addCondition ? (
          <Button size="sm" kind="ghost" onClick={launch('enrol')}>
            {t('addCondition', 'Add condition')}
          </Button>
        ) : null}
        {actions.exit ? (
          <Button size="sm" kind="danger--ghost" onClick={launch('exit')}>
            {t('exitProgram', 'Exit program')}
          </Button>
        ) : null}
      </div>
    </section>
  );
};

export default ProgramCard;
