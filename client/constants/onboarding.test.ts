import assert from "node:assert/strict";

import {
  ONBOARDING_SLIDES,
  ONBOARDING_TAGLINES,
  isLastSlide,
  nextSlideIndex,
  pickTagline,
} from "./onboarding";

assert.equal(ONBOARDING_SLIDES.length, 3, "there should be three intro slides");
assert.ok(ONBOARDING_TAGLINES.length > 0, "taglines must not be empty");

for (const slide of ONBOARDING_SLIDES) {
  assert.ok(slide.title.length > 0, "each slide needs a title");
  assert.ok(slide.body.length > 0, "each slide needs body copy");
}

// pickTagline is in range and deterministic for a given seed.
for (const seed of [0, 1, 2, 3, 4, 999, -7, 1_000_000_000]) {
  const tagline = pickTagline(seed);
  assert.ok(
    ONBOARDING_TAGLINES.includes(tagline),
    `pickTagline(${seed}) should return a known tagline`,
  );
  assert.equal(
    pickTagline(seed),
    tagline,
    `pickTagline(${seed}) should be deterministic`,
  );
}

assert.equal(pickTagline(0), ONBOARDING_TAGLINES[0]);
assert.equal(
  pickTagline(ONBOARDING_TAGLINES.length),
  ONBOARDING_TAGLINES[0],
  "seed should wrap around the taglines array",
);

// Slide index helpers clamp at the final slide.
assert.equal(nextSlideIndex(0, 3), 1);
assert.equal(
  nextSlideIndex(2, 3),
  2,
  "advancing past the last slide is a no-op",
);
assert.equal(isLastSlide(2, 3), true);
assert.equal(isLastSlide(1, 3), false);

console.log("onboarding.test.ts passed");
