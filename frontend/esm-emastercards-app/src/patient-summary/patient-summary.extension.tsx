import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Button, MenuButton, MenuItem, Tag } from '@carbon/react';
import { ConfigurableLink, useConfig } from '@openmrs/esm-framework';
import { formatDay } from '../art/art-fields';
import { NATIVE_PAGES } from '../dashboard/emastercard-row.component';
import { cardName } from '../shared/card-group';
import { useEMastercards } from '../emastercards.resource';
import { useQuickPrograms } from '../enrolments/enrolments.resource';
import { formatObsDate, type LatestObs, useLatestBloodPressure, useLatestObs } from '../vitals-header/latest-obs.resource';
import { useRecordVitals } from '../vitals-header/latest-vitals.extension';
import { recordableCards, useLaunchCardVisit } from './record-visit';
import { careCardRows, dueItems, programRows, useHivSummary, useRecentVisits, visitGroups } from './summary.resource';
import styles from './patient-summary.scss';

const today = () => dayjs().format('YYYY-MM-DD');
/** A date as the summary shows it: Today, else e.g. 05-Aug-2026 */
const when = (date: string | null) => (!date ? null : String(date).slice(0, 10) === today() ? 'Today' : formatDay(date));

const Fact: React.FC<{ label: string; value: string | null; detail?: string | null }> = ({ label, value, detail }) => (
  <div className={styles.fact}>
    <span className={styles.label}>{label}</span>
    <span className={styles.factValue}>{value ?? '–'}</span>
    {value && detail ? <span className={styles.detail}>{detail}</span> : null}
  </div>
);

const Card: React.FC<{ title: string; link?: React.ReactNode; children: React.ReactNode }> = ({ title, link, children }) => (
  <section className={styles.card} aria-label={title}>
    <div className={styles.cardHeader}>
      <h4 className={styles.cardTitle}>{title}</h4>
      {link}
    </div>
    {children}
  </section>
);

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

const Stat: React.FC<{ label: string; value: string | null; unit?: string; detail?: string | null }> = ({ label, value, unit, detail }) => (
  <div className={styles.stat}>
    <span className={styles.label}>{label}</span>
    <span>
      <span className={styles.statValue}>{value ?? '--'}</span>
      {value != null && unit ? <span className={styles.statUnit}> {unit}</span> : null}
    </span>
    {value != null && detail ? <span className={styles.detail}>{detail}</span> : null}
  </div>
);

/** The latest vitals and biometrics in one long card, as in the mockup: each measure from when it was last recorded */
const VitalsCard: React.FC<{ patientUuid: string; vitalsPage: string }> = ({ patientUuid, vitalsPage }) => {
  const { t } = useTranslation();
  const { concepts: c } = useConfig<{ concepts: VitalsConcepts }>({ externalModuleName: '@openmrs/esm-patient-vitals-app' });
  const { bloodPressure } = useLatestBloodPressure(patientUuid, c?.systolicBloodPressureUuid, c?.diastolicBloodPressureUuid);
  const { latest } = useLatestObs(patientUuid, [
    c?.pulseUuid,
    c?.respiratoryRateUuid,
    c?.oxygenSaturationUuid,
    c?.temperatureUuid,
    c?.weightUuid,
    c?.heightUuid,
    c?.midUpperArmCircumferenceUuid,
  ]);
  const obs = (uuid: string): LatestObs | undefined => latest.get(uuid);
  const value = (o: LatestObs | undefined) => (o && o.value != null ? String(o.value) : null);
  const dated = (o: { date: string } | undefined | null) =>
    o?.date ? (when(o.date) === 'Today' ? t('today', 'Today') : formatObsDate(o.date)) : null;
  const weight = obs(c?.weightUuid);
  const height = obs(c?.heightUuid);
  const bmi =
    weight && height && typeof weight.value === 'number' && typeof height.value === 'number' && height.value > 0
      ? (weight.value / (height.value / 100) ** 2).toFixed(1)
      : null;
  const stat = (label: string, uuid: string, unit: string) => <Stat label={label} value={value(obs(uuid))} unit={unit} detail={dated(obs(uuid))} />;
  return (
    <Card
      title={t('vitalsAndBiometrics', 'Vitals and biometrics')}
      link={<ConfigurableLink to={vitalsPage}>{t('vitalsHistory', 'Vitals history')}</ConfigurableLink>}
    >
      <div className={styles.vitals}>
        <Stat
          label={t('bp', 'BP')}
          value={bloodPressure ? `${bloodPressure.systolic.value}/${bloodPressure.diastolic.value}` : null}
          unit="mmHg"
          detail={bloodPressure ? dated(bloodPressure.systolic) : null}
        />
        {stat(t('pulse', 'Pulse'), c?.pulseUuid, 'bpm')}
        {stat(t('respiratoryRate', 'R. rate'), c?.respiratoryRateUuid, '/min')}
        {stat(t('spo2', 'SpO2'), c?.oxygenSaturationUuid, '%')}
        {stat(t('temperature', 'Temp'), c?.temperatureUuid, '°C')}
        {stat(t('weight', 'Weight'), c?.weightUuid, 'kg')}
        {stat(t('height', 'Height'), c?.heightUuid, 'cm')}
        <Stat label={t('bmi', 'BMI')} value={bmi} unit="kg/m²" detail={bmi ? t('calculated', 'Calculated') : null} />
        {stat(t('muac', 'MUAC'), c?.midUpperArmCircumferenceUuid, 'cm')}
      </div>
    </Card>
  );
};

/**
 * The patient summary, as in the mockup: Record vitals and Record visit (on any of the patient's cards), the patient's latest vitals,
 * then each of their
 * eMastercards, their programs, their recent visits, what is due at this visit and, for patients on ART, HIV care
 */
const PatientSummary: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const recordVitals = useRecordVitals(patientUuid);
  const launchVisit = useLaunchCardVisit(patientUuid);
  const hiv = useHivSummary(patientUuid, today());
  const { cards } = useEMastercards(patientUuid);
  const { programs } = useQuickPrograms(patientUuid);
  const { visits } = useRecentVisits(patientUuid);
  const careCards = careCardRows(cards, today());
  const recordable = recordableCards(cards);
  const due = dueItems(cards, today());
  const rows = programRows(programs);
  const page = (path: string) => `\${openmrsSpaBase}/patient/${patientUuid}/chart/${path}`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h3 className={styles.title}>{t('patientSummary', 'Patient summary')}</h3>
        <div className={styles.actions}>
          <Button kind="tertiary" size="md" onClick={recordVitals}>
            {t('recordVitals', 'Record vitals')}
          </Button>
          {recordable.length > 0 && (
            <MenuButton label={t('recordVisit', 'Record visit')} kind="primary" size="md" menuAlignment="bottom-end">
              {recordable.map((c) => (
                <MenuItem key={c.key} label={t(`cardName_${c.key}`, cardName(c))} onClick={() => launchVisit(c.key)} />
              ))}
            </MenuButton>
          )}
        </div>
      </div>

      <VitalsCard patientUuid={patientUuid} vitalsPage={page('vitals-and-biometrics')} />

      <div className={styles.grid}>
        <Card
          title={t('careAndTreatment', 'Care and treatment')}
          link={<ConfigurableLink to={page('eMastercards')}>{t('allEMastercards', 'All eMastercards')}</ConfigurableLink>}
        >
          {careCards.length ? (
            <ul className={styles.rows}>
              {careCards.map((c) => {
                const path = NATIVE_PAGES[c.key]?.path;
                return (
                  <li key={c.key}>
                    <span className={styles.rowName}>{path ? <ConfigurableLink to={page(path)}>{c.name}</ConfigurableLink> : c.name}</span>
                    <span className={styles.rowDetail}>
                      {c.lastVisit ? t('lastVisitOn', 'Last visit {{date}}', { date: when(c.lastVisit) }) : t('noVisitYet', 'No visit yet')}
                      {c.appointment ? ` · ${t('nextOn', 'Next {{date}}', { date: when(c.appointment) })}` : ''}
                    </span>
                    {c.overdue && (
                      <Tag type="red" size="sm">
                        {t('overdue', 'Overdue')}
                      </Tag>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.empty}>{t('noEMastercards', 'No eMastercards yet')}</p>
          )}
        </Card>

        <Card
          title={t('activePrograms', 'Active programs')}
          link={<ConfigurableLink to={page('enrolments')}>{t('manageEnrolments', 'Manage enrolments')}</ConfigurableLink>}
        >
          {rows.length ? (
            <ul className={styles.rows}>
              {rows.map((r) => (
                <li key={r.key}>
                  <span className={r.active ? styles.rowName : `${styles.rowName} ${styles.ended}`}>{r.label}</span>
                  <span className={styles.rowDetail}>
                    {r.details.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </span>
                  <Tag type={r.active ? 'green' : 'gray'} size="sm">
                    {r.active ? t('active', 'Active') : t('completed', 'Completed')}
                  </Tag>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{t('noPrograms', 'Not enrolled in any program')}</p>
          )}
        </Card>

        <Card
          title={t('recentVisits', 'Recent visits')}
          link={<ConfigurableLink to={page('Visits')}>{t('allVisits', 'All visits')}</ConfigurableLink>}
        >
          {visits.length ? (
            <ul className={styles.rows}>
              {visits.map((v) => {
                const groups = visitGroups(v, cards);
                return (
                  <li key={v.uuid}>
                    <span className={styles.rowName}>
                      {when(v.startDatetime)}
                      <span className={styles.visitTime}>{dayjs(v.startDatetime).format('HH:mm')}</span>
                    </span>
                    <span className={styles.rowDetail}>
                      <span className={styles.visitType}>{[v.visitType?.display, v.location?.display].filter(Boolean).join(' · ')}</span>
                      <span>
                        {groups.length
                          ? groups.map((g) => (g.forms > 1 ? `${g.name} (${g.forms})` : g.name)).join(', ')
                          : t('nothingRecorded', 'Nothing recorded')}
                      </span>
                    </span>
                    <Tag type={v.stopDatetime ? 'gray' : 'blue'} size="sm">
                      {v.stopDatetime ? t('ended', 'Ended') : t('inProgressTag', 'In progress')}
                    </Tag>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.empty}>{t('noVisits', 'No visits yet')}</p>
          )}
        </Card>

        <Card title={t('dueAtThisVisit', 'Due at this visit')}>
          {due.length ? (
            <ul className={styles.rows}>
              {due.map((d) => (
                <li key={d.key}>
                  <span className={styles.rowText}>{d.label}</span>
                  <Tag type={d.status === 'today' ? 'blue' : 'red'} size="sm">
                    {d.status === 'today' ? t('today', 'Today') : t('overdue', 'Overdue')}
                  </Tag>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{t('nothingDue', 'Nothing due today')}</p>
          )}
        </Card>

        {hiv && (
          <Card title={t('hivCare', 'HIV Care')} link={<ConfigurableLink to={page('hivCare')}>{t('openArtCard', 'Open ART card')}</ConfigurableLink>}>
            <div className={styles.facts}>
              <Fact
                label={t('currentRegimen', 'Current regimen')}
                value={hiv.regimen?.regimen ? [hiv.regimen.regimen.label, hiv.regimen.regimen.drugs].filter(Boolean).join(' · ') : null}
                detail={hiv.regimen ? t('sinceDate', 'Since {{date}}', { date: formatDay(hiv.regimen.since) }) : null}
              />
              <Fact
                label={t('artStartDate', 'ART start date')}
                value={formatDay(hiv.artStart)}
                detail={hiv.yearsOnArt != null ? t('yearsOnArt', '{{count}} years on ART', { count: hiv.yearsOnArt }) : null}
              />
              <Fact
                label={t('lastViralLoad', 'Last viral load')}
                value={hiv.latestViralLoad?.result ?? null}
                detail={formatDay(hiv.latestViralLoad?.date)}
              />
              <Fact
                label={t('cd4Count', 'CD4 count')}
                value={hiv.cd4 ? `${hiv.cd4.value} cells/µL` : null}
                detail={hiv.cd4 ? formatDay(hiv.cd4.date) : null}
              />
              <Fact
                label={t('adherencePillCount', 'Adherence (pill count)')}
                value={hiv.adherence != null ? `${hiv.adherence}%` : null}
                detail={t('lastVisit', 'Last visit')}
              />
              <Fact label={t('nextAppointment', 'Next appointment')} value={when(hiv.nextAppointment)} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatientSummary;
