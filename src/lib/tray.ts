/**
 * How a sound tile looks. The + button stays on the last tapped tile after playback ends,
 * until another tile is tapped.
 */
export function chipState(itemId: string, auditionId: string | null, pickedId: string | null) {
  return { playing: auditionId === itemId, showAdd: pickedId === itemId }
}
