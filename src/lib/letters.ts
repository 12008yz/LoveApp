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
