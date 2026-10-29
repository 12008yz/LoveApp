export type LetterLike = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  unlockAt: Date;
  openedAt: Date | null;
  createdAt: Date;
};

export function presentLetter<T extends LetterLike>(
  letter: T,
  viewerId: string,
  now: Date = new Date(),
) {
  const unlocked = letter.unlockAt <= now;
  const isAuthor = letter.authorId === viewerId;
  const canRead = unlocked || isAuthor;
  return {
    ...letter,
    body: canRead ? letter.body : "",
    locked: !unlocked,
    canRead,
  };
}

export type PresentedLetter = ReturnType<typeof presentLetter>;

/** Inbox tab: partner letters not marked opened yet (incl. still time-locked). */
export function isInboxUnread(
  letter: { authorId: string; openedAt: Date | string | null },
  viewerId: string,
) {
  return letter.authorId !== viewerId && !letter.openedAt;
}

/** Red-dot / badge: partner letter that can be opened and is not opened yet. */
export function isActionableUnread(
  letter: {
    authorId: string;
    openedAt: Date | string | null;
    locked: boolean;
    canRead: boolean;
  },
  viewerId: string,
) {
  return (
    letter.authorId !== viewerId &&
    !letter.locked &&
    letter.canRead &&
    !letter.openedAt
  );
}

/** Author may edit until the partner marks the letter opened. */
export function canEditLetter(
  letter: { authorId: string; openedAt: Date | string | null },
  viewerId: string,
) {
  return letter.authorId === viewerId && !letter.openedAt;
}
