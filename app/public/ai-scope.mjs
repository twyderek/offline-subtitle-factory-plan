import { assessSubtitleCue, filterQualityCues } from './subtitle-quality.mjs';

const SMART_MODE_REASONS = Object.freeze({
  proofread: new Set(['低 confidence', '高 no-speech', '疑似重複文字']),
  breaks: new Set(['字幕過長', '閱讀速度過快']),
  terms: new Set(['疑似專有名詞']),
  fillers: new Set(['疑似重複文字']),
});

function cueText(cue, mode) {
  return String(mode === 'translate' ? (cue?.sourceText || cue?.text || cue?.translatedText) : (cue?.translatedText || cue?.text || cue?.sourceText) || '').trim();
}

function smartScopeCues(cues, mode) {
  if (mode === 'translate') return cues;
  const reasons = SMART_MODE_REASONS[mode] || SMART_MODE_REASONS.proofread;
  return cues.filter((cue) => assessSubtitleCue(cue).reasons.some((reason) => reasons.has(reason)));
}

function contextForCue(allCues, cue, mode) {
  if (mode !== 'breaks') return undefined;
  const index = allCues.indexOf(cue);
  const build = (item) => item ? { id: item.id, text: cueText(item, mode) } : null;
  return { previous: build(allCues[index - 1]), next: build(allCues[index + 1]) };
}

export function selectAiCues({ cues, scope, selectedCueIds = new Set(), search = '', qualityFilter = 'all', activeIndex = -1, mode = 'proofread' }) {
  const allCues = Array.isArray(cues) ? cues : [];
  const source = scope === 'selected'
    ? allCues.filter((cue) => selectedCueIds.has(String(cue.id)))
    : scope === 'search'
      ? allCues.filter((cue) => `${cue.sourceText || ''}\n${cue.translatedText || ''}\n${cue.text || ''}`.toLowerCase().includes(search.toLowerCase()))
      : scope === 'quality'
        ? filterQualityCues(allCues, qualityFilter)
        : scope === 'smart'
          ? smartScopeCues(allCues, mode)
        : scope === 'current'
          ? [allCues[activeIndex]].filter(Boolean)
          : allCues;
  return source.map((cue) => {
    const payload = {
      id: cue.id,
      start: cue.startRaw,
      end: cue.endRaw,
      text: cueText(cue, mode),
      sourceText: cue.sourceText,
      translatedText: cue.translatedText || cue.text,
    };
    const context = contextForCue(allCues, cue, mode);
    if (context) payload.context = context;
    return payload;
  });
}
