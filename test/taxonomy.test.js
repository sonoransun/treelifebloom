import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cladeColor,
  sharedRankDepth,
  relativesOf,
  lineageLabels,
} from '../js/util/taxonomy.js';

const HEX = /^#[0-9a-fA-F]{3,8}$/;

function sp(id, taxonomy, extra = {}) {
  return { id, name: id, appearanceMa: 100, extinctMa: 0, taxonomy, ...extra };
}

const human = sp('human', {
  domain: 'Eukarya', kingdom: 'Animalia', classOrPhylum: 'Mammalia',
  order: 'Primates', family: 'Hominidae', genus: 'Homo', species: 'sapiens',
});
const erectus = sp('erectus', {
  domain: 'Eukarya', kingdom: 'Animalia', classOrPhylum: 'Mammalia',
  order: 'Primates', family: 'Hominidae', genus: 'Homo', species: 'erectus',
});
const oak = sp('oak', {
  domain: 'Eukarya', kingdom: 'Plantae', classOrPhylum: 'Embryophyta',
  order: 'Fagales', family: 'Fagaceae', genus: 'Quercus', species: 'robur',
});

test('cladeColor returns a hex color and falls back gracefully', () => {
  assert.match(cladeColor(human), HEX);
  assert.match(cladeColor({}), HEX);            // no taxonomy -> default
  assert.match(cladeColor(undefined), HEX);     // null-safe
});

test('cladeColor family override wins over class-level color', () => {
  // Hominidae has an override; a plain Mammalia entry uses the class color.
  const plainMammal = sp('m', { domain: 'Eukarya', kingdom: 'Animalia', classOrPhylum: 'Mammalia' });
  assert.notEqual(cladeColor(human), cladeColor(plainMammal));
});

test('sharedRankDepth: same genus deeper than same-domain-only', () => {
  assert.ok(sharedRankDepth(human, erectus) > sharedRankDepth(human, oak));
  assert.equal(sharedRankDepth(human, erectus), 6); // same through genus, differ at species
  assert.equal(sharedRankDepth(human, oak), 1);     // share only domain Eukarya
});

test('relativesOf ranks the genus-mate first and excludes self', () => {
  const rels = relativesOf(human, [human, oak, erectus]);
  assert.ok(!rels.some((r) => r.id === 'human'), 'self excluded');
  assert.equal(rels[0].id, 'erectus', 'closest relative first');
});

test('lineageLabels emits one entry per non-null rank, marking self', () => {
  const labels = lineageLabels({ ...human, rank: 'species' });
  assert.equal(labels.length, 7);
  assert.equal(labels[labels.length - 1].isSelf, true);
});
