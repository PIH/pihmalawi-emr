import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { checkPdcDates } from './hie-rules';
import { PDC_SHARED_FIELDS, PDC_SHARED_FORMS, PDC_SHARED_TITLES, type PdcSharedForm } from './pdc-shared-forms';

export interface PdcSharedWorkspaceProps {
  patientUuid: string;
  form: PdcSharedForm;
  /** The condition card it is recorded from, whose state decides whether it can be saved, e.g. pdc-developmental-delay */
  cardKey: string;
  /** The encounter to edit; a new one is recorded in the chart's current O3 visit, or on an earlier day */
  encounterUuid?: string;
}

/**
 * Records or edits one of the forms every PDC condition card shares (hospitalisation history, complications, vision,
 * hearing and radiology screening) natively, saving what its HTML form does
 */
const PdcSharedWorkspace: React.FC<Workspace2DefinitionProps<PdcSharedWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, form, cardKey, encounterUuid },
}) => {
  const { t } = useTranslation();
  const titles = PDC_SHARED_TITLES[form];
  const fields = PDC_SHARED_FIELDS[form];
  return (
    <ArtEncounterPanel
      form={PDC_SHARED_FORMS[form]}
      cardKey={cardKey}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t(`pdcShared_record_${form}`, titles.record), edit: t(`pdcShared_edit_${form}`, titles.edit) }}
      dateLabel={t(`pdcShared_date_${form}`, titles.date)}
      fields={fields}
      taggedLocations
      rules={(values) => checkPdcDates(fields, values)}
      closeWorkspace={closeWorkspace}
    />
  );
};

export default PdcSharedWorkspace;
