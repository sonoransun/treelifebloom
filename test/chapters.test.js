// Chapters data layer — span coverage, bucketing rule, and link derivation.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rawChapters,
  chapters,
  chapterIndexAtTime,
  chapterAtTime,
  deriveChapterLinks,
} from '../js/data/chapters.js';
import { milestones } from '../js/data/milestones.js';
import { extinctions } from '../js/data/extinctions.js';
import { species } from '../js/data/species.js';
import { TIMING } from '../js/config.js';

test('spans are contiguous and cover exactly the playable window', () => {
  assert.equal(rawChapters[0].spanStartMa, TIMING.startTimeMa);
  assert.equal(rawChapters[rawChapters.length - 1].spanEndMa, TIMING.endTimeMa);
  for (let i = 1; i < rawChapters.length; i++) {
    assert.equal(
      rawChapters[i].spanStartMa,
      rawChapters[i - 1].spanEndMa,
      `gap/overlap between ${rawChapters[i - 1].id} and ${rawChapters[i].id}`
    );
  }
});

test('every jump target lies within its own span', () => {
  for (const ch of rawChapters) {
    assert.ok(
      ch.timeMa <= ch.spanStartMa && ch.timeMa >= ch.spanEndMa,
      `${ch.id}: timeMa ${ch.timeMa} outside [${ch.spanEndMa}, ${ch.spanStartMa}]`
    );
  }
});

test('chapterIndexAtTime boundary pins (young-edge-inclusive)', () => {
  assert.equal(chapterAtTime(4000).id, 'world-of-microbes');
  // Boundary events land in the chapter they END.
  assert.equal(chapterAtTime(251.9).id, 'coal-and-protomammals');
  assert.equal(chapterAtTime(201.4).id, 'triassic-rebirth');
  assert.equal(chapterAtTime(66).id, 'reign-of-dinosaurs');
  assert.equal(chapterAtTime(0.012).id, 'human-story');
  assert.equal(chapterAtTime(0).id, 'human-story');
});

test('the jump target of each chapter resolves back to that chapter', () => {
  for (let i = 0; i < chapters.length; i++) {
    assert.equal(chapterIndexAtTime(chapters[i].timeMa), i, chapters[i].id);
  }
});

test('derivation partitions every milestone, extinction, and species exactly once', () => {
  const sum = (key) => chapters.reduce((n, ch) => n + ch[key].length, 0);
  assert.equal(sum('milestones'), milestones.length);
  assert.equal(sum('extinctions'), extinctions.length);
  assert.equal(sum('speciesFirstSeen'), species.length);
});

test('signature events land in the expected chapters', () => {
  const byId = new Map(chapters.map((ch) => [ch.id, ch]));
  const has = (chId, key, id) => byId.get(chId)[key].some((x) => x.id === id);

  assert.ok(has('reign-of-dinosaurs', 'extinctions', 'end-cretaceous'), 'K-Pg ends the dinosaur chapter');
  assert.ok(has('coal-and-protomammals', 'extinctions', 'end-permian'), 'Great Dying ends the coal chapter');
  assert.ok(has('oxygen-revolution', 'milestones', 'great_oxygenation'));
  assert.ok(has('cambrian-explosion', 'milestones', 'cambrian_explosion'));
  assert.ok(has('snowball-earth', 'milestones', 'sturtian_snowball'));
  assert.ok(has('human-story', 'milestones', 'agriculture'));
});

test('every derived chapter has an accent color and a narrative', () => {
  for (const ch of chapters) {
    assert.match(ch.color, /^#[0-9a-fA-F]{6}$/, `${ch.id} color`);
    assert.ok(ch.narrative && ch.narrative.length > 80, `${ch.id} narrative`);
  }
});

test('deriveChapterLinks is pure — re-deriving matches and does not mutate input', () => {
  const snapshot = JSON.stringify(rawChapters);
  const again = deriveChapterLinks(rawChapters, { milestones, extinctions, species });
  assert.equal(JSON.stringify(rawChapters), snapshot, 'rawChapters mutated');
  assert.equal(again.length, chapters.length);
  for (let i = 0; i < again.length; i++) {
    assert.equal(again[i].color, chapters[i].color);
    assert.equal(again[i].milestones.length, chapters[i].milestones.length);
  }
});
