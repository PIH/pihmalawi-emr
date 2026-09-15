-- ## report_uuid = 897C0E0A-1F8A-4ABD-AFE2-054146227668
-- ## design_uuid = FFA51EA2-D483-43F2-9FE8-5B0AF619E8A0
-- ## report_name = IC3 - Register Report
-- ## report_description = Report listing IC3 patients
-- ## parameter = reportEndDate|End Date|java.util.Date

-- Report lists all patients who are in enlisted in any of the CC programs or ART program.
select encounter_type_id into @ART_FOLLOWUP from encounter_type where uuid = '664b8650-977f-11e1-8993-905e29aff6c1';
select encounter_type_id into @DH_F from encounter_type where uuid = '66079de4-a8df-11e5-bf7f-feff819cdc9f';
select encounter_type_id into @E_I from encounter_type where uuid = 'D8CBF1B9-EC74-4858-8764-2350E2A9925B';
select encounter_type_id into @E_F from encounter_type where uuid = '1EEDD2F6-EF28-4409-8E8C-F4FEC0746E72';
select encounter_type_id into @M_I from encounter_type where uuid = '3F94849C-F245-4593-BCC8-879EAEA29168';
select encounter_type_id into @M_F from encounter_type where uuid = 'D51F45F8-0EEA-4231-A7E9-C45D57F1CBA1';
select encounter_type_id into @A_I from encounter_type where uuid = 'a95dc43f-925c-11e5-a1de-e82aea237783';
select encounter_type_id into @A_F from encounter_type where uuid = 'f4596df5-925c-11e5-a1de-e82aea237783';
select encounter_type_id into @CC_I from encounter_type where uuid = '664bb6de-977f-11e1-8993-905e29aff6c1'; -- CHRONIC_CARE_INITIAL
select encounter_type_id into @CC_F from encounter_type where uuid = '664bb896-977f-11e1-8993-905e29aff6c1'; -- CHRONIC_CARE_FOLLOWUP
select encounter_type_id into @DH_I from encounter_type where uuid = '664b9442-977f-11e1-8993-905e29aff6c1'; -- DIABETES HYPERTENSION INITIAL VISIT
select encounter_type_id into @ART_I from encounter_type where uuid = '664b8574-977f-11e1-8993-905e29aff6c1'; -- ART_INITIAL
select encounter_type_id into @PART_I from encounter_type where uuid = '664b8736-977f-11e1-8993-905e29aff6c1'; -- PART_INITIAL
select encounter_type_id into @PART_F from encounter_type where uuid = '664b8812-977f-11e1-8993-905e29aff6c1'; -- PART_FOLLOWUP

select program_id into @hivProgramId from program where uuid = '66850b0a-977f-11e1-8993-905e29aff6c1'; -- HIV program
select program_id into @chronicCareProgramId from program where uuid = '6685164a-977f-11e1-8993-905e29aff6c1'; -- Chronic Care program
select patient_identifier_type_id into @arvNumberTypeId from patient_identifier_type where uuid = '66784d84-977f-11e1-8993-905e29aff6c1'; -- ARV Number
select patient_identifier_type_id into @hccNumberTypeId from patient_identifier_type where uuid = '66786256-977f-11e1-8993-905e29aff6c1'; -- HCC Number
select patient_identifier_type_id into @chronicCareNumberTypeId from patient_identifier_type where uuid = '11a76c3e-1db8-4d16-9252-9a18b5ed1843'; -- Chronic Care Number

select concept_id into @tbStatusConceptId from concept where uuid = '65770db2-977f-11e1-8993-905e29aff6c1'; -- TB status
select concept_id into @artStartDateConceptId from concept where uuid = '656fbe36-977f-11e1-8993-905e29aff6c1'; -- Start date 1st line ARV
select concept_id into @chronicCareDiagnosisConceptId from concept where uuid = '65671c9a-977f-11e1-8993-905e29aff6c1'; -- Chronic care diagnosis (diagnosis question)
select concept_id into @diagnosisDateConceptId from concept where uuid = '65732bf2-977f-11e1-8993-905e29aff6c1'; -- Diagnosis date
select concept_id into @currentDrugsUsedConceptId from concept where uuid = '65585192-977f-11e1-8993-905e29aff6c1'; -- Current drugs used (meds question)
select concept_id into @chronicLungDiseaseTreatmentConceptId from concept where uuid = '60ae390a-c15f-11e5-9912-ba0be0483c18'; -- Chronic lung disease treatment (meds question)
select concept_id into @hypertensionConceptId from concept where uuid = '654abfc8-977f-11e1-8993-905e29aff6c1'; -- Hypertension
select concept_id into @captoprilConceptId from concept where uuid = '6563597a-977f-11e1-8993-905e29aff6c1'; -- Captopril
select concept_id into @amlodipineConceptId from concept where uuid = '65635ef2-977f-11e1-8993-905e29aff6c1'; -- Amlodipine
select concept_id into @enalaprilConceptId from concept where uuid = '65588cde-977f-11e1-8993-905e29aff6c1'; -- Enalapril
select concept_id into @nifedipineConceptId from concept where uuid = '654704dc-977f-11e1-8993-905e29aff6c1'; -- Nifedipine
select concept_id into @atenololConceptId from concept where uuid = '65635d58-977f-11e1-8993-905e29aff6c1'; -- Atenolol
select concept_id into @lisinoprilConceptId from concept where uuid = '65635a74-977f-11e1-8993-905e29aff6c1'; -- Lisinopril
select concept_id into @propranololConceptId from concept where uuid = '65470f18-977f-11e1-8993-905e29aff6c1'; -- Propranolol
select concept_id into @diureticsClassConceptId from concept where uuid = '163212AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Diuretics
select concept_id into @calciumChannelBlockersClassConceptId from concept where uuid = '163213AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Calcium channel blockers
select concept_id into @aceInhibitorsClassConceptId from concept where uuid = '162298AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- ACE inhibitors
select concept_id into @betaBlockersClassConceptId from concept where uuid = '163211AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Beta blockers
select concept_id into @aspirinConceptId from concept where uuid = '6545efde-977f-11e1-8993-905e29aff6c1'; -- Aspirin
select concept_id into @statinsClassConceptId from concept where uuid = '162307AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Statins
select concept_id into @hydralazineConceptId from concept where uuid = '654b10d6-977f-11e1-8993-905e29aff6c1'; -- Hydralazine
select concept_id into @isosorbideMononitrateConceptId from concept where uuid = '6574f45a-977f-11e1-8993-905e29aff6c1'; -- Isosorbide mononitrate
select concept_id into @hydrochlorothiazideConceptId from concept where uuid = '65588df6-977f-11e1-8993-905e29aff6c1'; -- Hydrochlorothiazide
select concept_id into @furosemideConceptId from concept where uuid = '6546003c-977f-11e1-8993-905e29aff6c1'; -- Furosemide
select concept_id into @spironolactoneConceptId from concept where uuid = '65694c36-977f-11e1-8993-905e29aff6c1'; -- Spironolactone
select concept_id into @bisoprololConceptId from concept where uuid = '72247AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Bisoprolol
select concept_id into @simvastatinConceptId from concept where uuid = '83936AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Simvastatin
select concept_id into @pravastatinConceptId from concept where uuid = '82411AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Pravastatin
select concept_id into @atorvastatinConceptId from concept where uuid = '657aefc2-977f-11e1-8993-905e29aff6c1'; -- Atorvastatin
select concept_id into @type1DiabetesConceptId from concept where uuid = '65714206-977f-11e1-8993-905e29aff6c1'; -- Type 1 diabetes
select concept_id into @type2DiabetesConceptId from concept where uuid = '65714314-977f-11e1-8993-905e29aff6c1'; -- Type 2 diabetes
select concept_id into @diabetesConceptId from concept where uuid = '6567426a-977f-11e1-8993-905e29aff6c1'; -- Diabetes
select concept_id into @metforminConceptId from concept where uuid = '65694308-977f-11e1-8993-905e29aff6c1'; -- Metformin
select concept_id into @insulinConceptId from concept where uuid = '467f702f-7d45-4ebe-9588-d68319ad65d8'; -- Insulin
select concept_id into @glibenclamideConceptId from concept where uuid = '65693cf0-977f-11e1-8993-905e29aff6c1'; -- Glibenclamide
select concept_id into @regularInsulinConceptId from concept where uuid = '6547414a-977f-11e1-8993-905e29aff6c1'; -- Insulin, soluble
select concept_id into @longActingInsulinConceptId from concept where uuid = '6573132e-977f-11e1-8993-905e29aff6c1'; -- Long acting insulin
select concept_id into @epilepsyConceptId from concept where uuid = '6546938a-977f-11e1-8993-905e29aff6c1'; -- Epilepsy
select concept_id into @phenobarbitalConceptId from concept where uuid = '6546f3c0-977f-11e1-8993-905e29aff6c1'; -- Phenobarbital
select concept_id into @phenytoinConceptId from concept where uuid = '65473768-977f-11e1-8993-905e29aff6c1'; -- Phenytoin
select concept_id into @carbamazepineConceptId from concept where uuid = '654b0726-977f-11e1-8993-905e29aff6c1'; -- Carbamazepine
select concept_id into @numberOfSeizuresConceptId from concept where uuid = '65795b26-977f-11e1-8993-905e29aff6c1'; -- NUMBER OF SEIZURES
select concept_id into @alcoholTriggerConceptId from concept where uuid = '7e8ab286-cf5c-11e5-ab30-625662870761'; -- Alcohol trigger
select concept_id into @feverTriggerConceptId from concept where uuid = '7e8ab5b0-cf5c-11e5-ab30-625662870761'; -- Fever trigger
select concept_id into @soundLightTouchTriggerConceptId from concept where uuid = '7e8ab740-cf5c-11e5-ab30-625662870761'; -- Sound, light, and touch trigger
select concept_id into @emotionalStressTriggerConceptId from concept where uuid = '7e8abbdc-cf5c-11e5-ab30-625662870761'; -- Emotional stress, anger, boredom trigger
select concept_id into @sleepDeprivationTriggerConceptId from concept where uuid = '7e8abdbc-cf5c-11e5-ab30-625662870761'; -- Sleep deprivation and overtired trigger
select concept_id into @missedMedicationTriggerConceptId from concept where uuid = '7e8abefc-cf5c-11e5-ab30-625662870761'; -- Missed medication trigger
select concept_id into @menstruationTriggerConceptId from concept where uuid = '7e8abfd8-cf5c-11e5-ab30-625662870761'; -- Menstruation trigger
select concept_id into @asthmaConceptId from concept where uuid = '65459124-977f-11e1-8993-905e29aff6c1'; -- Asthma
select concept_id into @copdConceptId from concept where uuid = '65673e96-977f-11e1-8993-905e29aff6c1'; -- Chronic obstructive pulmonary disease
select concept_id into @salbutamolConceptId from concept where uuid = '654a3238-977f-11e1-8993-905e29aff6c1'; -- Salbutamol
select concept_id into @beclomethasoneConceptId from concept where uuid = '65588aa4-977f-11e1-8993-905e29aff6c1'; -- Beclomethasone
select concept_id into @inhaledBetaAgonistsConceptId from concept where uuid = '60ae316c-c15f-11e5-9912-ba0be0483c18'; -- Beta-agonists (inhaled)
select concept_id into @inhaledSteroidConceptId from concept where uuid = '60ae3554-c15f-11e5-9912-ba0be0483c18'; -- Inhaled steroid
select concept_id into @oralSteroidConceptId from concept where uuid = '60ae373e-c15f-11e5-9912-ba0be0483c18'; -- Oral steroid
select concept_id into @otherNonCodedConceptId from concept where uuid = '656cce7e-977f-11e1-8993-905e29aff6c1'; -- Other non-coded
select concept_id into @asthmaClassificationConceptId from concept where uuid = 'e31e65ff-8523-4d49-a5b0-276a0760966f'; -- Asthma classification
select concept_id into @asthmaNotAtAllConceptId from concept where uuid = '655c32bc-977f-11e1-8993-905e29aff6c1'; -- Not at all
select concept_id into @asthmaIntermittentConceptId from concept where uuid = 'dcbd27b0-4ca2-4a93-9d8a-89f1cbe761ed'; -- Intermittent
select concept_id into @asthmaMildPersistentConceptId from concept where uuid = 'e865c314-a0cf-4431-ba73-aa9280e2fa71'; -- Mild persistent
select concept_id into @asthmaModeratePersistentConceptId from concept where uuid = '5fd72021-54af-4630-b72b-829421d2d65b'; -- Moderate persistent
select concept_id into @asthmaSeverePersistentConceptId from concept where uuid = 'ac3d4d70-4145-4dec-a4bb-ea8136dff4e6'; -- Severe persistent
select concept_id into @asthmaSevereUncontrolledConceptId from concept where uuid = 'a863ffd7-2806-4b2d-8d7c-d6709d106488'; -- Severe uncontrolled
select concept_id into @schizophreniaConceptId from concept where uuid = '654860c0-977f-11e1-8993-905e29aff6c1'; -- Schizophrenia
select concept_id into @depressionConceptId from concept where uuid = '6546cbd4-977f-11e1-8993-905e29aff6c1'; -- Depression
select concept_id into @acutePsychoticDisorderConceptId from concept where uuid = '93e9be37-1369-11e4-a125-54ee7513a7ff'; -- Acute Psychotic disorder
select concept_id into @schizoaffectiveDisorderConceptId from concept where uuid = '127132AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Schizoaffective Disorder
select concept_id into @anxietyDisorderConceptId from concept where uuid = '6560bf08-977f-11e1-8993-905e29aff6c1'; -- Anxiety disorder
select concept_id into @organicMentalDisorderAcuteConceptId from concept where uuid = '7057d712-c5dd-11e5-9912-ba0be0483c18'; -- Organic mental disorder (acute)
select concept_id into @organicMentalDisorderChronicConceptId from concept where uuid = '7057d8b6-c5dd-11e5-9912-ba0be0483c18'; -- Organic mental disorder (chronic)
select concept_id into @alcoholInducedMentalDisorderConceptId from concept where uuid = '121716AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Alcohol-induced mental and behavior disorder
select concept_id into @drugInducedMentalDisorderConceptId from concept where uuid = '90ec5559-3ba2-4fc3-abc1-614727b17141'; -- Drug-induced mental and behavior disorder
select concept_id into @bipolarManicConceptId from concept where uuid = '115924AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Bipolar Affective Disorder, Manic
select concept_id into @otherMentalHealthDxNonCodedConceptId from concept where uuid = 'aad4c0e9-1369-11e4-a125-54ee7513a7ff'; -- Other Mental Health Diagnosis non-coded
select concept_id into @otherMentalHealthDx1ConceptId from concept where uuid = 'f97271c0-63ed-11e6-8b77-86f30ca893d3'; -- Other mental health diagnosis 1
select concept_id into @otherMentalHealthDx2ConceptId from concept where uuid = 'f972763e-63ed-11e6-8b77-86f30ca893d3'; -- Other mental health diagnosis 2
select concept_id into @chlorpromazineConceptId from concept where uuid = '654b00aa-977f-11e1-8993-905e29aff6c1'; -- Chlorpromazine
select concept_id into @haloperidolConceptId from concept where uuid = '65693df4-977f-11e1-8993-905e29aff6c1'; -- Haloperidol
select concept_id into @fluphenazineConceptId from concept where uuid = '654b0eb0-977f-11e1-8993-905e29aff6c1'; -- Fluphenazine
select concept_id into @carbamazepineMentalConceptId from concept where uuid = '654b0726-977f-11e1-8993-905e29aff6c1'; -- Carbamazepine (also used as a mental health medication)
select concept_id into @sodiumValproateConceptId from concept where uuid = '65694b32-977f-11e1-8993-905e29aff6c1'; -- Sodium valproate
select concept_id into @risperidoneConceptId from concept where uuid = '83405AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; -- Risperidone
select concept_id into @fluoxetineConceptId from concept where uuid = '65693bec-977f-11e1-8993-905e29aff6c1'; -- Fluoxetine
select concept_id into @olanzapineConceptId from concept where uuid = 'dae4e2e4-659e-11e6-8b77-86f30ca893d3'; -- Olanzapine
select concept_id into @clozapineConceptId from concept where uuid = 'dae4e5e6-659e-11e6-8b77-86f30ca893d3'; -- Clozapine
select concept_id into @trifluoperazineConceptId from concept where uuid = '657b0bba-977f-11e1-8993-905e29aff6c1'; -- Trifluoperazine
select concept_id into @clopixolConceptId from concept where uuid = 'dae4eb4a-659e-11e6-8b77-86f30ca893d3'; -- Clopixol
select concept_id into @otherConceptId from concept where uuid = '657140f8-977f-11e1-8993-905e29aff6c1'; -- Other
select concept_id into @weightConceptId from concept where uuid = '6569c44a-977f-11e1-8993-905e29aff6c1'; -- Weight (kg)
select concept_id into @heightConceptId from concept where uuid = '6569c562-977f-11e1-8993-905e29aff6c1'; -- Height (cm)

-- Create an empty table
CALL createIc3RegisterTable();
-- Create cohort with demographic data
CALL createIc3RegisterCohort(@reportEndDate);

-- Call Routines to fill columns
-- ---------------------------
-- Warehousing 
CALL warehouseProgramEnrollment();
-- Demographics
CALL getAllIdentifiers(@reportEndDate,@arvNumberTypeId,'allArtIds');
CALL getAllIdentifiers(@reportEndDate,@hccNumberTypeId,'allPreArtIds');
CALL getAllIdentifiers(@reportEndDate,@chronicCareNumberTypeId,'allCccIds');
CALL getIdentifierForProgram(@hivProgramId, CONCAT(@arvNumberTypeId,',',@hccNumberTypeId), @reportEndDate, 'activeHivId');
CALL getIdentifierForProgram(@chronicCareProgramId, @chronicCareNumberTypeId, @reportEndDate, 'activeCCCId');
-- General Visits and outcomes
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@CC_I,',',@CC_F,',',@DH_I,',',@DH_F,',',@A_I,',',@A_F,',',@E_I,',',@E_F,',',@M_I,',',@M_F), @reportEndDate, 'last', 'lastNcdVisitDate');
CALL getEncounterLocationBeforeEndDate(CONCAT(@CC_I,',',@CC_F,',',@DH_I,',',@DH_F,',',@A_I,',',@A_F,',',@E_I,',',@E_F,',',@M_I,',',@M_F), @reportEndDate, 'last', 'lastNcdVisitLocation');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F), @reportEndDate, 'first', 'firstHivVisitDate');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F), @reportEndDate, 'last', 'lastHivVisitDate');
CALL getEncounterLocationBeforeEndDate(CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F), @reportEndDate, 'last', 'lastHivVisitLocation');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F,',',@CC_I,',',@CC_F,',',@DH_I,',',@DH_F,',',@A_I,',',@A_F,',',@E_I,',',@E_F,',',@M_I,',',@M_F), @reportEndDate, 'last', 'lastVisitDate');
CALL getEncounterLocationBeforeEndDate(CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F,',',@CC_I,',',@CC_F,',',@DH_I,',',@DH_F,',',@A_I,',',@A_F,',',@E_I,',',@E_F,',',@M_I,',',@M_F), @reportEndDate, 'last', 'lastVisitLocation');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@DH_I,',',@DH_F), @reportEndDate, 'last', 'lastHtnDmVisitDate');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@E_I,',',@E_F), @reportEndDate, 'last', 'lastEpilepsyVisitDate');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@A_I,',',@A_F), @reportEndDate, 'last', 'lastChronicLungVisitDate');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@M_I,',',@M_F), @reportEndDate, 'last', 'lastMentalHealthVisitDate');
CALL updateIc3EnrollmentInfo(@reportEndDate);
CALL updateProgramsEnrollmentDate();
-- HIV Program Information
CALL updateFirstViralLoad(@reportEndDate);
CALL updateLastViralLoad(@reportEndDate);
CALL getLastOutcomeForProgram(@hivProgramId, @reportEndDate, 'lastHivOutcome', 'lastHivOutcomeDate');
CALL everDefaultedByProgram('HIV Program', 'everDefaultedHiv');
CALL getLastOutcomeForProgram(@chronicCareProgramId, @reportEndDate, 'lastNcdOutcome', 'lastNcdOutcomeDate');
CALL everDefaultedByProgram('CHRONIC CARE PROGRAM', 'everDefaultedNcd');
CALL getEncounterLocationBeforeEndDate(CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F), @reportEndDate, 'last', 'lastHivVisitLocation');
CALL getDatetimeObsBeforeDate(@artStartDateConceptId, @reportEndDate, 'last', 'artInitialDate');
CALL updateRecentRegimen(@reportEndDate);
CALL getCodedObsFromEncounterBeforeDate(@tbStatusConceptId, CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F), @reportEndDate, 'last', 'lastTbValueInHiv');
CALL getEncounterDatetimeBeforeEndDate(CONCAT(@ART_I,',',@ART_FOLLOWUP,',',@PART_I,',',@PART_F), @reportEndDate, 'last', 'lastTbDateInHiv');

-- Hypertension Information
CALL getDiagnosisBoolean(@chronicCareDiagnosisConceptId, @hypertensionConceptId, @reportEndDate, 'htnDx');
CALL getDiagnosisDate(@chronicCareDiagnosisConceptId, @hypertensionConceptId, @diagnosisDateConceptId, @reportEndDate, 'first', 'firstHtnDxDate');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@captoprilConceptId,',',@amlodipineConceptId,',',@enalaprilConceptId,',',@nifedipineConceptId,',',@atenololConceptId,',',@lisinoprilConceptId,',',@propranololConceptId,',',@diureticsClassConceptId,',',@calciumChannelBlockersClassConceptId,',',@aceInhibitorsClassConceptId,',',@betaBlockersClassConceptId,',',@aspirinConceptId,',',@statinsClassConceptId), @reportEndDate, 'first', 'firstHtnMedsDate');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@captoprilConceptId,',',@amlodipineConceptId,',',@enalaprilConceptId,',',@nifedipineConceptId,',',@atenololConceptId,',',@lisinoprilConceptId,',',@propranololConceptId,',',@diureticsClassConceptId,',',@calciumChannelBlockersClassConceptId,',',@aceInhibitorsClassConceptId,',',@betaBlockersClassConceptId), @reportEndDate, 'last', 'lastHtnMedsDate');
CALL getEncounterLocationForCodedObs(@currentDrugsUsedConceptId, CONCAT(@captoprilConceptId,',',@amlodipineConceptId,',',@enalaprilConceptId,',',@nifedipineConceptId,',',@atenololConceptId,',',@lisinoprilConceptId,',',@propranololConceptId,',',@diureticsClassConceptId,',',@calciumChannelBlockersClassConceptId,',',@aceInhibitorsClassConceptId,',',@betaBlockersClassConceptId), @reportEndDate, 'last', 'lastHtnMedsLocation');
CALL getBloodPressureBeforeDate(@reportEndDate, 'first', 'firstBpDate', 'firstBp');
CALL getBloodPressureBeforeDate(@reportEndDate, 'last', 'lastBpDate', 'lastBp');
-- Hypertension Meds
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), CONCAT(@diureticsClassConceptId,',',@hydrochlorothiazideConceptId,',',@furosemideConceptId,',',@spironolactoneConceptId), @reportEndDate, 'last', 'diuretic');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), CONCAT(@calciumChannelBlockersClassConceptId,',',@amlodipineConceptId,',',@nifedipineConceptId), @reportEndDate, 'last', 'calciumChannelBlocker');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), CONCAT(@aceInhibitorsClassConceptId,',',@enalaprilConceptId,',',@captoprilConceptId,',',@lisinoprilConceptId), @reportEndDate, 'last', 'aceIInhibitor');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), CONCAT(@betaBlockersClassConceptId,',',@atenololConceptId,',',@bisoprololConceptId,',',@propranololConceptId), @reportEndDate, 'last', 'betaBlocker');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), CONCAT(@statinsClassConceptId,',',@simvastatinConceptId,',',@pravastatinConceptId,',',@atorvastatinConceptId), @reportEndDate, 'last', 'statin');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), CONCAT(@aspirinConceptId,',',@hydralazineConceptId,',',@isosorbideMononitrateConceptId), @reportEndDate, 'last', 'otherHtnMeds');
-- Diabetes Information
CALL getDiagnosisBoolean(@chronicCareDiagnosisConceptId, CONCAT(@type1DiabetesConceptId,',',@type2DiabetesConceptId,',',@diabetesConceptId), @reportEndDate, 'dmDx');
CALL getDiagnosisDate(@chronicCareDiagnosisConceptId, CONCAT(@type1DiabetesConceptId,',',@type2DiabetesConceptId,',',@diabetesConceptId), @diagnosisDateConceptId, @reportEndDate, 'first', 'firstDmDxDate');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@chronicCareDiagnosisConceptId, @DH_I, CONCAT(@type1DiabetesConceptId,',',@type2DiabetesConceptId), @reportEndDate, 'last', 'diabetesType');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@metforminConceptId,',',@insulinConceptId,',',@glibenclamideConceptId), @reportEndDate, 'first', 'firstDmMedsDate');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@metforminConceptId,',',@insulinConceptId,',',@glibenclamideConceptId), @reportEndDate, 'last', 'lastDmMedsDate');
CALL getEncounterLocationForCodedObs(@currentDrugsUsedConceptId, CONCAT(@metforminConceptId,',',@insulinConceptId,',',@glibenclamideConceptId), @reportEndDate, 'last', 'lastDmMedsLocation');
CALL getBloodGlucoseBeforeDate(@reportEndDate, 'first', 'firstGlucoseMonitoringDate','firstVisitHba1c','firstVisitRandomBloodSugar','firstVisitFastingBloodSugar');
CALL getBloodGlucoseBeforeDate(@reportEndDate, 'last', 'lastGlucoseMonitoringDate','lastVisitHba1c','lastVisitRandomBloodSugar','lastVisitFastingBloodSugar');
-- Diabetes Meds
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), @regularInsulinConceptId, @reportEndDate, 'last', 'shortActingRegularInsulin');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), @longActingInsulinConceptId, @reportEndDate, 'last', 'longActingInsulin');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), @metforminConceptId, @reportEndDate, 'last', 'metformin');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, CONCAT(@CC_F,',',@DH_F), @glibenclamideConceptId, @reportEndDate, 'last', 'glibenclamide');
-- Epilepsy Information
CALL getDiagnosisBoolean(@chronicCareDiagnosisConceptId, @epilepsyConceptId, @reportEndDate, 'epilepsyDx');
CALL getDiagnosisDate(@chronicCareDiagnosisConceptId, @epilepsyConceptId, @diagnosisDateConceptId, @reportEndDate, 'first', 'firstEpilepsyDxDate');
CALL getEpilepsyOnsetDate(@reportEndDate, 'last', 'epilepsyOnsetDate');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@phenobarbitalConceptId,',',@phenytoinConceptId,',',@carbamazepineConceptId), @reportEndDate, 'first', 'firstEpilepsyMedsDate');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@phenobarbitalConceptId,',',@phenytoinConceptId,',',@carbamazepineConceptId), @reportEndDate, 'last', 'lastEpilepsyMedsDate');
CALL getEncounterLocationForCodedObs(@currentDrugsUsedConceptId, CONCAT(@phenobarbitalConceptId,',',@phenytoinConceptId,',',@carbamazepineConceptId), @reportEndDate, 'last', 'lastEpilepsyMedsLocation');
CALL getEncounterDateForObs(@numberOfSeizuresConceptId, @reportEndDate, 'first', 'firstSeizuresDate');
CALL getNumericObsBeforeDate(@numberOfSeizuresConceptId, @reportEndDate, 'first', 'firstSeizures');
CALL getEncounterDateForObs(@numberOfSeizuresConceptId, @reportEndDate, 'last', 'lastSeizuresDate');
CALL getNumericObsBeforeDate(@numberOfSeizuresConceptId, @reportEndDate, 'last', 'lastSeizures');
CALL getCodedObsWithValuesFromEncounterBeforeDate(@currentDrugsUsedConceptId, @E_F, CONCAT(@alcoholTriggerConceptId,',',@feverTriggerConceptId,',',@soundLightTouchTriggerConceptId,',',@emotionalStressTriggerConceptId,',',@sleepDeprivationTriggerConceptId,',',@missedMedicationTriggerConceptId,',',@menstruationTriggerConceptId), @reportEndDate, 'last', 'seizureTriggers');
-- Asthma Information (added COPD)
CALL getDiagnosisBoolean(@chronicCareDiagnosisConceptId, @asthmaConceptId, @reportEndDate, 'asthmaDx');
CALL getDiagnosisDate(@chronicCareDiagnosisConceptId, @asthmaConceptId, @diagnosisDateConceptId, @reportEndDate, 'first', 'firstAsthmaDxDate');
CALL getEncounterDateForCodedObs(CONCAT(@currentDrugsUsedConceptId,',',@chronicLungDiseaseTreatmentConceptId), CONCAT(@salbutamolConceptId,',',@beclomethasoneConceptId,',',@inhaledBetaAgonistsConceptId,',',@inhaledSteroidConceptId,',',@oralSteroidConceptId,',',@otherNonCodedConceptId), @reportEndDate, 'first', 'firstChronicLungMedsDate');
CALL getEncounterDateForCodedObs(CONCAT(@currentDrugsUsedConceptId,',',@chronicLungDiseaseTreatmentConceptId), CONCAT(@salbutamolConceptId,',',@beclomethasoneConceptId,',',@inhaledBetaAgonistsConceptId,',',@inhaledSteroidConceptId,',',@oralSteroidConceptId,',',@otherNonCodedConceptId), @reportEndDate, 'last', 'lastChronicLungMedsDate');
CALL getEncounterLocationForCodedObs(CONCAT(@currentDrugsUsedConceptId,',',@chronicLungDiseaseTreatmentConceptId), CONCAT(@salbutamolConceptId,',',@beclomethasoneConceptId,',',@inhaledBetaAgonistsConceptId,',',@inhaledSteroidConceptId,',',@oralSteroidConceptId,',',@otherNonCodedConceptId), @reportEndDate, 'last', 'lastChronicLungMedsLocation');
CALL getEncounterDateForCodedObs(@asthmaClassificationConceptId, CONCAT(@asthmaNotAtAllConceptId,',',@asthmaIntermittentConceptId,',',@asthmaMildPersistentConceptId,',',@asthmaModeratePersistentConceptId,',',@asthmaSeverePersistentConceptId,',',@asthmaSevereUncontrolledConceptId), @reportEndDate, 'first', 'firstAsthmaSeverityDate');
CALL getCodedObsBeforeDate(@asthmaClassificationConceptId, @reportEndDate, 'first', 'firstAsthmaSeverity');
CALL getEncounterDateForCodedObs(@asthmaClassificationConceptId, CONCAT(@asthmaNotAtAllConceptId,',',@asthmaIntermittentConceptId,',',@asthmaMildPersistentConceptId,',',@asthmaModeratePersistentConceptId,',',@asthmaSeverePersistentConceptId,',',@asthmaSevereUncontrolledConceptId), @reportEndDate, 'last', 'lastAsthmaSeverityDate');
CALL getCodedObsBeforeDate(@asthmaClassificationConceptId, @reportEndDate, 'last', 'lastAsthmaSeverity');
CALL getDiagnosisBoolean(@chronicCareDiagnosisConceptId, @copdConceptId, @reportEndDate, 'copdDx');
CALL getDiagnosisDate(@chronicCareDiagnosisConceptId, @copdConceptId, @diagnosisDateConceptId, @reportEndDate, 'first', 'copdDiagnosisDate');
-- Asthma Meds
CALL getCodedObsWithValuesFromEncounterBeforeDate(CONCAT(@currentDrugsUsedConceptId,',',@chronicLungDiseaseTreatmentConceptId), CONCAT(@CC_F,',',@A_F), CONCAT(@inhaledBetaAgonistsConceptId,',',@salbutamolConceptId), @reportEndDate, 'last', 'inhaledBAgonist');
CALL getCodedObsWithValuesFromEncounterBeforeDate(CONCAT(@currentDrugsUsedConceptId,',',@chronicLungDiseaseTreatmentConceptId), CONCAT(@CC_F,',',@A_F), CONCAT(@inhaledSteroidConceptId,',',@beclomethasoneConceptId), @reportEndDate, 'last', 'inhaledSteroid');
CALL getCodedObsWithValuesFromEncounterBeforeDate(CONCAT(@currentDrugsUsedConceptId,',',@chronicLungDiseaseTreatmentConceptId), CONCAT(@CC_F,',',@A_F), @oralSteroidConceptId, @reportEndDate, 'last', 'oralSteroid');
CALL getCodedObsWithValuesFromEncounterBeforeDate(CONCAT(@currentDrugsUsedConceptId,',',@chronicLungDiseaseTreatmentConceptId), CONCAT(@CC_F,',',@A_F), @otherNonCodedConceptId, @reportEndDate, 'last', 'otherAsthmaMeds');
-- Mental Health Information
CALL getDiagnosisBoolean(@chronicCareDiagnosisConceptId, CONCAT(@schizophreniaConceptId,',',@depressionConceptId,',',@acutePsychoticDisorderConceptId,',',@schizoaffectiveDisorderConceptId,',',@anxietyDisorderConceptId,',',@organicMentalDisorderAcuteConceptId,',',@organicMentalDisorderChronicConceptId,',',@alcoholInducedMentalDisorderConceptId,',',@drugInducedMentalDisorderConceptId,',',@bipolarManicConceptId,',',@otherMentalHealthDxNonCodedConceptId,',',@otherMentalHealthDx1ConceptId,',',@otherMentalHealthDx2ConceptId), @reportEndDate, 'mentalDx');
CALL getDiagnosisList(@chronicCareDiagnosisConceptId, CONCAT(@schizophreniaConceptId,',',@depressionConceptId,',',@acutePsychoticDisorderConceptId,',',@schizoaffectiveDisorderConceptId,',',@anxietyDisorderConceptId,',',@organicMentalDisorderAcuteConceptId,',',@organicMentalDisorderChronicConceptId,',',@alcoholInducedMentalDisorderConceptId,',',@drugInducedMentalDisorderConceptId,',',@bipolarManicConceptId,',',@otherMentalHealthDxNonCodedConceptId,',',@otherMentalHealthDx1ConceptId,',',@otherMentalHealthDx2ConceptId), @reportEndDate, 'mentalDxList');
CALL getDiagnosisDate(@chronicCareDiagnosisConceptId, CONCAT(@schizophreniaConceptId,',',@depressionConceptId,',',@acutePsychoticDisorderConceptId,',',@schizoaffectiveDisorderConceptId,',',@anxietyDisorderConceptId,',',@organicMentalDisorderAcuteConceptId,',',@organicMentalDisorderChronicConceptId,',',@alcoholInducedMentalDisorderConceptId,',',@drugInducedMentalDisorderConceptId,',',@bipolarManicConceptId,',',@otherMentalHealthDxNonCodedConceptId,',',@otherMentalHealthDx1ConceptId,',',@otherMentalHealthDx2ConceptId), @diagnosisDateConceptId, @reportEndDate, 'first', 'firstMentalHealthDxDate');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@chlorpromazineConceptId,',',@haloperidolConceptId,',',@fluphenazineConceptId,',',@carbamazepineMentalConceptId,',',@carbamazepineMentalConceptId,',',@sodiumValproateConceptId,',',@risperidoneConceptId,',',@fluoxetineConceptId,',',@olanzapineConceptId,',',@clozapineConceptId,',',@trifluoperazineConceptId,',',@clopixolConceptId,',',@otherConceptId), @reportEndDate, 'first', 'firstMentalHealthMedsDate');
CALL getEncounterDateForCodedObs(@currentDrugsUsedConceptId, CONCAT(@chlorpromazineConceptId,',',@haloperidolConceptId,',',@fluphenazineConceptId,',',@carbamazepineMentalConceptId,',',@carbamazepineMentalConceptId,',',@sodiumValproateConceptId,',',@risperidoneConceptId,',',@fluoxetineConceptId,',',@olanzapineConceptId,',',@clozapineConceptId,',',@trifluoperazineConceptId,',',@clopixolConceptId,',',@otherConceptId), @reportEndDate, 'last', 'lastMentalHealthMedsDate');        
CALL getEncounterLocationForCodedObs(@currentDrugsUsedConceptId, CONCAT(@chlorpromazineConceptId,',',@haloperidolConceptId,',',@fluphenazineConceptId,',',@carbamazepineMentalConceptId,',',@carbamazepineMentalConceptId,',',@sodiumValproateConceptId,',',@risperidoneConceptId,',',@fluoxetineConceptId,',',@olanzapineConceptId,',',@clozapineConceptId,',',@trifluoperazineConceptId,',',@clopixolConceptId,',',@otherConceptId), @reportEndDate, 'last', 'lastMentalHealthMedsLocation');
-- BMI Information
CALL getEncounterDateForObs(@weightConceptId, @reportEndDate, 'last', 'lastWeightDate');
CALL getNumericObsBeforeDate(@heightConceptId, @reportEndDate, 'last', 'lastHeight');
CALL getNumericObsBeforeDate(@weightConceptId, @reportEndDate, 'last', 'lastWeight');
-- Diagnoses Logic
CALL diagnosesLogic(); -- Must be last!
-- Appointments
CALL getAppointmentDateForEncounter(@ART_FOLLOWUP, @reportEndDate, 'artAptDate');
CALL getAppointmentDateForEncounter(@DH_F, @reportEndDate, 'htnDmAptDate');
CALL getAppointmentDateForEncounter(@E_F, @reportEndDate, 'epilepsyAptDate');
CALL getAppointmentDateForEncounter(@M_F, @reportEndDate, 'mentalHealthAptDate');
CALL getAppointmentDateForEncounter(@A_F, @reportEndDate, 'chronicLungAptDate');

-- Print report using select - update any column names or reorder here
SELECT
  PID,
  identifier as "Patient Identifier",
  allPreArtIds as "All HCC Identifiers",
  allArtIds as "All ART Identifiers",
  allCccIds as "ALL Chronic Care Identifiers",
  activeHivId as "Active HIV Identifier",
  activeCCCId as "Active Chronic Care Identifier",
  date_format(ic3EnrollmentDate,'%d/%m/%Y') as "Date of First Enrollment in HIV/Chronic Care Programs",
  ic3FirstProgramEnrolled as "First Program Enrollment",
  date_format(ncdEnrollmentDate,'%d/%m/%Y') as "NCD Program Enrollment Date",
  lastNcdOutcome as "NCD Program Outcome",
  everDefaultedNcd as "Ever Defaulted in NCD",
  date_format(lastNcdOutcomeDate,'%d/%m/%Y') as "NCD Program Outcome Date",
  lastNcdVisitLocation as "NCD last visit location",
  date_format(lastNcdVisitDate,'%d/%m/%Y') as "NCD last visit date",
  date_format(lastHtnDmVisitDate,'%d/%m/%Y') as "Last Hypertension/Diabetes encounter date",
  date_format(lastEpilepsyVisitDate,'%d/%m/%Y') as "Last Epilepsy encounter date",
  date_format(lastChronicLungVisitDate,'%d/%m/%Y') as "Last Chronic Lung Diseasee Enounter date",
  date_format(lastMentalHealthVisitDate,'%d/%m/%Y') as "Last Mental Health encounter date",
  date_format(hivEnrollmentDate,'%d/%m/%Y') as "HIV Program Enrollment Date",
  lastHivOutcome as "HIV Program Outcome",
  everDefaultedHiv as "Ever Defaulted in HIV",
  date_format(lastHivOutcomeDate,'%d/%m/%Y') as "HIV Program Outcome Date",
  lastHivVisitLocation as "HIV last visit location",
  date_format(lastHivVisitDate,'%d/%m/%Y') as "HIV last visit date",
  date_format(lastVisitDate,'%d/%m/%Y') as "Last IC3 visit date",
  lastVisitLocation as "Last IC3 visit location",
  hivAtLeastOneNcd as "HIV and at least one NCD",
  atLeastTwoNcds as "At least two NCDs",
  htnAndDm as "Hypertension and Diabetes",
  hivAndDm as "HIV and Diabetes",
  firstName as "Given Name",
  lastName as "Last Name",
  village as "Village",
  ta as "TA",
  district as "District",
  date_format(birthdate,'%d/%m/%Y') as "Birthdate",
  gender as "Gender",
  ageAtFirstEnrollment as "Age at First Enrollment",
  age as "Current Age",
-- VHW here  
  date_format(firstHivVisitDate,'%d/%m/%Y') as "HIV Program first visit date",
  date_format(artInitialDate,'%d/%m/%Y') as "ART initial date",
  lastTbValueInHiv as "Last TB status in HIV program", 
  date_format(lastTbDateInHiv,'%d/%m/%Y') as "Last TB Status Date",
  date_format(firstViralLoadDate,'%d/%m/%Y') as "Date of first viral load",
  firstViralLoadResult as "First viral load result",
  date_format(lastViralLoadDate,'%d/%m/%Y') as "Date of most recent viral load",
  lastViralLoadResult as "Most recent viral load result",
  lastViralLoadWeight as "Weight for Most recent viral load",
  date_format(lastArtRegimenStart,'%d/%m/%Y') as "ART Current regimen start date",
  lastArtRegimen as "ART Current Regimen",
  htnDx as "Hypertension Diagnosis",
  date_format(firstHtnDxDate,'%d/%m/%Y') as "Hypertension Diagnosis Date",
  date_format(firstHtnMedsDate,'%d/%m/%Y') as "First Hypertension Treatment Date",
  date_format(lastHtnMedsDate,'%d/%m/%Y') as "Last Hypertension Treatment Date",
  lastHtnMedsLocation as "Last Hypertension Treatment Location",
  firstBp as "First BP Measurment",
  date_format(firstBpDate,'%d/%m/%Y') as "First BP Measurement Date",
  lastBp as "Most recent BP Measurement",  
  date_format(lastBpDate,'%d/%m/%Y') as "Most recent BP Measurement Date",
  diuretic as "Diuretics given at last visit",  
  calciumChannelBlocker as "CCBs given at last visit",  
  aceIInhibitor as "ACE-Is given at last visit",  
  betaBlocker as "Beta Blockers given at last visit",  
  statin as "Statins given at last visit",  
  otherHtnMeds as "Other HTN medications given at last visit",
  dmDx as "Diabetes Diagnosis",
  date_format(firstDmDxDate,'%d/%m/%Y') as "Diabetes Diagnosis Date",
  diabetesType as "Diabetes Type",
  firstDmMedsDate "First Diabetes Treatment Date",
  date_format(lastDmMedsDate,'%d/%m/%Y') as "Last Diabetes Treatment Date",
  lastDmMedsLocation as "Last Diabetes Treatment Location",
  date_format(firstGlucoseMonitoringDate,'%d/%m/%Y') as "Date of first visit with glucose monitoring",
  firstVisitHba1c as "HbA1c at first visit",
  firstVisitRandomBloodSugar as "Random blood sugar at first visit",
  firstVisitFastingBloodSugar as "Fasting blood sugar at first visit",
  date_format(lastGlucoseMonitoringDate,'%d/%m/%Y') as "Date of last visit with glucose monitoring",
  lastVisitHba1c as "HbA1c at last visit",
  lastVisitRandomBloodSugar as "Random blood sugar at last visit",
  lastVisitFastingBloodSugar as "Fasting blood sugar at last visit",
  shortActingRegularInsulin as "Short Acting Insulin given at last visit",  
  longActingInsulin as "Long Acting Insulin given at last visit",
  metformin as "Metformin given at last visit",  
  glibenclamide as "Glibenclamide given at last visit",  
  epilepsyDx as "Epilepsy Diagnosis",
  date_format(firstEpilepsyDxDate,'%d/%m/%Y') as "Epilepsy Diagnosis Date",
  date_format(epilepsyOnsetDate,'%d/%m/%Y') as "Epilepsy Onset Date",
  date_format(firstEpilepsyMedsDate,'%d/%m/%Y') as "First Epilepsy Treatment Date",
  date_format(lastEpilepsyMedsDate,'%d/%m/%Y') as "Last Epilepsy Treatment Date",
  lastEpilepsyMedsLocation as "First Epilepsy Treatment Location",
  date_format(firstSeizuresDate,'%d/%m/%Y') as "Date seizures first reported to clinician",
  firstSeizures as "Number of seizures first recorded",
  date_format(lastSeizuresDate,'%d/%m/%Y') as "Date seizures last reported to clinician",
  lastSeizures as "Last number of seizures recorded",
  seizureTriggers as "Seizure triggers",
  asthmaDx as "Asthma Diagnosis",
  date_format(firstAsthmaDxDate,'%d/%m/%Y') as "Asthma Diagnosis Date",
  copdDx as "COPD Diagnosis",
  date_format(copdDiagnosisDate,'%d/%m/%Y') as "COPD Diagnosis Date",
  date_format(firstChronicLungMedsDate,'%d/%m/%Y') as "First Chronic Lung Treatment Date",
  date_format(lastChronicLungMedsDate,'%d/%m/%Y') as "Last Chronic Lung Treatment Date",
  lastChronicLungMedsLocation as "Last Chronic Lung Treatment Location",
  date_format(firstAsthmaSeverityDate,'%d/%m/%Y') as "First Asthma Severity Date",
  firstAsthmaSeverity as "First Asthma Severity",
  date_format(lastAsthmaSeverityDate,'%d/%m/%Y') as "Last Asthma Severity Date",
  lastAsthmaSeverity as "Last Asthma Severity",
  inhaledBAgonist as "Inhaled B-Agonist given at last visit",
  inhaledSteroid as "Inhaled steroid given at last visit",
  oralSteroid as "Oral steroid given at last visit",
  otherAsthmaMeds as "Other Chronic Lung medications given at last visit",
  mentalDx as "Mental Health Diagnosis",
  mentalDxList as "Mental Health Diagnoses",
  date_format(firstMentalHealthDxDate,'%d/%m/%Y') as "Mental Health Diagnosis Date",
  date_format(firstMentalHealthMedsDate,'%d/%m/%Y') as "First Mental Health Treatment Date",
  date_format(lastMentalHealthMedsDate,'%d/%m/%Y') "Last Mental Health Treatement Date",
  lastMentalHealthMedsLocation "Last Mental Health Treatment Location",
  date_format(lastWeightDate,'%d/%m/%Y') "Last Weight Date",
  lastHeight "Last Height",
  lastWeight "Last Weight",
  CASE WHEN age >= 19 
    THEN round(lastWeight/POWER(lastHeight/100,2),1)
  END AS BMI,
  date_format(artAptDate,'%d/%m/%Y') as "Next ART Appointment",
  date_format(htnDmAptDate,'%d/%m/%Y') as "Next Hypertension/Diabetes Appointment",
  date_format(epilepsyAptDate,'%d/%m/%Y') as "Next Epilepsy Appointment",
  date_format(chronicLungAptDate,'%d/%m/%Y') as "Next Chronic Lung Appointment",
  date_format(mentalHealthAptDate,'%d/%m/%Y') as "Next Mental Health Appointment"
FROM warehouseCohortTable;




