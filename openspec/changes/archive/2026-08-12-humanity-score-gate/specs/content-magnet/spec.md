## MODIFIED Requirements

### Requirement: Brand voice constraints
Magnet copy MUST remain ironic and lightly roasting, MUST keep the word пиздато where it carries meaning, MUST NOT moralize, and MUST NOT use war or military comedy framing. Before the publish ritual proceeds, a magnet draft MUST also pass the humanity-score gate, or receive an explicit human override after the gate’s attempt limit is exhausted.

#### Scenario: Tone check
- **WHEN** a draft magnet is reviewed against channel/site voice
- **THEN** it matches the above constraints before publish

#### Scenario: Humanity gate before publish
- **WHEN** a magnet draft is ready for the site publish ritual
- **THEN** it has either passed the humanity-score gate or been explicitly overridden by a human after gate exhaustion
