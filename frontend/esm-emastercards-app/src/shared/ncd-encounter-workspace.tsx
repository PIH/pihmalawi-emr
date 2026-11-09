import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type ArtField } from '../art/art-fields';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { type CardForm } from '../art/obs-diff';
import { checkRange, LIMITS } from './ncd';

export interface NcdEncounterWorkspaceProps {
  patientUuid: string;
  /** The encounter to edit; a new one is recorded in the chart's current O3 visit, or on an earlier day */
  encounterUuid?: string;
}

/**
 * A side panel for one of an NCD card's simpler forms (imaging, laboratory tests, hospitalisations): it records or
 * edits the form's encounter as the HTML form does, each number within its concept's limits as it is typed
 */
export function ncdEncounterWorkspace({
  cardKey,
  form,
  fields,
  record,
  edit,
}: {
  cardKey: string;
  form: CardForm;
  fields: Array<ArtField>;
  /** The panel's titles, with their translation keys */
  record: [string, string];
  edit: [string, string];
}): React.FC<Workspace2DefinitionProps<NcdEncounterWorkspaceProps>> {
  const limited = fields.filter((f) => f.name in LIMITS).map((f) => f.name);
  const Workspace: React.FC<Workspace2DefinitionProps<NcdEncounterWorkspaceProps>> = ({
    closeWorkspace,
    workspaceProps: { patientUuid, encounterUuid },
  }) => {
    const { t } = useTranslation();
    return (
      <ArtEncounterPanel
        form={form}
        cardKey={cardKey}
        patientUuid={patientUuid}
        encounterUuid={encounterUuid}
        title={{ record: t(...record), edit: t(...edit) }}
        fields={fields}
        taggedLocations
        rules={(values) => Object.fromEntries(limited.map((n) => [n, checkRange(n, values[n])]))}
        live={limited}
        closeWorkspace={closeWorkspace}
      />
    );
  };
  return Workspace;
}
