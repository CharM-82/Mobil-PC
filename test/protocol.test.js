import test from "node:test";
import assert from "node:assert/strict";
import { decode, encode, publicProject } from "../protocol.js";

test("protocol round-trips messages and hides local paths", () => {
  assert.deepEqual(decode(encode("status", { state: "idle" })), { type: "status", state: "idle" });
  assert.equal(decode("not json"), null);
  assert.deepEqual(publicProject({ id: "one", name: "One", path: "C:/secret" }), { id: "one", name: "One" });
});
