import React, { useMemo } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { openmrsFetch, restBaseUrl, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ART_FORMS, VIRAL_LOAD } from './art-concepts';
import { VIRAL_LOAD_FIELDS } from './art-fields';
import { clearViralLoadResults } from './art-rules';
import { ArtEncounterPanel } from './art-encounter-panel';
import { type FieldValue } from './obs-diff';

export interface ViralLoadWorkspaceProps {
  patientUuid: string;
  encounterUuid?: string;
}

/** The lab locations, which viral-load-tests.xml offers from the concept's own answers */
function useLabLocations() {
  const { data } = useSWR(`${restBaseUrl}/concept/${VIRAL_LOAD.labLocation}?v=custom:(answers:(uuid,display))`, (url: string) =>
    openmrsFetch<{ answers: Array<{ uuid: string; display: string }> }>(url).then((res) => res.data?.answers ?? []),
  );
  return data ?? [];
}

const hasResult = (values: Record<string, FieldValue>) =>
  (values.result !== null && values.result !== undefined) ||
  (values.lessThanLimit !== null && values.lessThanLimit !== undefined) ||
  values.ldl === true;

/** Records or edits a viral load test as viral-load-tests.xml does, its results clearing each other */
const ViralLoadWorkspace: React.FC<Workspace2DefinitionProps<ViralLoadWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  const labLocations = useLabLocations();
  const fields = useMemo(
    () =>
      VIRAL_LOAD_FIELDS.map((f) =>
        f.name === 'labLocation' ? { ...f, options: labLocations.map((l) => ({ value: l.uuid, label: l.display })) } : f,
      ),
    [labLocations],
  );

  return (
    <ArtEncounterPanel
      form={ART_FORMS.viralLoad}
      cardKey="art"
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t('recordViralLoad', 'Record viral load'), edit: t('editViralLoad', 'Edit viral load') }}
      fields={fields}
      taggedLocations={false}
      onFieldChange={(name, values) => {
        const changed = { result: 'numeric', lessThanLimit: 'lessThan', ldl: 'ldl' }[name] as 'numeric' | 'lessThan' | 'ldl';
        if (!changed) {
          return values;
        }
        const cleared = clearViralLoadResults(changed, {
          result: values.result as number,
          lessThanLimit: values.lessThanLimit as number,
          ldl: values.ldl === true,
        });
        return { ...values, ...cleared, ldl: cleared.ldl ? true : null };
      }}
      isShown={(f, values) => f.name !== 'noResultReason' || !hasResult(values)}
      closeWorkspace={closeWorkspace}
    />
  );
};

export default ViralLoadWorkspace;
