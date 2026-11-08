type BackdropPress = {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
};

/** Close only when the shaded backdrop itself was pressed, never its content. */
export function closeModalOnBackdropPress(
  event: BackdropPress,
  close: () => void
) {
  if (event.target === event.currentTarget) close();
}

type DialogBackdropPress = BackdropPress & {
  clientX: number;
  clientY: number;
  currentTarget: EventTarget & {
    getBoundingClientRect: () => Pick<DOMRect, "bottom" | "left" | "right" | "top">;
  };
};

/** Native dialog backdrops report the dialog as their target, so check the pointer position too. */
export function closeDialogOnBackdropPress(
  event: DialogBackdropPress,
  close: () => void
) {
  if (event.target !== event.currentTarget) return;

  const bounds = event.currentTarget.getBoundingClientRect();
  const outside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (outside) close();
}

