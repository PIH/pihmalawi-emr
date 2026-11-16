import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { checkNcdHeader, LIMITS, rangeRules } from '../shared/ncd';
import { type NcdEncounterWorkspaceProps } from '../shared/ncd-encounter-workspace';
import { NcdHeaderPanel } from '../shared/ncd-header-panel';
import { checkPdcDates } from './hie-rules';
import { conditionKey, type PdcCondition } from './pdc-condition';

export interface PdcHeaderWorkspaceProps {
  patientUuid: string;
  section: string;
}

/**
 * A PDC condition card's header panel: edits one section of the single initial encounter its header form saves, with
 * the NCD headers' rules (the follow-up agreement it requires, no future dates). Until the header exists, the card
 * is started with all its sections.
 */
export function pdcHeaderWorkspace(condition: PdcCondition): React.FC<Workspace2DefinitionProps<PdcHeaderWorkspaceProps>> {
  const config = {
    cardKey: condition.key,
    form: condition.forms.header,
    sections: condition.headerSections,
    startSections: Object.keys(condition.headerSections),
    i18nPrefix: `${condition.prefix}Section_`,
    checkHeader: checkNcdHeader,
    diagnosisNames: '',
    cardName: condition.cardName,
  };
  const Workspace: React.FC<Workspace2DefinitionProps<PdcHeaderWorkspaceProps>> = (props) => <NcdHeaderPanel {...props} config={config} />;
  return Workspace;
}

/**
 * A PDC condition card's lab tests panel: records or edits the encounter its lab form saves, refusing future dates
 * (a result's own date, e.g. HB's or TSH's, included) and each number outside its concept's limits
 */
export function pdcLabsWorkspace(condition: PdcCondition): React.FC<Workspace2DefinitionProps<NcdEncounterWorkspaceProps>> {
  const fields = condition.labs.fields;
  const limited = fields.filter((f) => f.name in LIMITS).map((f) => f.name);
  const Workspace: React.FC<Workspace2DefinitionProps<NcdEncounterWorkspaceProps>> = ({
    closeWorkspace,
    workspaceProps: { patientUuid, encounterUuid },
  }) => {
    const { t } = useTranslation();
    return (
      <ArtEncounterPanel
        form={condition.forms.labs}
        cardKey={condition.key}
        patientUuid={patientUuid}
        encounterUuid={encounterUuid}
        title={{
          record: t(conditionKey(condition, 'record{P}LabTests'), 'Record laboratory tests'),
          edit: t(conditionKey(condition, 'edit{P}LabTests'), 'Edit laboratory tests'),
        }}
        fields={fields}
        taggedLocations
        rules={(values) => ({ ...checkPdcDates(fields, values), ...rangeRules(values, limited) })}
        live={limited}
        closeWorkspace={closeWorkspace}
      />
    );
  };
  return Workspace;
}
