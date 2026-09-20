// Sourced from docs/program-eligibility-rules.md — do not hand-edit without
// re-verifying against content/content.properties and content/configuration/backend_configuration/**/*.csv

export const HIV_PROGRAM_UUID = '66850b0a-977f-11e1-8993-905e29aff6c1';
export const HIV_TREATMENT_STATUS_WORKFLOW_UUID = '6686ffe6-977f-11e1-8993-905e29aff6c1';
export const ON_ARVS_STATE_UUID = '6687fa7c-977f-11e1-8993-905e29aff6c1';

export const ARV_NUMBER_IDENTIFIER_TYPE_UUID = '66784d84-977f-11e1-8993-905e29aff6c1';
export const DUMMY_ID_IDENTIFIER_TYPE_UUID = '667852ac-977f-11e1-8993-905e29aff6c1';

export const NENO_DISTRICT_HOSPITAL_LOCATION_UUID = '0d414ce2-5ab4-11e0-870c-9f6107fee88e';

export const ART_INITIAL_ENCOUNTER_TYPE_UUID = '664b8574-977f-11e1-8993-905e29aff6c1';
export const ART_FOLLOWUP_ENCOUNTER_TYPE_UUID = '664b8650-977f-11e1-8993-905e29aff6c1';

export const ART_EMASTERCARD_FORM_UUID = 'a3cbdf5f-8c15-41b4-b97d-903ba3bd0532';
export const ART_VISIT_FORM_UUID = '64db7fd5-c28d-4b85-87c4-d01e92ae004a';

export const HIV_COHORT_REPORT_UUID = 'c64afef1-2ccc-44d5-9504-eb5c8d6e3892';

// Chronic Care Program
export const CHRONIC_CARE_PROGRAM_UUID = '6685164a-977f-11e1-8993-905e29aff6c1';
export const CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID = '11a76c3e-1db8-4d16-9252-9a18b5ed1843';

// Chronic Care eMastercard (generic) — the base chronicCareTreatmentStatus
// workflow of the same Chronic Care Program above (distinct from the 6
// disease-specific workflows below, e.g. asthmaTreatment).
export const CHRONIC_CARE_ON_TREATMENT_STATE_UUID = '66882650-977f-11e1-8993-905e29aff6c1';
export const CHRONIC_CARE_INITIAL_ENCOUNTER_TYPE_UUID = '664bb6de-977f-11e1-8993-905e29aff6c1';
export const CHRONIC_CARE_FOLLOWUP_ENCOUNTER_TYPE_UUID = '664bb896-977f-11e1-8993-905e29aff6c1';

export const DIABETES_HYPERTENSION_TREATMENT_WORKFLOW_UUID = '9b571347-8dc3-40fe-9994-e82071fa8290';
export const DIABETES_HYPERTENSION_ON_TREATMENT_STATE_UUID = 'd5d2d3bf-9cca-4a1f-9c69-f7713ed8fff4';
export const DIABETES_HYPERTENSION_IN_ADVANCE_CARE_STATE_UUID = '00be3c91-ecd2-482e-8c7a-7bdd49c997e7';

export const DIABETES_HYPERTENSION_INITIAL_ENCOUNTER_TYPE_UUID = '664b9442-977f-11e1-8993-905e29aff6c1';
export const DIABETES_HYPERTENSION_FOLLOWUP_ENCOUNTER_TYPE_UUID = '66079de4-a8df-11e5-bf7f-feff819cdc9f';

export const DIABETES_HYPERTENSION_EMASTERCARD_FORM_UUID = '8cfee016-cacb-11e5-9956-625662870761';
export const DIABETES_HYPERTENSION_VISIT_FORM_UUID = '8cfedcc4-cacb-11e5-9956-625662870761';

export const ASTHMA_TREATMENT_WORKFLOW_UUID = '319838b7-23cb-4e04-9b36-ad1e83cbeaaf';
export const ASTHMA_ON_TREATMENT_STATE_UUID = '7f2fc125-f9bc-4195-b879-3060a386468a';

export const ASTHMA_INITIAL_ENCOUNTER_TYPE_UUID = 'a95dc43f-925c-11e5-a1de-e82aea237783';
export const ASTHMA_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'f4596df5-925c-11e5-a1de-e82aea237783';

export const ASTHMA_EMASTERCARD_FORM_UUID = '08f273c2-8c38-11e5-80a3-c0430f805837';
export const ASTHMA_VISIT_FORM_UUID = 'fcf29c1a-8c45-11e5-80a3-c0430f805837';

export const CHF_TREATMENT_WORKFLOW_UUID = 'cc76c7c2-8760-4ff6-8ed7-617a7378915b';
export const CHF_ON_TREATMENT_STATE_UUID = '3a9724e5-fc65-4a48-8d0b-2b1265106552';

export const CHF_INITIAL_ENCOUNTER_TYPE_UUID = 'cb337ef3-f5cb-4e10-af8d-8d717a3a139f';
export const CHF_FOLLOWUP_ENCOUNTER_TYPE_UUID = '1f6ad830-6e94-4819-b1fd-8c4146e77280';

export const CHF_EMASTERCARD_FORM_UUID = '40c59f30-794e-11e8-adc0-fa7ae01bbebc';
export const CHF_VISIT_FORM_UUID = '4a5c17b8-794e-11e8-adc0-fa7ae01bbebc';

export const CKD_TREATMENT_WORKFLOW_UUID = '4eda02b2-48ca-47dc-9166-483a6499bcbd';
export const CKD_ON_TREATMENT_STATE_UUID = '908552d7-2bb3-4e4f-9ba1-ec22c2c3f2b6';

export const CKD_INITIAL_ENCOUNTER_TYPE_UUID = '0a3621e2-974e-11e8-9eb6-529269fb1459';
export const CKD_FOLLOWUP_ENCOUNTER_TYPE_UUID = '1ebe2272-974e-11e8-9eb6-529269fb1459';

export const CKD_EMASTERCARD_FORM_UUID = 'ec0a340c-9751-11e8-9eb6-529269fb1459';
export const CKD_VISIT_FORM_UUID = 'ec0a1fb2-9751-11e8-9eb6-529269fb1459';

export const NCD_OTHER_TREATMENT_WORKFLOW_UUID = '62481c50-155c-45be-b4e9-39a38a9cbfda';
export const NCD_OTHER_ON_TREATMENT_STATE_UUID = 'cfec993e-ae2f-4f16-bea5-4bd26752bc89';

export const NCD_OTHER_INITIAL_ENCOUNTER_TYPE_UUID = 'b562295c-e335-11e8-9f32-f2801f1b9fd1';
export const NCD_OTHER_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'b5622bf0-e335-11e8-9f32-f2801f1b9fd1';

export const NCD_OTHER_EMASTERCARD_FORM_UUID = '766c92e8-e35b-11e8-9f32-f2801f1b9fd1';
export const NCD_OTHER_VISIT_FORM_UUID = '766c8c30-e35b-11e8-9f32-f2801f1b9fd1';

// Source CSVs/JSP spell these uuids in uppercase; lowercased here only for
// consistency with every other constant in this file (OpenMRS's own uuid
// matching is case-insensitive — confirmed live both forms work either way).
export const SCD_TREATMENT_WORKFLOW_UUID = '1a6c2438-99d7-41ff-8eb4-516dfcd1d199';
export const SCD_ON_TREATMENT_STATE_UUID = 'c2b106c6-18b6-4342-b2e7-faa0540e6dc2';

export const SCD_INITIAL_ENCOUNTER_TYPE_UUID = '56c2d952-db11-4b47-b248-79c1b2a88e88';
export const SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'd4073eb7-60b1-4586-b062-13fce4cbc9e8';

export const SCD_EMASTERCARD_FORM_UUID = '7afec71b-15d3-4e2d-8c42-d8cb2b75bc54';
export const SCD_VISIT_FORM_UUID = 'e68275d4-c300-46b0-8754-4c2cf2598b78';

// TB Program — own program/workflow (not Chronic Care Program). Uuid below
// matches content/content.properties' var.program.tb.uuid (the value
// programs.csv's `${program.tb.uuid}` token resolves to at deploy time); its
// "On treatment" state was confirmed live via `GET program/<uuid>?v=full`,
// matching malawiPatientDashboard.jsp's TbActiveStates state list.
export const TB_PROGRAM_UUID = '52D0036A-AB35-475E-A4D4-1826CCD985D6';
export const TB_ON_TREATMENT_STATE_UUID = '5088F779-AD8D-4EEF-A504-9B5C2D96ED62';
export const TB_PROGRAM_IDENTIFIER_TYPE_UUID = 'F4319B47-4141-48DF-9F41-5CF7E6301EC6';

export const TB_INITIAL_ENCOUNTER_TYPE_UUID = '853B7AF6-FFC6-452A-9178-6A48BBA752EF';
export const TB_FOLLOWUP_ENCOUNTER_TYPE_UUID = '61545FD5-4EBC-4E01-B349-304195254A73';

// Mental Health Care Program — own program/workflow. Uuid below matches
// content/content.properties' var.program.mentalHealth.uuid. Confirmed live
// via `GET program/<uuid>?v=full`: this "MENTAL HEALTH CARE PROGRAM" uuid has
// a workflow
// (da69bbcb-01fe-4c59-9d46-8a2659abbd73) whose "On treatment" state matches
// mental-health-emastercard.xml's own hardcoded Outcome lookup — the
// strongest available confirmation this is the workflow the mastercard
// actually gates on (of MentalHealthActiveStates' 4 listed states, this is
// the only "On treatment" one live in this program). Uses the Chronic Care
// Number identifier type, same as the Chronic Care Program conditions.
export const MENTAL_HEALTH_PROGRAM_UUID = '60357F01-536E-4B59-A851-B000F801FB13';
export const MENTAL_HEALTH_ON_TREATMENT_STATE_UUID = '2F76D426-56A9-4651-B253-A2299B442C09';

export const MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID = '3F94849C-F245-4593-BCC8-879EAEA29168';
export const MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'D51F45F8-0EEA-4231-A7E9-C45D57F1CBA1';

// Palliative Care Program — own program/workflow. Confirmed live via
// `GET program/<uuid>?v=full` (matches PihMalawiConfigConstants.java's own
// PROGRAM_PALLIATIVE_CARE_UUID constant) — programs.csv's own 5th column for
// this program's row is a concept uuid (the program's "outcome" concept),
// NOT the program's own uuid, unlike TB's/Mental Health's own rows above.
export const PALLIATIVE_CARE_PROGRAM_UUID = 'acbd87f3-566f-4386-a11e-877e612d3911';
export const PALLIATIVE_CARE_ON_TREATMENT_STATE_UUID = '7c1f852e-5120-4371-8136-f64614f5dfc7';
export const PALLIATIVE_CARE_NUMBER_IDENTIFIER_TYPE_UUID = 'f2b29f9b-69d0-4339-b1aa-55a511672558';

export const PALLIATIVE_INITIAL_ENCOUNTER_TYPE_UUID = 'e0822140-955d-11e7-abc4-cec278b6b50a';
export const PALLIATIVE_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'e082235c-955d-11e7-abc4-cec278b6b50a';

// Epilepsy — its own workflow (Epilepsy treatment) under the Mental Health
// Care Program, not a separate program. Confirmed live via
// `GET program/<mentalHealthUuid>?v=full`: this program has two workflows,
// "Epilepsy treatment" and "Mental health treatment" — the Mental Health
// pilot's own MENTAL_HEALTH_ON_TREATMENT_STATE_UUID belongs to the latter.
// Uses the Chronic Care Number identifier type (epilepsy-emastercard.xml's
// own "NCD Reg no" lookup reads "Chronic Care Number"), same as Mental
// Health.
export const EPILEPSY_TREATMENT_WORKFLOW_UUID = '26FD314D-138F-4A5C-8890-E01791C06336';
export const EPILEPSY_ON_TREATMENT_STATE_UUID = 'CB86C6FE-4263-4A4C-AF54-49D5308459D4';

export const EPILEPSY_INITIAL_ENCOUNTER_TYPE_UUID = 'D8CBF1B9-EC74-4858-8764-2350E2A9925B';
export const EPILEPSY_FOLLOWUP_ENCOUNTER_TYPE_UUID = '1EEDD2F6-EF28-4409-8E8C-F4FEC0746E72';

// Teen club program — own program/workflow, confirmed live via
// `GET program/<uuid>?v=full` (matches content.properties'
// var.program.teenClub.uuid exactly). Has no "On treatment" state; "First
// time initiation" is the natural intake state for a new enrollee. Uses the
// ARV Number identifier type (teen-club-emastercard.xml's own header row
// looks up "ARV Number", not a Teen-Club-specific identifier).
export const TEEN_CLUB_PROGRAM_UUID = '54100564-4759-4CBD-9A73-B38D6DBAC7B9';
export const TEEN_CLUB_FIRST_TIME_INITIATION_STATE_UUID = '3E9BB98B-6BB0-431D-BCD5-B3E277922C04';

export const TEEN_CLUB_INITIAL_ENCOUNTER_TYPE_UUID = '49085C00-9EA8-481D-A5C5-FB685822D5AB';
export const TEEN_CLUB_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'A8CF446D-0FA4-4D44-AF46-1811F73BE65A';

// Nutrition program — ALL 5 mastercard variants below (generic, Adults,
// Infant, PDC, Pregnant Teens) gate on the SAME `${NutritionActiveStates}` in
// malawiPatientDashboard.jsp (unlike the 6 Chronic Care Program conditions,
// which each have their own workflow) — one program/workflow/state/
// identifier type covers all 5, only the encounter types + forms differ.
export const NUTRITION_PROGRAM_UUID = 'FECD888E-D547-4E1D-A012-56CA8874D2E1';
export const NUTRITION_ON_TREATMENT_STATE_UUID = '4F148482-8B25-4ACD-A23C-B2A1D4701C2D';
export const NUTRITION_PROGRAM_NUMBER_IDENTIFIER_TYPE_UUID = 'C9888967-8584-4F36-86B8-51AC368BC720';

export const NUTRITION_INITIAL_ENCOUNTER_TYPE_UUID = 'F1EB0CA8-8E7C-49B5-A03C-B0B9C164181E';
export const NUTRITION_FOLLOWUP_ENCOUNTER_TYPE_UUID = '87EB5825-DFDD-4EE9-8EEC-CDBE72E76456';

export const NUTRITION_ADULTS_INITIAL_ENCOUNTER_TYPE_UUID = 'f4add6a6-0186-4617-b919-e5cdb933e25d';
export const NUTRITION_ADULTS_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'e1a92830-897c-42fe-91d4-73f61f38d1a7';

export const NUTRITION_INFANT_INITIAL_ENCOUNTER_TYPE_UUID = '65def8b5-6714-443e-a59a-bc481e9fd842';
export const NUTRITION_INFANT_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'cf05c255-f1c9-465f-abbd-de980403b4b6';

export const NUTRITION_PDC_INITIAL_ENCOUNTER_TYPE_UUID = '7ca19e74-5592-4e54-a899-575321803d9f';
export const NUTRITION_PDC_FOLLOWUP_ENCOUNTER_TYPE_UUID = '771cb90d-442c-4b84-bd25-dd9b6a82715a';

export const NUTRITION_PREGNANT_TEENS_INITIAL_ENCOUNTER_TYPE_UUID = 'd67b208d-e819-4888-9bb8-60dcb8ab2b1f';
export const NUTRITION_PREGNANT_TEENS_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'd235e109-d4f7-4493-ba10-c75d9046f8bf';

// PDC (Pediatric Development Clinic) program — like Nutrition, all 5 variants
// share ONE program/workflow/state. UNLIKE Nutrition, 4 of the 5 variants
// (everything except generic PDC) ALSO gate on the patient having a
// "Diagnosis" obs (concept below) with a specific answer — set via a
// checkbox on the GENERIC PDC eMastercard header (confirmed against
// EMastercardAccessTag.java's `hasCondition` check + Helper.hasCondition,
// which queries for ANY obs of this concept/answer regardless of encounter
// type). See pdc-mastercard-page.ts's `fillGenericPdcHeaderWithDiagnosis`.
export const PDC_PROGRAM_UUID = 'cffd61d1-f087-41df-86c7-fbd6b6e9ab1e';
export const PDC_ON_TREATMENT_STATE_UUID = 'b84735a5-82ae-4e3b-87db-250c43113977';
export const PDC_IDENTIFIER_TYPE_UUID = 'f7de1b97-013e-49ad-a596-4ada6ede1053';

export const PDC_INITIAL_ENCOUNTER_TYPE_UUID = 'cb6be652-c5ee-447d-9d94-1100ffb26aa8';
// NOTE: there is deliberately no PDC_FOLLOWUP export here — confirmed against
// EMastercardAccessTag.java's `flowsheetForms` map that the generic PDC
// eMastercard has NO entry at all (every other condition/variant does), so
// `pdc-visit.xml` is unreachable via the live "Enter New Flowsheet" flow.
// Generic PDC gets a header-only spec, no visit spec.

export const PDC_DEVELOPMENTAL_DELAY_INITIAL_ENCOUNTER_TYPE_UUID = '3aa5f5fa-a0aa-49bc-b715-1c1dd68e72d4';
export const PDC_DEVELOPMENTAL_DELAY_FOLLOWUP_ENCOUNTER_TYPE_UUID = '64148b3f-f732-4809-9a23-8b8ebe11279a';

export const PDC_TRISOMY21_INITIAL_ENCOUNTER_TYPE_UUID = '6ed701a4-152f-11ec-82a8-0242ac130003';
export const PDC_TRISOMY21_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'f770abb3-8470-4c63-a5c6-188ab384f8df';

export const PDC_CLEFT_CLIP_PALLET_INITIAL_ENCOUNTER_TYPE_UUID = 'dbfc3984-6466-4ce0-a53f-fa646d74c41f';
export const PDC_CLEFT_CLIP_PALLET_FOLLOWUP_ENCOUNTER_TYPE_UUID = 'cfca0af9-86c9-4717-83b7-74e61f1a7bbf';

export const PDC_OTHER_DIAGNOSIS_INITIAL_ENCOUNTER_TYPE_UUID = '0a2f1f74-2400-4cfd-8a9e-d2141622c6d8';
export const PDC_OTHER_DIAGNOSIS_FOLLOWUP_ENCOUNTER_TYPE_UUID = '60bfcb32-486a-11ec-81d3-0242ac130003';

// Pre-ART and Exposed Child eMastercards — NOT the separate retired
// "PRE-ART PROGRAM"/"Early Infant Diagnosis Program" (both Void/Retire=true
// in programs.csv, and unrelated dead ends here). Traced
// malawiPatientDashboard.jsp's gate lines: both mastercards' `programWorkflowStates`
// are state uuids belonging to the HIV_TREATMENT_STATUS_WORKFLOW_UUID above —
// i.e. alternate initial states of the same active HIV Program already used
// by the hiv-art pilot, gated with their own "HCC Number" identifier type
// instead of ARV Number.
export const PRE_ART_ON_TREATMENT_STATE_UUID = '6687f284-977f-11e1-8993-905e29aff6c1';
export const EXPOSED_CHILD_ON_TREATMENT_STATE_UUID = '668847a2-977f-11e1-8993-905e29aff6c1';
export const HCC_NUMBER_IDENTIFIER_TYPE_UUID = '66786256-977f-11e1-8993-905e29aff6c1';

export const PRE_ART_INITIAL_ENCOUNTER_TYPE_UUID = '664b8736-977f-11e1-8993-905e29aff6c1';
export const PRE_ART_FOLLOWUP_ENCOUNTER_TYPE_UUID = '664b8812-977f-11e1-8993-905e29aff6c1';

export const EXPOSED_CHILD_INITIAL_ENCOUNTER_TYPE_UUID = '664bcbb0-977f-11e1-8993-905e29aff6c1';
export const EXPOSED_CHILD_FOLLOWUP_ENCOUNTER_TYPE_UUID = '664bcc8c-977f-11e1-8993-905e29aff6c1';
