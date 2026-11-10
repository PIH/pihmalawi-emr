import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  pagesWithoutVitalsHeader: {
    _type: Type.Array,
    _elements: { _type: Type.String },
    _description:
      "The patient chart pages (the part of the URL after /chart/) that don't show the vitals and biometrics header; '*' for every page",
    _default: ['*'],
  },
  pagesWithoutBannerDetails: {
    _type: Type.Array,
    _elements: { _type: Type.String },
    _description:
      "The patient chart pages (the part of the URL after /chart/) whose patient banner has no Show more / Show less button; '*' for every page",
    _default: ['*'],
  },
  pastVisitTypeUuid: {
    _type: Type.UUID,
    _description:
      'The visit type of the O3 visit created when a card visit is entered for a past day the patient has no visit on (the emr.atFacilityVisitType global property)',
    _default: 'f01c54cb-2225-471a-9cd5-d348552c337c',
  },
  hiv: {
    programUuid: {
      _type: Type.UUID,
      _description: 'The HIV program; its patients see the HIV line under the vitals and biometrics header',
      _default: '66850b0a-977f-11e1-8993-905e29aff6c1',
    },
    viralLoadConceptUuid: {
      _type: Type.ConceptUuid,
      _description: 'The numeric viral load result (the legacy concept.viralLoad global property)',
      _default: '654a7694-977f-11e1-8993-905e29aff6c1',
    },
    viralLoadLdlConceptUuid: {
      _type: Type.ConceptUuid,
      _description: 'Viral load below detection, true or false (the legacy concept.viralLoad.ldl global property)',
      _default: 'e97b36a2-16f5-11e6-b6ba-3e1d05defe78',
    },
    cd4CountConceptUuid: {
      _type: Type.ConceptUuid,
      _description: 'The CD4 count (the legacy dashboard.header.showConcept global property)',
      _default: '656c327a-977f-11e1-8993-905e29aff6c1',
    },
  },
};

export interface ConfigObject {
  pagesWithoutVitalsHeader: Array<string>;
  pagesWithoutBannerDetails: Array<string>;
  pastVisitTypeUuid: string;
  hiv: {
    programUuid: string;
    viralLoadConceptUuid: string;
    viralLoadLdlConceptUuid: string;
    cd4CountConceptUuid: string;
  };
}
