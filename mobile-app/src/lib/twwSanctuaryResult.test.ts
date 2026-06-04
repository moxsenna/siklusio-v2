import test from "node:test";
import assert from "node:assert/strict";
import { getTwwLetterSections, getTwwTitle, TWW_MUSIC_MAP } from "./twwSanctuaryResult";

test("getTwwLetterSections returns structured sections in a calm reading order", () => {
  const sections = getTwwLetterSections({
    title: "Kamu tidak sendirian",
    opening: "Aku dengar rasa beratmu.",
    validation: "Perasaanmu valid.",
    grounding: "Kembali dulu ke napasmu.",
    affirmation: "Aku boleh pelan-pelan.",
    reassurance: "Aku dengar rasa beratmu. Perasaanmu valid.",
    breathingTip: "Tarik napas empat detik.",
    closing: "Aku menemanimu.",
  });

  assert.deepEqual(
    sections.map((section) => section.key),
    ["opening", "validation", "grounding", "affirmation", "breathingTip", "closing"],
  );
  assert.equal(sections[1].label, "Perasaanmu valid");
});

test("getTwwLetterSections falls back to readable reassurance paragraphs for legacy payloads", () => {
  const sections = getTwwLetterSections({
    reassurance: "Kalimat pertama. Kalimat kedua. Kalimat ketiga.",
    breathingTip: "Tarik napas pelan.",
  });

  assert.equal(sections[0].key, "opening");
  assert.equal(sections[0].body, "Kalimat pertama. Kalimat kedua.");
  assert.equal(sections[1].body, "Kalimat ketiga.");
  assert.equal(sections.at(-1)?.key, "breathingTip");
});

test("getTwwTitle removes leading punctuation from generated titles", () => {
  assert.equal(
    getTwwTitle({
      reassurance: "Tenang ya.",
      breathingTip: "Tarik napas.",
      title: ": Somaaa, kamu tidak sendiri",
    }),
    "Somaaa, kamu tidak sendiri",
  );
});

test("TWW_MUSIC_MAP contains four core mood ambiances", () => {
  const map = TWW_MUSIC_MAP;
  assert.equal(typeof map, "object");
  assert.equal(map.nature.label, "Suara Alam");
  assert.equal(map.deep_meditation.label, "Meditasi");
  assert.equal(map.lofi.label, "Santai");
  assert.equal(map.lullaby.label, "Tidur");
});
