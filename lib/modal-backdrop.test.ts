import test from "node:test";
import assert from "node:assert/strict";

import {
  closeDialogOnBackdropPress,
  closeModalOnBackdropPress,
} from "./modal-backdrop.ts";

test("a backdrop press closes its modal", () => {
  const backdrop = new EventTarget();
  let closed = false;

  closeModalOnBackdropPress(
    { target: backdrop, currentTarget: backdrop },
    () => { closed = true; }
  );

  assert.equal(closed, true);
});

test("a press inside the modal never closes it", () => {
  const backdrop = new EventTarget();
  const content = new EventTarget();
  let closed = false;

  closeModalOnBackdropPress(
    { target: content, currentTarget: backdrop },
    () => { closed = true; }
  );

  assert.equal(closed, false);
});

test("native dialogs close only when the press is outside their visible bounds", () => {
  const dialog = Object.assign(new EventTarget(), {
    getBoundingClientRect: () => ({ left: 100, right: 500, top: 100, bottom: 500 }),
  });
  let closes = 0;

  closeDialogOnBackdropPress(
    { target: dialog, currentTarget: dialog, clientX: 50, clientY: 250 },
    () => { closes += 1; }
  );
  closeDialogOnBackdropPress(
    { target: dialog, currentTarget: dialog, clientX: 250, clientY: 250 },
    () => { closes += 1; }
  );

  assert.equal(closes, 1);
});

