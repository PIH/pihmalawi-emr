import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ArtField } from '../art/art-fields';
import { type ArtEncounter, useCardEncounters } from '../art/art.resource';
import { type Column, EncounterTable, fieldCells, TableCard } from '../shared/ncd-card';
import { launchPdcSharedPanel, useLaunchPdcSharedPanel } from './launch-pdc-shared-panel';
import { LENGTH_OF_STAY, PDC_SHARED_FIELDS, PDC_SHARED_FORMS, PDC_SHARED_TITLES, type PdcSharedForm } from './pdc-shared-forms';
import styles from '../care-page.scss';

/** What each table shows: the form's questions, and for hospitalisations the length of stay older ones hold */
const shownFields = (form: PdcSharedForm): Array<ArtField> =>
  form === 'hospitalisation' ? [...PDC_SHARED_FIELDS.hospitalisation, LENGTH_OF_STAY] : PDC_SHARED_FIELDS[form];

interface PdcSharedRecordsProps {
  patientUuid: string;
  /** The condition card showing them, e.g. pdc-developmental-delay */
  cardKey: string;
  /** Whether new ones can be recorded: the card has been started and may be changed */
  canRecord: boolean;
  /** Whether those recorded can be edited */
  canEdit: boolean;
}

/**
 * The records every PDC condition card shares: hospitalisations, complications, vision, hearing and radiology
 * screening, each a table of its encounters, recorded and edited in its own panel
 */
const PdcSharedRecords: React.FC<PdcSharedRecordsProps> = ({ patientUuid, cardKey, canRecord, canEdit }) => {
  const { t } = useTranslation();
  const launch = useLaunchPdcSharedPanel(patientUuid, cardKey);
  const encounters: Record<PdcSharedForm, Array<ArtEncounter>> = {
    hospitalisation: useCardEncounters(patientUuid, PDC_SHARED_FORMS.hospitalisation).encounters,
    complications: useCardEncounters(patientUuid, PDC_SHARED_FORMS.complications).encounters,
    vision: useCardEncounters(patientUuid, PDC_SHARED_FORMS.vision).encounters,
    hearing: useCardEncounters(patientUuid, PDC_SHARED_FORMS.hearing).encounters,
    radiology: useCardEncounters(patientUuid, PDC_SHARED_FORMS.radiology).encounters,
  };

  const table = (form: PdcSharedForm) => {
    const titles = PDC_SHARED_TITLES[form];
    const title = t(`pdcShared_${form}`, titles.title);
    const fields = shownFields(form);
    const columns: Array<Column> = [
      { key: 'date', header: t(`pdcShared_date_${form}`, titles.date) },
      ...fields.map((f) => ({ key: f.name, header: t(`pdcSharedField_${f.name}`, f.label) })),
    ];
    return (
      <TableCard key={form} title={title} onRecord={canRecord ? () => launch(form) : undefined}>
        <EncounterTable
          label={title}
          columns={columns}
          encounters={encounters[form]}
          cells={(e) => fieldCells(fields, e)}
          onEdit={canEdit ? (e) => launchPdcSharedPanel({ patientUuid, form, cardKey, encounterUuid: e.uuid }) : undefined}
          empty={t('notRecorded', 'Not recorded yet')}
        />
      </TableCard>
    );
  };

  return (
    <>
      <div className={styles.cards}>
        {table('hospitalisation')}
        {table('complications')}
      </div>
      <div className={styles.cards}>
        {table('vision')}
        {table('hearing')}
      </div>
      <div className={styles.cards}>{table('radiology')}</div>
    </>
  );
};

export default PdcSharedRecords;
