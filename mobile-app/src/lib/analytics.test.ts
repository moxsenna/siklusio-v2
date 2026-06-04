import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnalyticsEventPayload,
  buildAnalyticsScreenViewPayload,
  buildAnalyticsUserPayload,
  normalizeAnalyticsEventName,
} from "./analytics";

test("normalizeAnalyticsEventName trims, lowercases, and replaces spaces", () => {
  assert.equal(normalizeAnalyticsEventName(" Habit Completed "), "habit_completed");
});

test("buildAnalyticsEventPayload keeps sanitized event name and metadata", () => {
  assert.deepEqual(buildAnalyticsEventPayload("Symptom Logged", { symptom_type: "cramp" }), {
    event: "symptom_logged",
    symptom_type: "cramp",
  });
});

test("buildAnalyticsScreenViewPayload defaults screen class for GTM", () => {
  assert.deepEqual(buildAnalyticsScreenViewPayload("/(tabs)/calendar"), {
    event: "screen_view",
    screen_name: "/(tabs)/calendar",
    screen_class: "ReactNavigation",
  });
});

test("buildAnalyticsUserPayload keeps existing GTM userId key and safe properties", () => {
  assert.deepEqual(buildAnalyticsUserPayload("user-1", { access_status: "active" }), {
    event: "user_properties_set",
    userId: "user-1",
    access_status: "active",
  });
});
