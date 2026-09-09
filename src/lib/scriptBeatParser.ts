import type { ScriptBeat, CueCategoryType } from '../types/script';
import { parseScriptWithStaging } from './scriptParser';

export interface StagingContext {
  intent?: string;
  logic?: string;
  aesthetic?: string;
  opening?: string;
  continuity?: string;
  rawBlocks: Record<string, string>;
}

export function extractStagingContext(scriptText: string): StagingContext {
  const { stagingMarkers } = parseScriptWithStaging(scriptText);
  const context: StagingContext = {
    rawBlocks: {},
  };

  for (const marker of Object.values(stagingMarkers)) {
    for (const block of marker.blocks) {
      const key = block.label.toUpperCase().trim();
      context.rawBlocks[key] = block.content;
      if (key === 'INTENT') context.intent = block.content;
      else if (key === 'LOGIC') context.logic = block.content;
      else if (key === 'AESTHETIC') context.aesthetic = block.content;
      else if (key === 'OPENING') context.opening = block.content;
      else if (key.includes('CONTINUITY')) context.continuity = block.content;
    }
  }

  return context;
}

/**
 * Parses script text into structured, order-preserving cinematic beats
 * extracting camera, dialogue, action, audio, VFX, and staging requirements.
 */
export function parseScriptToBeats(scriptText: string): ScriptBeat[] {
  const beats: ScriptBeat[] = [];
  const stagingContext = extractStagingContext(scriptText);
  const lines = scriptText.split('\n');

  let currentPos = 0;
  let inBrief = false;
  let order = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const lineStart = currentPos;
    currentPos += rawLine.length + 1; // +1 for newline

    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Track [<BRIEF>] tags
    if (/^\[<BRIEF>\]$/i.test(trimmed)) {
      inBrief = true;
      continue;
    }
    if (/^\[<\/BRIEF>\]$/i.test(trimmed)) {
      inBrief = false;
      continue;
    }

    // Skip raw [[STAGING]] marker tags from creating duplicate visual cues
    if (/^\[\[.*?\]\]$/.test(trimmed)) {
      continue;
    }

    // Auteur Brief line parser: [CAM 01] MS ... -> [ACT] ... -> Character says {text}
    if (inBrief || trimmed.includes('[CAM') || trimmed.includes('[ACT]') || trimmed.includes('says')) {
      const subBeats = parseAuteurBriefLine(rawLine, lineStart, order, stagingContext);
      if (subBeats.length > 0) {
        beats.push(...subBeats);
        order += subBeats.length;
        continue;
      }
    }

    // Standard screenplay line parsing
    const standardBeat = parseStandardScreenplayLine(rawLine, lineStart, order, stagingContext);
    if (standardBeat) {
      beats.push(standardBeat);
      order++;
    }
  }

  return beats;
}

function parseAuteurBriefLine(
  line: string, 
  lineStartOffset: number, 
  startOrder: number, 
  context: StagingContext
): ScriptBeat[] {
  const results: ScriptBeat[] = [];
  let currentOrder = startOrder;

  // 1. Camera / Shot: matches [CAM 01] or [CAM] or shot framing
  const camRegex = /\[CAM(?:\s*\d+)?\]\s*([^\->\[]+)/g;
  let match: RegExpExecArray | null;
  while ((match = camRegex.exec(line)) !== null) {
    const matchedText = match[0];
    const details = match[1].trim();
    const idx = line.indexOf(matchedText);
    const start = lineStartOffset + idx;
    const end = start + matchedText.length;

    results.push({
      id: `beat-cam-${currentOrder}`,
      type: 'camera',
      sourceText: details || matchedText,
      startIndex: start,
      endIndex: end,
      expectedCamera: details,
      continuityProtocol: context.continuity || context.logic,
      relativeOrder: currentOrder++,
    });
  }

  // 2. Action / Blocking: matches [ACT] or [BLOCK]
  const actRegex = /\[(?:ACT|BLOCK)\]\s*([^\->\[<]+)/g;
  while ((match = actRegex.exec(line)) !== null) {
    const matchedText = match[0];
    const details = match[1].trim();
    const idx = line.indexOf(matchedText);
    const start = lineStartOffset + idx;
    const end = start + matchedText.length;

    results.push({
      id: `beat-act-${currentOrder}`,
      type: 'action',
      sourceText: details,
      startIndex: start,
      endIndex: end,
      expectedAction: details,
      continuityProtocol: context.logic,
      relativeOrder: currentOrder++,
    });
  }

  // 3. Dialogue: matches Character says {text} or Character says (delivery) {text}
  const dialRegex = /([A-Za-z0-9_\s]+)\s+says(?:\s*\([^)]+\))?\s*\{([^}]+)\}/g;
  while ((match = dialRegex.exec(line)) !== null) {
    const character = match[1].trim();
    const speech = match[2].trim();
    const matchedText = match[0];
    const idx = line.indexOf(matchedText);
    const start = lineStartOffset + idx;
    const end = start + matchedText.length;

    results.push({
      id: `beat-dial-${currentOrder}`,
      type: 'dialogue',
      sourceText: `${character}: "${speech}"`,
      startIndex: start,
      endIndex: end,
      expectedDialogue: speech,
      relativeOrder: currentOrder++,
    });
  }

  // 4. Audio: matches <Audio sound effect>
  const audioRegex = /<([^>]+)>/g;
  while ((match = audioRegex.exec(line)) !== null) {
    const sfx = match[1].trim();
    const matchedText = match[0];
    const idx = line.indexOf(matchedText);
    const start = lineStartOffset + idx;
    const end = start + matchedText.length;

    results.push({
      id: `beat-audio-${currentOrder}`,
      type: 'audio',
      sourceText: sfx,
      startIndex: start,
      endIndex: end,
      expectedAudio: sfx,
      relativeOrder: currentOrder++,
    });
  }

  return results;
}

function parseStandardScreenplayLine(
  line: string, 
  lineStartOffset: number, 
  order: number, 
  context: StagingContext
): ScriptBeat | null {
  const trimmed = line.trim();

  // Scene heading
  if (trimmed.startsWith('INT.') || trimmed.startsWith('EXT.')) {
    return {
      id: `beat-env-${order}`,
      type: 'environment',
      sourceText: trimmed,
      startIndex: lineStartOffset,
      endIndex: lineStartOffset + line.length,
      expectedEnvironment: trimmed,
      continuityProtocol: context.aesthetic,
      relativeOrder: order,
    };
  }

  // VFX
  if (trimmed.startsWith('VFX:')) {
    return {
      id: `beat-vfx-${order}`,
      type: 'vfx',
      sourceText: trimmed.slice(4).trim(),
      startIndex: lineStartOffset,
      endIndex: lineStartOffset + line.length,
      expectedVfx: trimmed.slice(4).trim(),
      relativeOrder: order,
    };
  }

  // Audio / SFX
  if (trimmed.startsWith('SFX:')) {
    return {
      id: `beat-audio-${order}`,
      type: 'audio',
      sourceText: trimmed.slice(4).trim(),
      startIndex: lineStartOffset,
      endIndex: lineStartOffset + line.length,
      expectedAudio: trimmed.slice(4).trim(),
      relativeOrder: order,
    };
  }

  // Character dialogue line (uppercase ending with :)
  if (trimmed.length > 0 && trimmed === trimmed.toUpperCase() && trimmed.endsWith(':')) {
    return {
      id: `beat-dial-${order}`,
      type: 'dialogue',
      sourceText: trimmed,
      startIndex: lineStartOffset,
      endIndex: lineStartOffset + line.length,
      expectedDialogue: trimmed,
      relativeOrder: order,
    };
  }

  // Action / General description
  if (trimmed.length > 15 && !trimmed.startsWith('NOTE:') && !trimmed.startsWith('http')) {
    return {
      id: `beat-act-${order}`,
      type: 'action',
      sourceText: trimmed,
      startIndex: lineStartOffset,
      endIndex: lineStartOffset + line.length,
      expectedAction: trimmed,
      relativeOrder: order,
    };
  }

  return null;
}
