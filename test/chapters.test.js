// Chapters data layer: span coverage, the boundary rule, and the extinction hand-offs.

import test from 'node:test';
import assert from 'node:assert/strict';

import { chapters, getChapterAt } from '../js/data/chapters.js';
import { extinctions } from '../js/data/extinctions.js';
import { TIMING } from '../js/config.js';

test('chapters are contiguous and cover exactly the playable window', () => {
  assert.equal(chapters[0].startMa, TIMING.startTimeMa);
  assert.equal(chapters[chapters.length - 1].endMa, TIMING.endTimeMa);
  for (let i = 1; i < chapters.length; i++) {
    assert.equal(
      chapters[i].startMa,
      chapters[i - 1].endMa,
      `gap/overlap between ${chapters[i - 1].id} and ${chapters[i].id}`
    );
    assert.ok(chapters[i].startMa < chapters[i - 1].startMa, `${chapters[i].id} is not younger`);
  }
});

test('ids are unique; titles and blurbs are within their length limits', () => {
  assert.equal(new Set(chapters.map((c) => c.id)).size, chapters.length);
  for (const ch of chapters) {
    assert.ok(ch.title.length > 0 && ch.title.length <= 32, `${ch.id} title`);
    assert.ok(ch.blurb.length > 0 && ch.blurb.length <= 110, `${ch.id} blurb`);
    if (ch.view !== undefined) assert.ok(['map', 'globe', 'tree'].includes(ch.view), `${ch.id} view`);
  }
});

test('getChapterAt: a boundary belongs to the chapter that starts there', () => {
  for (const ch of chapters) assert.equal(getChapterAt(ch.startMa).id, ch.id);
  assert.equal(getChapterAt(0).id, chapters[chapters.length - 1].id);
  assert.equal(getChapterAt(TIMING.startTimeMa + 10).id, chapters[0].id);
});

test('a chapter never ends in the middle of a mass extinction window', () => {
  for (const e of extinctions) {
    const from = e.timeMa + e.durationMa / 2, to = e.timeMa - e.durationMa / 2;
    for (const ch of chapters) {
      assert.ok(!(ch.endMa < from && ch.endMa > to), `${ch.id} ends inside ${e.id}`);
    }
  }
});

test('signature moments land in the expected chapters', () => {
  assert.equal(getChapterAt(4000).id, 'first_life');
  assert.equal(getChapterAt(520).id, 'cambrian');
  assert.equal(getChapterAt(252).id, 'pangaea');        // the Great Dying ends the Permian chapter
  assert.equal(getChapterAt(66.1).id, 'cretaceous');    // the asteroid ends the dinosaurs' chapter
  assert.equal(getChapterAt(0.005).id, 'human_planet');
});
