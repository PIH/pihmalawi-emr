import React, { useMemo } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { openmrsFetch, restBaseUrl, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { type NcdEncounterWorkspaceProps } from '../shared/ncd-encounter-workspace';
import { EC_CARD_KEY, EC_EID, EC_FORMS } from './ec-concepts';
import { EC_EID_FIELDS } from './ec-fields';

/** The lab locations, which eid-test-results.xml offers from the concept's own answers, as the viral load test does */
function useLabLocations() {
  const { data } = useSWR(`${restBaseUrl}/concept/${EC_EID.labLocation}?v=custom:(answers:(uuid,display))`, (url: string) =>
    openmrsFetch<{ answers: Array<{ uuid: string; display: string }> }>(url).then((res) => res.data?.answers ?? []),
  );
  return data ?? [];
}

/** Records or edits an EID test as eid-test-results.xml does, in its group; the test's date is the sample's */
const EcEidWorkspace: React.FC<Workspace2DefinitionProps<NcdEncounterWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  const labLocations = useLabLocations();
  const fields = useMemo(
    () =>
      EC_EID_FIELDS.map((f) => (f.name === 'labLocation' ? { ...f, options: labLocations.map((l) => ({ value: l.uuid, label: l.display })) } : f)),
    [labLocations],
  );
  return (
    <ArtEncounterPanel
      form={EC_FORMS.eid}
      cardKey={EC_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t('recordEidTest', 'Record EID test'), edit: t('editEidTest', 'Edit EID test') }}
      fields={fields}
      taggedLocations
      closeWorkspace={closeWorkspace}
    />
  );
};

export default EcEidWorkspace;
