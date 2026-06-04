import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildSavingsProfileUpdate,
  isCloudSavingsNewer,
  mapCloudSavingsProfile,
} from "./savingsSync";

test("mapCloudSavingsProfile preserves explicit zero savings values from cloud", () => {
  const mapped = mapCloudSavingsProfile({
    target_saving: 0,
    current_saving: 0,
    updated_at: "2026-06-02T01:02:03.000Z",
  });

  assert.deepEqual(mapped, {
    target_saving: 0,
    current_saving: 0,
    updated_at: "2026-06-02T01:02:03.000Z",
  });
});

test("mapCloudSavingsProfile normalizes invalid values without dropping valid numbers", () => {
  const mapped = mapCloudSavingsProfile({
    target_saving: "25000000",
    current_saving: -100,
    updated_at: null,
  });

  assert.equal(mapped.target_saving, 25000000);
  assert.equal(mapped.current_saving, 0);
  assert.equal(mapped.updated_at, null);
});

test("buildSavingsProfileUpdate includes explicit zero values and updated_at", () => {
  assert.deepEqual(
    buildSavingsProfileUpdate(
      { target_saving: 0, current_saving: 150000 },
      "2026-06-02T02:00:00.000Z",
    ),
    {
      target_saving: 0,
      current_saving: 150000,
      updated_at: "2026-06-02T02:00:00.000Z",
    },
  );
});

test("isCloudSavingsNewer compares cloud updated_at against local sync timestamp", () => {
  const localSyncMs = new Date("2026-06-02T01:00:00.000Z").getTime();

  assert.equal(isCloudSavingsNewer("2026-06-02T01:00:01.000Z", localSyncMs), true);
  assert.equal(isCloudSavingsNewer("2026-06-02T00:59:59.000Z", localSyncMs), false);
  assert.equal(isCloudSavingsNewer(null, localSyncMs), false);
});
