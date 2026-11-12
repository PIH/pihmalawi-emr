import { launchWorkspace2 } from '@openmrs/esm-framework';

/** The PDC card's side panel: its header, one panel with sections */
export const PDC_HEADER_WORKSPACE = 'pihmalawi-pdc-header-workspace';

/** Opens the PDC card header's panel on a section, or to start the card */
export function launchPdcPanel(props: { patientUuid: string; section: string }) {
  launchWorkspace2(PDC_HEADER_WORKSPACE, props);
}
