import { ncdEncounterWorkspace } from '../shared/ncd-encounter-workspace';
import { TC_CARD_KEY, TC_FORMS } from './tc-concepts';
import { TC_SURVEY_FIELDS } from './tc-survey-fields';

/** Records or edits a teen club intake survey as teen-club-intake-survey.xml does, in its parts */
const TcSurveyWorkspace = ncdEncounterWorkspace({
  cardKey: TC_CARD_KEY,
  form: TC_FORMS.survey,
  fields: TC_SURVEY_FIELDS,
  record: ['recordIntakeSurvey', 'Record intake survey'],
  edit: ['editIntakeSurvey', 'Edit intake survey'],
});

export default TcSurveyWorkspace;
