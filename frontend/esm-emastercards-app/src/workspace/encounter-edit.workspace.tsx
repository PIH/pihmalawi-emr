import React, { useState } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Link } from '@carbon/react';
import { openmrsFetch, restBaseUrl, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { type EMastercardCard, flowsheetUrl, useEMastercards } from '../emastercards.resource';
import { findCardsForEncounter } from './find-cards-for-encounter';
import { artPanelForEncounter } from '../art/art-panel-for-encounter';
import { INITIAL_SECTIONS, type InitialSection } from '../art/art-fields';
import ArtVisitWorkspace from '../art/art-visit.workspace';
import ArtInitialWorkspace from '../art/art-initial.workspace';
import ViralLoadWorkspace from '../art/viral-load.workspace';
import FollowUpTestingWorkspace from '../art/follow-up-testing.workspace';
import { mhPanelForEncounter } from '../mental-health/mh-panel-for-encounter';
import { MH_HEADER_SECTIONS, type MhHeaderSection } from '../mental-health/mh-fields';
import MhVisitWorkspace from '../mental-health/mh-visit.workspace';
import MhScreeningWorkspace from '../mental-health/mh-screening.workspace';
import MhHeaderWorkspace from '../mental-health/mh-header.workspace';
import { epPanelForEncounter } from '../epilepsy/ep-panel-for-encounter';
import { EP_HEADER_SECTIONS, type EpHeaderSection } from '../epilepsy/ep-fields';
import EpVisitWorkspace from '../epilepsy/ep-visit.workspace';
import EpHeaderWorkspace from '../epilepsy/ep-header.workspace';
import { htnPanelForEncounter } from '../chronic-care/launch-htn-panel';
import { HTN_HEADER_SECTIONS, type HtnHeaderSection } from '../chronic-care/htn-fields';
import HtnHeaderWorkspace from '../chronic-care/htn-header.workspace';
import HtnVisitWorkspace from '../chronic-care/htn-visit.workspace';
import HtnQuarterlyLabsWorkspace from '../chronic-care/htn-quarterly-labs.workspace';
import HtnAnnualLabsWorkspace from '../chronic-care/htn-annual-labs.workspace';
import HtnHospitalisationWorkspace from '../chronic-care/htn-hospitalisation.workspace';
import { cldPanelForEncounter } from '../chronic-care/launch-cld-panel';
import { CLD_HEADER_SECTIONS, type CldHeaderSection } from '../chronic-care/cld-fields';
import CldHeaderWorkspace from '../chronic-care/cld-header.workspace';
import CldVisitWorkspace from '../chronic-care/cld-visit.workspace';
import CldPeakFlowWorkspace from '../chronic-care/cld-peak-flow.workspace';
import CldHospitalisationWorkspace from '../chronic-care/cld-hospitalisation.workspace';
import FlowsheetFrame from './flowsheet-frame.component';
import styles from './flowsheet.scss';

interface EncounterEditWorkspaceProps {
  form?: { uuid: string } | null;
  encounterUuid: string;
}

interface EncounterEditGroupProps {
  patientUuid: string;
}

interface Encounter {
  uuid: string;
  form: { uuid: string } | null;
  encounterType: { uuid: string } | null;
}

/**
 * Takes the place of the chart's form entry workspace, which "Edit this encounter" opens: ART, mental health, epilepsy and
 * hypertension and diabetes and chronic lung disease card encounters are edited in their native panel, and other Malawi encounters in the eMastercard they belong to, so this opens that
 * eMastercard's flowsheet
 */
const EncounterEditWorkspace: React.FC<
  Workspace2DefinitionProps<EncounterEditWorkspaceProps, object, EncounterEditGroupProps>
> = (props) => {
  const { closeWorkspace, workspaceProps: { encounterUuid }, groupProps } = props;
  const { t } = useTranslation();
  const patientUuid = groupProps?.patientUuid;
  const { data: encounter, error: encounterError } = useSWR(
    encounterUuid ? `${restBaseUrl}/encounter/${encounterUuid}?v=custom:(uuid,form:(uuid),encounterType:(uuid))` : null,
    (url: string) => openmrsFetch<Encounter>(url).then((res) => res.data),
  );
  const { cards, isLoading, error } = useEMastercards(patientUuid);
  const [chosen, setChosen] = useState<EMastercardCard | null>(null);
  const [dirty, setDirty] = useState(false);
  const close = () => closeWorkspace({ discardUnsavedChanges: true });

  const [section, setSection] = useState<InitialSection | null>(null);
  const artPanel = encounter ? artPanelForEncounter(encounter) : null;
  const [mhSection, setMhSection] = useState<MhHeaderSection | null>(null);
  const mhPanel = encounter ? mhPanelForEncounter(encounter) : null;
  const [epSection, setEpSection] = useState<EpHeaderSection | null>(null);
  const epPanel = encounter ? epPanelForEncounter(encounter) : null;
  const [htnSection, setHtnSection] = useState<HtnHeaderSection | null>(null);
  const htnPanel = encounter ? htnPanelForEncounter(encounter) : null;
  const [cldSection, setCldSection] = useState<CldHeaderSection | null>(null);
  const cldPanel = encounter ? cldPanelForEncounter(encounter) : null;

  if (cldPanel && patientUuid) {
    const encounterPanels = { visit: CldVisitWorkspace, peakFlow: CldPeakFlowWorkspace, hospitalisation: CldHospitalisationWorkspace };
    if (cldPanel !== 'header') {
      const Panel = encounterPanels[cldPanel];
      return <Panel {...props} workspaceProps={{ patientUuid, encounterUuid }} />;
    }
    if (cldSection) {
      return <CldHeaderWorkspace {...props} workspaceProps={{ patientUuid, section: cldSection }} />;
    }
    return (
      <Workspace2 title={t('cldCardHeader', 'Chronic lung disease card header')}>
        <div className={styles.message}>
          <p>{t('chooseCldHeaderSection', 'Which part of the chronic lung disease card header should open?')}</p>
          {(Object.keys(CLD_HEADER_SECTIONS) as Array<CldHeaderSection>).map((key) => (
            <Button key={key} kind="ghost" onClick={() => setCldSection(key)}>
              {t(`cldSection_${key}`, CLD_HEADER_SECTIONS[key].title)}
            </Button>
          ))}
        </div>
      </Workspace2>
    );
  }

  if (htnPanel && patientUuid) {
    const encounterPanels = {
      visit: HtnVisitWorkspace,
      quarterlyLabs: HtnQuarterlyLabsWorkspace,
      annualLabs: HtnAnnualLabsWorkspace,
      hospitalisation: HtnHospitalisationWorkspace,
    };
    if (htnPanel !== 'header') {
      const Panel = encounterPanels[htnPanel];
      return <Panel {...props} workspaceProps={{ patientUuid, encounterUuid }} />;
    }
    if (htnSection) {
      return <HtnHeaderWorkspace {...props} workspaceProps={{ patientUuid, section: htnSection }} />;
    }
    return (
      <Workspace2 title={t('htnCardHeader', 'Hypertension and diabetes card header')}>
        <div className={styles.message}>
          <p>{t('chooseHtnHeaderSection', 'Which part of the hypertension and diabetes card header should open?')}</p>
          {(Object.keys(HTN_HEADER_SECTIONS) as Array<HtnHeaderSection>).map((key) => (
            <Button key={key} kind="ghost" onClick={() => setHtnSection(key)}>
              {t(`htnSection_${key}`, HTN_HEADER_SECTIONS[key].title)}
            </Button>
          ))}
        </div>
      </Workspace2>
    );
  }

  if (epPanel && patientUuid) {
    if (epPanel === 'visit') {
      return <EpVisitWorkspace {...props} workspaceProps={{ patientUuid, encounterUuid }} />;
    }
    if (epSection) {
      return <EpHeaderWorkspace {...props} workspaceProps={{ patientUuid, section: epSection }} />;
    }
    return (
      <Workspace2 title={t('epilepsyCardHeader', 'Epilepsy card header')}>
        <div className={styles.message}>
          <p>{t('chooseEpHeaderSection', 'Which part of the epilepsy card header should open?')}</p>
          {(Object.keys(EP_HEADER_SECTIONS) as Array<EpHeaderSection>).map((key) => (
            <Button key={key} kind="ghost" onClick={() => setEpSection(key)}>
              {t(`epSection_${key}`, EP_HEADER_SECTIONS[key].title)}
            </Button>
          ))}
        </div>
      </Workspace2>
    );
  }

  if (mhPanel && patientUuid) {
    if (mhPanel === 'visit') {
      return <MhVisitWorkspace {...props} workspaceProps={{ patientUuid, encounterUuid }} />;
    }
    if (mhPanel === 'screening') {
      return <MhScreeningWorkspace {...props} workspaceProps={{ patientUuid, encounterUuid }} />;
    }
    if (mhSection) {
      return <MhHeaderWorkspace {...props} workspaceProps={{ patientUuid, section: mhSection }} />;
    }
    return (
      <Workspace2 title={t('mentalHealthCardHeader', 'Mental health card header')}>
        <div className={styles.message}>
          <p>{t('chooseMhHeaderSection', 'Which part of the mental health card header should open?')}</p>
          {(Object.keys(MH_HEADER_SECTIONS) as Array<MhHeaderSection>).map((key) => (
            <Button key={key} kind="ghost" onClick={() => setMhSection(key)}>
              {t(`mhSection_${key}`, MH_HEADER_SECTIONS[key].title)}
            </Button>
          ))}
        </div>
      </Workspace2>
    );
  }

  if (artPanel && patientUuid) {
    const panelProps = { ...props, workspaceProps: { patientUuid, encounterUuid } };
    if (artPanel === 'visit') {
      return <ArtVisitWorkspace {...panelProps} />;
    }
    if (artPanel === 'viralLoad') {
      return <ViralLoadWorkspace {...panelProps} />;
    }
    if (artPanel === 'followUpTesting') {
      return <FollowUpTestingWorkspace {...panelProps} />;
    }
    if (section) {
      return <ArtInitialWorkspace {...props} workspaceProps={{ patientUuid, section }} />;
    }
    return (
      <Workspace2 title={t('artCardHeader', 'ART card header')}>
        <div className={styles.message}>
          <p>{t('chooseHeaderSection', 'Which part of the ART card header should open?')}</p>
          {(Object.keys(INITIAL_SECTIONS) as Array<InitialSection>).map((key) => (
            <Button key={key} kind="ghost" onClick={() => setSection(key)}>
              {t(`section_${key}`, INITIAL_SECTIONS[key].title)}
            </Button>
          ))}
        </div>
      </Workspace2>
    );
  }

  const matches = encounter ? findCardsForEncounter(encounter, cards) : [];
  const selected = chosen ?? (matches.length === 1 ? matches[0] : null);

  let content: React.ReactNode;
  if (encounterError || error) {
    content = (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('loadError', 'Could not load the eMastercards')}
        subtitle={(encounterError ?? error)?.message}
      />
    );
  } else if (!encounter || isLoading) {
    content = <InlineLoading description={t('loading', 'Loading...')} />;
  } else if (selected) {
    content = (
      <FlowsheetFrame title={selected.label} url={flowsheetUrl(selected)} onClose={close} onDirtyChange={setDirty} />
    );
  } else if (matches.length > 1) {
    content = (
      <div className={styles.message}>
        <p>{t('chooseEMastercard', 'This encounter is on more than one eMastercard. Which one should open?')}</p>
        {matches.map((card) => (
          <Button key={card.key} kind="ghost" onClick={() => setChosen(card)}>
            {card.label}
          </Button>
        ))}
      </div>
    );
  } else {
    content = (
      <div className={styles.message}>
        <p>
          {t(
            'cannotEditHere',
            "This encounter can't be edited here, because it isn't on any of the patient's eMastercards.",
          )}
        </p>
        <Link href={`${window.openmrsBase}/patientDashboard.form?patientId=${patientUuid}`}>
          {t('openPatientDashboard', 'Open the patient dashboard')}
        </Link>
      </div>
    );
  }

  return (
    <Workspace2 title={selected?.label ?? t('editEncounter', 'Edit encounter')} hasUnsavedChanges={dirty}>
      {content}
    </Workspace2>
  );
};

export default EncounterEditWorkspace;
