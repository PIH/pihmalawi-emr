import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { checkNextAppointment } from '../art/art-rules';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { MH_CARD_KEY, MH_FORMS } from './mh-concepts';
import { MH_SCREENING_FIELDS } from './mh-fields';
import { changeField, leaderOf } from './grouped-fields';

export interface MhScreeningWorkspaceProps {
  patientUuid: string;
  /** The screening to edit; a new one is recorded in the chart's current O3 visit */
  encounterUuid?: string;
}

/**
 * Records or edits a mental health screening natively, saving the encounter mental-health-screening.xml saves, with
 * the flowsheet's required next appointment
 */
const MhScreeningWorkspace: React.FC<Workspace2DefinitionProps<MhScreeningWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      form={MH_FORMS.screening}
      cardKey={MH_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t('recordScreening', 'Record screening'), edit: t('editScreening', 'Edit screening') }}
      fields={MH_SCREENING_FIELDS}
      taggedLocations
      // an "Other" answer's text shows once it is ticked, and goes when it is unticked
      isShown={(f, values) => {
        const leader = leaderOf(f, MH_SCREENING_FIELDS);
        return !leader || !!values[leader.name];
      }}
      onFieldChange={(name, values) => {
        const field = MH_SCREENING_FIELDS.find((f) => f.name === name);
        return changeField(MH_SCREENING_FIELDS, values, field, values[name]);
      }}
      rules={(values, date) => ({ nextAppointment: checkNextAppointment(values.nextAppointment as string, date) })}
      closeWorkspace={closeWorkspace}
    />
  );
};

export default MhScreeningWorkspace;
