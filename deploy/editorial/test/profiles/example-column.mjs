// Structurally different example (design 9): a site column or short story told by a fictional narrator in the first
// person, with invented scenes, a neutral register, a title field and no verdict lines. Test only; never installed.
const normalize=s=>s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const titles=history=>history.flatMap(({text})=>[...text.matchAll(/^# (.+)$/gmu)].map(m=>m[1]));
export default Object.freeze({
 id:'example-column',language:'ru',persona:Object.freeze({name:'Аркадий Петрович'}),verdictLines:false,categories:null,
 suggestions:Object.freeze(['headline']),contentTypes:Object.freeze({withSource:'reported-column',withoutSource:'story'}),
 maxChars:4096,fields:Object.freeze(['title']),
 unique:(fields,history)=>titles(history).some(t=>normalize(t)===normalize(fields.title))?[{quote:fields.title,problem:'Title repeats a published column.',fix:'Choose a different subject and title.'}]:[],
 slots:Object.freeze({
  // editor.template.md
  editorRole:'You are the final Russian-language editor of a weekly site column: short essays and stories told by Аркадий Петрович, a fictional narrator.',
  editorFields:'; the `title` field is the headline printed above the candidate, it is not part of the text; a title finding quotes `title`',
  meaningConclusion:' an ending that does not follow from the story;',
  meaningParts:' — no two paragraphs may make the same point',
  categoryDistortion:'',
  misattributionFix:' or replaces the quotation with the narrator\'s own remark in his own words',
  misattributionExempt:' The narrator\'s own reflections and common sayings are not misattribution.',
  voiceSlopScenes:'',
  voiceSlop:'an opener or ending formula that repeats recent columns in `history`; emoji; ',
  humorTargets:' or the ending',
  extraSuggestions:'- `headline`: the title is flat, too long or gives the ending away.\n',
  categorySuggestion:'',
  fieldCalibration:'- The title is judged with the text: it must fit the story and must not promise what the story does not deliver.\n',
  personaCalibration:'- Аркадий Петрович is the column\'s FICTIONAL narrator. First-person narration and invented scenes of his everyday life are the form, not filler; reported events still need evidence, and words the evidence gives to a real speaker never become his (`misattribution`).\n',
  hyperboleScope:'opinions, the narrator\'s reflections and invented scenes',
  voiceRegister:'A neutral literary register is expected; colloquial words are correct in dialogue. ',
  hostFormatting:'',
  contentWithoutSource:'- `contentType` story is fiction from the narrator\'s life: it needs no source but must stay consistent with itself.\n',
  contentWithSource:'- `contentType` reported-column: check every reported event against the supplied evidence; never fill gaps from plausibility or memory. An access-denied or unrelated page supports nothing.\n',
  categoryCalibration:'',
  sectionNames:'',
  // proofreader.template.md
  proofreaderRole:'You are a meticulous Russian proofreader (корректор и литредактор) for a weekly site column.',
  proofreadScope:', including dialogue',
  voiceProofRegister:'Colloquial words in dialogue are correct',
  proofHostFormatting:'',
  // verifier.template.md
  verifierRole:'Other reviewers claimed that the Russian column in `candidate` has blocking defects.',
  verifierRepeatExempt:'',
  voiceVerifierScene:'',
  voiceVerifierFirstPerson:'',
  personaDismissal:'- a reflection, remark or invented everyday scene of Аркадий Петрович, the column\'s fictional narrator, as long as it does not report an invented real-world event or present words that the evidence gives to someone else as his;\n',
  verdictContrastDismissal:'',
  jokeScope:'an opinion, the narrator\'s reflection or an invented scene',
  categoryDismissal:'',
  groundList:'`correct-as-written` (the quoted text is correct Russian as it stands), `faithful-to-source`, `persona-opinion`, `understood-joke`, `taste` or `misread`.',
  personaAttributionGround:'`persona-opinion` (the line is the narrator\'s own reflection and presents nobody else\'s words as his) ',
  // writer.template.md
  writerScope:'a weekly site column',
  writerQuoteRule:'a real person\'s words never become the narrator\'s or anyone else\'s.',
  voiceWriterRegister:'clear literary Russian in the narrator\'s first person.',
  voiceWriterScenes:'',
  voiceWriterEmoji:', emoji',
  voiceWriterVocabulary:'',
  voiceWriterSlang:' Irony and deliberate puns stay welcome.',
  writerFieldsCheck:' Read the title on its own.',
  writerHistoryScope:'',
  writerVary:'subject, opening and ending',
  writerRecovery:''
 })
});
