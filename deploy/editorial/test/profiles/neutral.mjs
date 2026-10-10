// Test profile without persona, verdict lines, categories, fields or extra suggestions: it proves that no
// publication text is left in the core (design 9). Its composed rubrics are committed under neutral/ for review.
export default Object.freeze({
 id:'neutral',language:'ru',persona:null,verdictLines:false,categories:null,suggestions:Object.freeze([]),
 contentTypes:Object.freeze({withSource:'sourced-text',withoutSource:'unsourced-text'}),
 maxChars:4096,fields:Object.freeze([]),unique:()=>[],
 slots:Object.freeze({
  // editor.template.md
  editorRole:'You are the final Russian-language editor for a short-form publication.',
  editorFields:'',
  meaningConclusion:' a conclusion that does not follow from the story;',
  meaningParts:' — no two paragraphs or the closing line may say the same thing',
  categoryDistortion:'',
  misattributionFix:' or removes the quotation',
  misattributionExempt:' Common sayings are not misattribution.',
  voiceSlopScenes:'invented narrator scenes («открыл новости в метро», «допил чай»); ',
  voiceSlop:'first-person narration; an opener or punchline formula that repeats recent texts in `history`; emoji sprinkles; ',
  humorTargets:'',
  extraSuggestions:'',
  categorySuggestion:'',
  fieldCalibration:'',
  personaCalibration:'',
  hyperboleScope:'opinions, jokes and invented everyday observations',
  voiceRegister:'Colloquial speech and slang are correct. ',
  hostLines:'- Lines that the host prints around the text are formatting, not defects.\n',
  contentWithoutSource:'- `contentType` unsourced-text needs no external source but must make literal sense: the stated observation must support the conclusion (a closed umbrella cannot prove the rain has stopped).\n',
  contentWithSource:'- `contentType` sourced-text: check every reported event against the supplied evidence; never fill gaps from plausibility or memory. Uncertainty must survive into the conclusion; an access-denied or unrelated page supports nothing.\n',
  categoryCalibration:'',
  sectionNames:'',
  // proofreader.template.md
  proofreaderRole:'You are a meticulous Russian proofreader (корректор и литредактор) for a short-form publication.',
  proofreadScope:', including the closing line',
  voiceProofRegister:'Colloquial speech and slang are correct',
  proofHostLines:'',
  // verifier.template.md
  verifierRole:'Other reviewers claimed that the Russian text in `candidate` has blocking defects.',
  verifierRepeatExempt:'',
  voiceVerifierScene:'an invented narrator scene, ',
  voiceVerifierFirstPerson:', or first-person narration',
  personaDismissal:'',
  verdictContrastDismissal:'',
  jokeScope:'an opinion or an invented everyday observation',
  categoryDismissal:'',
  groundList:'`correct-as-written` (the quoted text is correct Russian as it stands), `faithful-to-source`, `understood-joke`, `taste` or `misread`.',
  personaAttributionGround:'',
  // writer.template.md
  writerScope:'short-form copy',
  writerQuoteRule:'a real person\'s words never become anyone else\'s.',
  voiceWriterRegister:'concrete conversational Russian.',
  voiceWriterScenes:'invented narrator scenes, ',
  voiceWriterEmoji:', emoji sprinkles',
  voiceWriterVocabulary:' Keep intelligible exaggeration.',
  voiceWriterSlang:' Slang, irony and deliberate puns stay welcome.',
  writerFieldsCheck:'',
  writerHistoryScope:'',
  writerVary:'subject, opening and punchline form',
  writerRecovery:''
 })
});
