// Review categories and dismissal grounds. Blockers and every host rule are core; the profile only adds the
// suggestions and grounds that its features need, at their release positions, so the channel's enums keep their order.
export const BLOCKERS=['spelling','grammar','punctuation','wrong-phrase','meaning','unsupported-claim','misattribution','unusable-source','repetition','ai-slop'];
export const LANGUAGE=['spelling','grammar','punctuation','wrong-phrase'];
// Category fit is taste: an imperfect fit must not cost a publication its post.
export const suggestionsFor=p=>['humor',...p.suggestions,'style',...(p.categories?['category']:[])];
export const groundsFor=p=>['confirmed','correct-as-written','faithful-to-source',...(p.persona?['persona-opinion']:[]),...(p.verdictLines?['verdict-contrast']:[]),'understood-joke',...(p.categories?['loose-category']:[]),'taste','misread'];
export const OPTIONAL_GROUNDS=['persona-opinion','verdict-contrast','loose-category'];
// Words moved between speakers are cleared only by the evidence, by the persona's own voice (when there is one) or by a misread claim.
export const attributionDismissalFor=p=>['faithful-to-source',...(p.persona?['persona-opinion']:[]),'misread'];
