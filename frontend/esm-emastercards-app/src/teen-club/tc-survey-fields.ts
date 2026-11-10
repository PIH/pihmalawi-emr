import { type ArtField } from '../art/art-fields';

/**
 * teen-club-intake-survey.xml's questions, by the part of the survey that asks them (UUIDs lower-cased, as REST
 * returns them). Its answers carry no labels in the form, so they are labelled as the concepts are named. Its purpose
 * of teen club is a text concept the form offers answers for, which it can't save as such: it is asked as text.
 */
export type SurveySection = 'interview' | 'school' | 'household' | 'teenClub' | 'hivKnowledge' | 'risk' | 'career';

export const TC_SURVEY_SECTIONS: Record<SurveySection, { title: string; fields: Array<ArtField> }> = {
  interview: {
    title: 'Interview',
    fields: [
      { name: 'interviewDate', concept: '655ff71c-977f-11e1-8993-905e29aff6c1', kind: 'date', label: 'Interview date' },
      { name: 'interviewerName', concept: '9562d3b9-11cf-4522-a062-e9aaa94f38b4', kind: 'text', label: 'Name of interviewer' },
      { name: 'villageName', concept: '6560b5ee-977f-11e1-8993-905e29aff6c1', kind: 'text', label: 'Village name' },
      {
        name: 'gender',
        concept: '65615422-977f-11e1-8993-905e29aff6c1',
        kind: 'coded',
        label: 'Gender',
        options: [
          { value: '65615210-977f-11e1-8993-905e29aff6c1', label: 'Male' },
          { value: '6561531e-977f-11e1-8993-905e29aff6c1', label: 'Female' },
        ],
      },
    ],
  },
  school: {
    title: 'School',
    fields: [
      {
        name: 'literate',
        concept: '6a8daa8a-d0d7-493b-ab12-521a9bc18fce',
        kind: 'coded',
        label: 'Literate',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'currentlyInSchool',
        concept: 'f39717e7-b68b-4ec1-8094-a6c0ae930c7f',
        kind: 'coded',
        label: 'In school',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      { name: 'dropSchoolClass', concept: '80f130e3-a53b-4306-a8c9-ee1731575684', kind: 'text', label: 'Class when dropped out of school' },
      { name: 'currentSchoolClass', concept: '9715e824-23d7-44ed-a6a8-ea6fbeced93f', kind: 'text', label: 'Current school class' },
      {
        name: 'plansAfterSchool',
        concept: 'e1eef37b-98f5-4c86-9560-c090e5b1731f',
        kind: 'coded',
        label: 'Plans after school',
        options: [
          { value: 'b0cccb19-5744-4d7c-a20f-5357d8eedfa8', label: 'Get a job' },
          { value: '3b7d62ef-c044-4cfa-bf44-ba3fcdea70ee', label: 'Business' },
          { value: '534c8fba-8077-445a-a2dd-ab90d5af8090', label: 'Further Education' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
      },
    ],
  },
  household: {
    title: 'Household',
    fields: [
      {
        name: 'primaryGuardian',
        concept: '807bcfed-6fb9-4ca3-bb46-8286a51906a2',
        kind: 'coded',
        label: 'Primary Guardian',
        options: [
          { value: 'ce0af2a6-d6f4-4d13-8af3-ea4ad378a653', label: 'Biological parent (single)' },
          { value: '49e133bf-efc9-49f9-91af-1cc26fa88ec6', label: 'Biological parents (both)' },
          { value: 'aa109c28-7745-480e-a3c2-d0bc9f1a2719', label: 'Grandparents' },
          { value: 'd0c7636d-9d5e-4c1c-9656-e76689398ce5', label: 'Elder relative' },
          { value: 'dadec55d-864d-4f33-bfc2-06fccccd6a2a', label: 'Non-Relative (neighbor,friend,community person)' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
        select: true,
      },
      { name: 'parentsLocation', concept: 'b7d8d419-2451-44ec-9b6b-9b855f9cc443', kind: 'text', label: "Parents' location" },
      {
        name: 'reasonForSingleParent',
        concept: '0b6a3722-c4d3-44ba-afd4-6185eba83849',
        kind: 'coded',
        label: 'Reason for staying with single parent',
        options: [
          { value: 'bf061dbe-7ead-43a9-a8db-a6869b2daea1', label: 'Parents divorced' },
          { value: 'c4c3dd23-48a1-4f24-9415-8865ef45b9e0', label: 'Parents died' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
      },
      {
        name: 'numberOfHouseholdMembers',
        concept: '441ed2b2-623a-42a0-aa7b-d16327cfc697',
        kind: 'number',
        label: 'People in the household, including the patient',
      },
      {
        name: 'radio',
        concept: '4b09025d-f92c-444c-a972-828a98a88bf0',
        kind: 'coded',
        label: 'Household owns a radio',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'tv',
        concept: '5c46ba89-e523-463c-ba37-635c90d23443',
        kind: 'coded',
        label: 'Household owns a TV',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'phone',
        concept: '205ab520-0ac5-4004-90e4-f2ba10f79a2b',
        kind: 'coded',
        label: 'Household owns a mobile phone',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'fridge',
        concept: 'd531e6b5-cf09-41de-8f27-f846b42c6c6f',
        kind: 'coded',
        label: 'Household owns a refrigerator',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'bike',
        concept: 'b12adc9a-233b-4ac1-bed6-680dd00c7946',
        kind: 'coded',
        label: 'Household owns a bicycle',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'motorBike',
        concept: '75c35596-4e81-4764-9e0a-7b06b87ddceb',
        kind: 'coded',
        label: 'Household owns a motorcycle',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'cart',
        concept: 'a85c5276-3f4a-4e5a-bfd4-dc0595662cb3',
        kind: 'coded',
        label: 'Household owns an animal-drawn cart',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'truck',
        concept: '05742f26-375a-4e38-b9ee-7c7d0780c538',
        kind: 'coded',
        label: 'Household owns a car or truck',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'lightingSource',
        concept: '79f2c8bd-68ee-4dde-9af4-3f594052df1b',
        kind: 'coded',
        label: 'What is the main source of energy for lighting in the household?',
        options: [
          { value: '4f3d9103-a1d2-40cb-953b-9aeeb9950147', label: 'Electricity' },
          { value: '8f8f610c-5db5-4631-85d8-4e4c413e65c5', label: 'Solar' },
          { value: '03fb4666-62b6-4ae3-a086-f6c0e6d9b9c3', label: 'Gas' },
          { value: '1ecdd3d4-3dbc-4e50-a17a-d64f84ed9886', label: 'Paraffin Lamp' },
          { value: '499d2f21-86e8-4e81-93fa-f44b3c3e09b6', label: 'Torch' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
        select: true,
      },
      {
        name: 'drinkingWaterSource',
        concept: '9243dd06-bb9a-4b7d-8bbc-e82d16c30e65',
        kind: 'coded',
        label: 'What is the main source of drinking water in the household?',
        options: [
          { value: '41b2529c-e8d9-4f28-92cd-4b7847c23f5e', label: 'Piped Water' },
          { value: 'd9ba6164-60ca-4540-a080-01b4c24f64d2', label: 'Dug Well' },
          { value: '2d901246-1c15-495c-8102-02b3a7fbfbc3', label: 'Spring water' },
          { value: '0db5816d-8349-400d-a617-013f1e9658f7', label: 'Bottled Water' },
          { value: 'c07c34ad-08e7-469c-a3d5-3c93f46ff5f8', label: 'Borehole' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
        select: true,
      },
      {
        name: 'toiletAtHome',
        concept: '9bcdf631-c727-48e7-98fd-795fcd544d32',
        kind: 'coded',
        label: 'Do you have a toilet at home?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'kindOfToilet',
        concept: '353df499-ffb9-4ca5-a63a-0ec6fb029e94',
        kind: 'coded',
        label: 'What kind of toilet facility do members of your household usually use?',
        options: [
          { value: '219fa3bd-df79-456c-a188-3b57cbe9440e', label: 'Flush Toilet' },
          { value: '76a54a76-5a16-4767-9655-d3e1f0f6f13f', label: 'Pit Latrine' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
      },
      {
        name: 'cookingEnergy',
        concept: '5755fdfc-586b-4816-9223-f45a1422e20a',
        kind: 'coded',
        label: 'What type of fuel does your household mainly use for cooking?',
        options: [
          { value: '4f3d9103-a1d2-40cb-953b-9aeeb9950147', label: 'Electricity' },
          { value: 'ae3b79fe-4d32-46a0-a756-f6bfc4c19c73', label: 'Firewood' },
          { value: '13635bd8-b5f2-470a-9ff1-80fd465f6f53', label: 'Charcoal' },
          { value: '235ff344-df36-4ae9-bbf6-a8d7828ec5ff', label: 'Bottled Gas' },
          { value: '673079b3-1af7-4213-a6ed-02c20905cbf2', label: 'Paraffin/kerosene' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
        select: true,
      },
      {
        name: 'typeOfHouseFloor',
        concept: '07f1ce88-dd02-47ff-8f0c-b39fc8616345',
        kind: 'coded',
        label: 'What type of flooring does your home have?',
        options: [
          { value: '47baac9f-9d34-4d5f-961a-cdfaac2c590c', label: 'Earth/sand' },
          { value: '254e6d65-e086-40c8-94fe-887200292c60', label: 'Cement' },
          { value: '2ea253ad-2a61-4d2d-8896-42fda71fd170', label: 'Tiles' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
      },
      {
        name: 'typeOfHouseWalls',
        concept: '9c7bd3d9-096f-4f33-9781-2b3a23fee8ed',
        kind: 'coded',
        label: 'What are the walls of the house made of?',
        options: [
          { value: '254e6d65-e086-40c8-94fe-887200292c60', label: 'Cement' },
          { value: '64f04067-ba95-42d1-84c0-d1b9fee1d03c', label: 'Mud' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
      },
      {
        name: 'typeOfHouseRoof',
        concept: '7ee0bf27-9473-48d0-b9e5-cdfe67d34ab2',
        kind: 'coded',
        label: 'What type of roof is your house made of?',
        options: [
          { value: '2ea253ad-2a61-4d2d-8896-42fda71fd170', label: 'Tiles' },
          { value: '5eec9066-13b0-4f9f-a236-0fbaa8d7a836', label: 'Grass' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
      },
    ],
  },
  teenClub: {
    title: 'Teen Club',
    fields: [
      {
        name: 'enrolledInTeenClub',
        concept: 'd3dde05f-9296-4482-8e2c-788b615c5e91',
        kind: 'coded',
        label: 'Are you already enrolled in teen club?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'purpose',
        concept: '5ab64ea0-61d0-40a2-a713-8bc580fc0993',
        kind: 'text',
        label: 'What do you understand as the purpose of teen club?',
      },
      {
        name: 'teenClubActivities',
        concept: '07a5b93a-104a-4a25-978d-2079bd25332a',
        kind: 'text',
        label: 'What sort of activities do you do at the teen clubs?',
      },
      {
        name: 'teenClubTopics',
        concept: 'b7eeb296-53b3-4696-9cee-4c88a7c4c072',
        kind: 'text',
        label: 'What topics do you cover when you meet as teen clubs?',
      },
      {
        name: 'socialSupport',
        concept: '7ed120af-0973-4650-b184-ebd31f78f015',
        kind: 'coded',
        label: "Did you get any social support from teens' club?",
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      { name: 'teenClubSupport', concept: '04e9aa70-76ec-468c-8308-baa8c0e37c42', kind: 'text', label: 'What kind of support?' },
      {
        name: 'happy',
        concept: '267d6802-7ecb-450e-9b4e-5436c762b511',
        kind: 'coded',
        label: 'Are you happy with teen club?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      { name: 'likeMost', concept: 'c31911f3-038b-42ee-a929-6c14a96ae508', kind: 'text', label: 'What is it that you like most at teen club?' },
      { name: 'dontLike', concept: 'd7172d9b-da71-4f79-9a62-52a9ff550e88', kind: 'text', label: "What is it that you don't like?" },
      {
        name: 'rateSupport',
        concept: '5a86edcb-21e8-4e3a-9472-de9a6d3fbb2b',
        kind: 'coded',
        label: 'How do you rate the support on a scale of 1 to 3?',
        options: [
          { value: '8a723427-24ef-4d25-bc4c-539ddc1f8ae2', label: 'Very satisfied' },
          { value: 'a93e3448-d71a-4cba-851e-0d328a927b94', label: 'Not satisfied' },
          { value: '971caad2-d10f-4202-9d53-b6c80545a23c', label: 'Little satisfied' },
        ],
      },
      {
        name: 'rateLifeChanges',
        concept: '4fbb5e58-b08a-4043-9798-ec22ff5571bf',
        kind: 'coded',
        label: 'Can you rate the changes that happened to your life from the social support on a scale of 1 to 3?',
        options: [
          { value: '8a723427-24ef-4d25-bc4c-539ddc1f8ae2', label: 'Very satisfied' },
          { value: 'a93e3448-d71a-4cba-851e-0d328a927b94', label: 'Not satisfied' },
          { value: '971caad2-d10f-4202-9d53-b6c80545a23c', label: 'Little satisfied' },
        ],
      },
      { name: 'challenges', concept: 'a73a438b-d3f6-47b5-bcfd-bbceae8e7458', kind: 'text', label: 'What challenges do you face in your daily life?' },
      {
        name: 'teenSupport',
        concept: '19d64830-c058-47ef-9a2c-e5ad0a1cca34',
        kind: 'text',
        label: 'What support would you like to get from teens club?',
      },
    ],
  },
  hivKnowledge: {
    title: 'HIV Knowledge and Attitudes',
    fields: [
      {
        name: 'rateHIVKnowledge',
        concept: '5705c64d-41f8-4332-be83-c5ebb2df9693',
        kind: 'coded',
        label: 'How would you rate your level of knowledge about HIV?',
        options: [
          { value: '1e9d2c9b-106d-4ad1-8384-0791f9db7ff3', label: 'Very low' },
          { value: '05b2aac2-56c6-43da-a1dc-6c4eca4efaca', label: 'Low' },
          { value: 'a41eaeb1-1769-4b02-b511-8028e4ae85ec', label: 'High' },
          { value: '81bc5d0f-6a58-4504-9f24-ea6345cb2647', label: 'No Response' },
        ],
      },
      { name: 'hivTransmission', concept: '780658c4-3f9b-4e08-a511-fb1031dc988f', kind: 'text', label: 'How is HIV transmitted?' },
      {
        name: 'prevention',
        concept: '302b77dd-f922-4f38-8f7a-6f76887dff8f',
        kind: 'coded',
        label: 'How is HIV/AIDS prevented?',
        options: [
          { value: '3fbc0349-56aa-40c2-a03a-517da6aab82c', label: 'Using condoms' },
          { value: 'ceb54c50-7376-4449-87a1-f4051edde7e2', label: 'Abstinence' },
          { value: '4c024160-1f3e-4146-8733-4795ed0c445e', label: 'Fidelity' },
          { value: '1fa4b4a6-b849-4442-94d0-f46f4460ce38', label: "Don't Know" },
        ],
      },
      {
        name: 'cured',
        concept: '0490d7ce-2def-48b0-b113-16e68aa19eba',
        kind: 'coded',
        label: 'Can HIV/AIDS be cured?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'healthyPerson',
        concept: '626d3564-a7ff-48e4-a869-e3e347d55357',
        kind: 'coded',
        label: 'Can a healthy-looking person have HIV infection?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'positiveStudent',
        concept: 'd3ab4a01-7942-4925-848e-08a894d4c9f0',
        kind: 'coded',
        label: 'Should an HIV+ student be allowed to continue studying at your school?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'punishment',
        concept: 'da25f6e7-3816-40d7-8d1f-d91f8a157424',
        kind: 'coded',
        label: 'Is HIV a punishment for bad behaviour?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'badLuck',
        concept: 'b317bada-e3fb-403d-bc6e-1d31a1203fbb',
        kind: 'coded',
        label: 'Is HIV just a matter of bad luck?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'infectedPerson',
        concept: '414489ec-b644-4579-a811-853dcdd4cb1e',
        kind: 'coded',
        label: 'Can HIV infected person live longer?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'aroundYou',
        concept: 'ca1fd53c-5de9-4dfd-a106-ecb6fff92f6b',
        kind: 'coded',
        label: 'Are people afraid to be around you?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
    ],
  },
  risk: {
    title: 'Risk Behaviour',
    fields: [
      {
        name: 'injectableDrugs',
        concept: 'abf95156-b5e8-40d7-8935-0ff78513065e',
        kind: 'coded',
        label: 'Has ever used injectable drugs',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'elicitDrugs',
        concept: 'c0b66f98-7580-4c09-885f-cb4f538e6b2c',
        kind: 'coded',
        label: 'Has ever used illicit drugs',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'alcoholInfluence',
        concept: 'bf68d511-2ebf-431e-99dc-e55b38bae7fe',
        kind: 'coded',
        label: 'Has sex under the influence of alcohol',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'exchange',
        concept: '56c5db66-e09b-4f70-a6e3-5b684ac9c524',
        kind: 'coded',
        label: 'Ever had sex in exchange for money, goods or favours?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'older',
        concept: '98759c39-5164-43fe-99ab-44dffb5cf966',
        kind: 'coded',
        label: 'Ever had sex with someone 5 or more years younger or older?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
    ],
  },
  career: {
    title: 'Career and Aspirations',
    fields: [
      {
        name: 'thinkingAboutFuture',
        concept: 'f4d4508e-c2a3-464d-804c-8f68e6fcb070',
        kind: 'coded',
        label: 'Have you started thinking about your future career or job aspirations?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      {
        name: 'job',
        concept: '7d2a7965-9e3a-4f7b-822f-f5728f2c8596',
        kind: 'text',
        label: 'What career job would you like to do when you finish school?',
      },
      {
        name: 'areasOfStudyInterest',
        concept: 'fb69f4f8-118f-4362-b054-1b29ece01de7',
        kind: 'coded',
        label: 'What subjects or areas of study interest you the most?',
        options: [
          { value: 'ca2fcfbe-3d92-46fa-8fe3-844aac33376c', label: 'Science and Math' },
          { value: '5d56164d-4b9e-4b50-ba37-b9df6597642a', label: 'Arts and Humanities' },
          { value: 'df51523a-559e-4e81-b883-f2615a3a5043', label: 'Business and Entrepreneurship' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
      },
      {
        name: 'extracurricular',
        concept: '4bd44d80-5409-4c7f-a2d2-d623fdfdfc93',
        kind: 'coded',
        label: 'Are you currently involved in any extracurricular activities or clubs related to your career interests?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      { name: 'activitiesList', concept: 'a8de56b1-833c-4293-8cc3-1281cd8cbd02', kind: 'text', label: 'What extracurricular activities or clubs?' },
      {
        name: 'industries',
        concept: 'dab43cd5-1de7-440a-af65-b50f224c025a',
        kind: 'coded',
        label: 'Are there any specific careers or industries that you are curious about or would like to learn more about?',
        options: [
          { value: '1d0345e8-7565-454c-9bf7-19f4dfcfc61e', label: 'Healthcare and medicine' },
          { value: '5f201508-2345-4501-bdd0-f5a8623c7162', label: 'Technology and IT' },
          { value: '67be71c3-9ec6-4cca-9f2e-9cb0a52a3f4e', label: 'Creative arts and design' },
          { value: 'df51523a-559e-4e81-b883-f2615a3a5043', label: 'Business and Entrepreneurship' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
        select: true,
      },
      {
        name: 'haveRoleModels',
        concept: '8dcf744f-4f22-484a-8d6d-c14ebbc53f44',
        kind: 'coded',
        label: 'Are there any role models or professionals in your desired field that you admire or look up to?',
        options: [
          { value: '65576354-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
          { value: '6557646c-977f-11e1-8993-905e29aff6c1', label: 'No' },
        ],
      },
      { name: 'roleModels', concept: '3530488d-4213-4316-adb3-9cf434400a79', kind: 'text', label: 'What is the name of your role model(s)?' },
      {
        name: 'resources',
        concept: '78814f7a-151a-4298-86a4-c265675ab54a',
        kind: 'coded',
        label: 'What kind of support or resources would you feel would be helpful in achieving your aspirations and goals?',
        options: [
          { value: 'df52436f-99fd-425d-ad3b-b96bcd089605', label: 'Mentorship and guidance from professionals or role models' },
          { value: 'b1f909bc-7921-4f3d-aa57-d84f82334659', label: 'Access to educational scholarships or vocational training programs' },
          { value: 'ed2e3078-6b47-49dc-a6a4-ebfaf8648058', label: 'Peer support groups or networks' },
          { value: 'b198d051-b460-4330-a802-d558faf29432', label: 'Financial support' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
        select: true,
      },
      {
        name: 'gotTraining',
        concept: '6c05aef4-e1ca-4772-aef5-581266b44135',
        kind: 'coded',
        label: 'Has obtained vocational training or certifications in the desired field',
        options: [
          { value: '240fe672-00be-4201-838b-3e0a686d05b3', label: 'Yes, I have relevant training or certifications' },
          { value: '8779854a-9e9e-40fe-b3e4-2594b79d2dd7', label: "No, but I'm planning to pursue training or certifications" },
          { value: 'c024e008-b537-4f8f-83e9-03451e55f826', label: 'No, I am not interested in vocational training or certifications' },
        ],
      },
      { name: 'courses', concept: '7eaafacb-5a43-4f7a-abd7-3c340ea68420', kind: 'text', label: 'What courses or what do you want to do in life?' },
      { name: 'exactly', concept: '1d1d41cd-9493-489a-ae58-f8442b50dcd6', kind: 'text', label: 'What exactly do you want to do in life?' },
      {
        name: 'chllngsInPursuingGoals',
        concept: '9230e9b6-5d9e-4a9b-995c-c03bedd5eadd',
        kind: 'coded',
        label: 'What are some challenges you face or have faced in pursuing your career goals outside of school?',
        options: [
          { value: 'a5d749ef-c840-4896-be3c-75cb9c13505d', label: 'Limited job opportunities' },
          { value: 'dee8c72b-c1fb-48fb-a3ef-f56fd40ad20d', label: 'Lack of experience or qualifications' },
          { value: 'a517de4c-093b-46eb-b6b4-a98a65b7422c', label: 'Financial constraints' },
          { value: 'b4068cf3-ee69-4b23-b732-21cdfa321ba0', label: 'Lack of guidance or mentorship' },
          { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
        ],
        select: true,
      },
    ],
  },
};

/** The survey's questions in its order, each part headed by its title */
export const TC_SURVEY_FIELDS: Array<ArtField> = Object.values(TC_SURVEY_SECTIONS).flatMap((s) =>
  s.fields.map((f, i) => (i === 0 ? { ...f, heading: s.title } : f)),
);
