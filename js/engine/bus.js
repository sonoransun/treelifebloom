// Tiny synchronous event bus. Components talk to each other through it instead of holding
// references to one another, so main.js stays a thin composition root.
//
// Event catalogue (type → detail):
//   'species:hover'  { id: string|null, x, y, source }   pointer is over (or left) a species
//                    source: 'map' | 'globe' | 'tree' | 'sidebar' | 'modal' | 'timeline'
//   'species:open'   { id }                               open the species detail dialog
//   'species:focus'  { id: string|null }                  dialog opened/closed on this species
//   'time:seek'      { ma, play?: boolean }               jump the clock (optionally start playing)
//   'time:nudge'     { seconds }                          step by seconds of 1× playback
//   'clock:toggle'   {}                                   play/pause
//   'app:ready'      { direct }                            boot finished; direct = deep link (?t=, ?play=1) / capture
//   'clock:playing'  { playing }                          broadcast after any play-state change
//   'clock:speed'    { speed }                            broadcast after a speed change
//   'clock:hold'     { hold: object|null }                extinction hold started / ended
//   'clock:end'      {}                                   playback ARRIVED at the present (not fired when the
//                                                         viewer jumps there: End, scrub or nudge just stop)
//   'view:set'       { mode: 'map' | 'globe' | 'tree' }   request a view switch
//   'view:changed'   { mode }                             broadcast after the switch completed
//   'layer:set'      { name: 'plates'|'labels', on }      request a layer toggle
//   'layer:changed'  { name, on }                         broadcast after the toggle
//   'panel:toggle'   { name: 'legend'|'chapters'|'help'|'sidebar', open?: boolean }
//   'panel:changed'  { name, open }                        a panel reports its new open state
//   'panel:close-all' {}                                  Escape: close every open panel/dialog
//   'chapter:step'   { dir: -1 | 1 }                      previous / next chapter
//   'ui:announce'    { text }                             polite screen-reader announcement
//   'motion:changed' { reduced, override }                 motion preference changed (OS setting or Help toggle)
//   'intro:dismiss'  {}                                   intro card closed

const handlers = new Map();

export const bus = {
  /** Subscribe; returns an unsubscribe function. */
  on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => handlers.get(type)?.delete(fn);
  },

  emit(type, detail = {}) {
    const set = handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(detail);
      } catch (err) {
        console.error(`[bus] handler for "${type}" threw`, err);
      }
    }
  },
};
