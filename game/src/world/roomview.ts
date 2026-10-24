// Rooms at 1× (QA round 2): a small indoor map is centred on the screen by
// its fixed camera and set into drawn surroundings (art/props/iexterior)
// that fill the whole screen. While a dialog window is up the camera may
// slide the room up to ROOM_SLIDE px (FieldScene.dialogY), so the drawn
// outside reaches that much further than the screen's edge.

/** How far a room's fixed camera may slide for a dialog window (px). */
export const ROOM_SLIDE = 36;
