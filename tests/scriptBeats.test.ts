import { describe, it, expect } from 'vitest';
import { extractStagingContext, parseScriptToBeats } from '../src/lib/scriptBeatParser';

describe('Script Beat Parser', () => {
  const sampleScript = `
[[STAGING]]
[[INTENT]]
A tense interrogation in a dimly lit warehouse between detective and suspect.
[[/INTENT]]
[[LOGIC]]
Maintain strict 180-degree axis across table. Preserving handcuff position on left wrist.
[[/LOGIC]]
[[AESTHETIC]]
35mm film grain, moody chiaroscuro lighting, cold cyan shadows with tungsten practicals.
[[/AESTHETIC]]
[[OPENING]]
Establishing shot of metal desk under flickering hanging bulb.
[[/OPENING]]
[[/STAGING]]

[<BRIEF>]
[CAM 01] MCU, lockoff on Detective -> Detective slams folder on table -> Detective says {Where were you on Friday?} -> [ACT] Suspect flinches backwards
[CAM 02] CU on Suspect -> Suspect clutches wounded arm -> Suspect says (whispered) {I never left the garage.} -> <Distant thunder roll>
[</BRIEF>]
`;

  it('extracts Auteur staging blocks correctly', () => {
    const staging = extractStagingContext(sampleScript);
    expect(staging.intent).toContain('tense interrogation');
    expect(staging.logic).toContain('Maintain strict 180-degree axis');
    expect(staging.aesthetic).toContain('35mm film grain');
    expect(staging.opening).toContain('Establishing shot');
  });

  it('parses structured beats from [<BRIEF>] lines', () => {
    const beats = parseScriptToBeats(sampleScript);
    expect(beats.length).toBeGreaterThanOrEqual(4);

    // Camera shot beat
    const camBeat = beats.find(b => b.type === 'camera');
    expect(camBeat).toBeDefined();
    expect(camBeat?.sourceText).toContain('MCU');

    // Dialogue beat
    const dialogueBeat = beats.find(b => b.type === 'dialogue');
    expect(dialogueBeat).toBeDefined();
    expect(dialogueBeat?.expectedDialogue).toContain('Where were you on Friday?');

    // Action beat
    const actionBeat = beats.find(b => b.expectedAction?.includes('Suspect flinches backwards'));
    expect(actionBeat).toBeDefined();

    // Audio SFX beat
    const audioBeat = beats.find(b => b.type === 'audio');
    expect(audioBeat).toBeDefined();
    expect(audioBeat?.sourceText).toContain('thunder');
  });

  it('preserves chronological relative order of beats', () => {
    const beats = parseScriptToBeats(sampleScript);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i].relativeOrder).toBeGreaterThan(beats[i - 1].relativeOrder);
    }
  });
});
