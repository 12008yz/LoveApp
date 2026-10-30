import {
  DEMO_COUPLE_ID,
  DEMO_INVITE,
  DEMO_PARTNER,
  DEMO_USER,
} from "@/lib/demo-mode";

export type DemoRow = Record<string, unknown> & { id: string };

type Store = {
  user: DemoRow[];
  couple: DemoRow[];
  coupleMember: DemoRow[];
  message: DemoRow[];
  messageReaction: DemoRow[];
  diaryEntry: DemoRow[];
  event: DemoRow[];
  letter: DemoRow[];
  mediaItem: DemoRow[];
  mediaComment: DemoRow[];
  place: DemoRow[];
  timelineEvent: DemoRow[];
  wishlistItem: DemoRow[];
  moodPing: DemoRow[];
  careItem: DemoRow[];
  moodCheckIn: DemoRow[];
  gameSession: DemoRow[];
  pushSubscription: DemoRow[];
};

declare global {
  var __loveDemoStore: Store | undefined;
}

function seed(): Store {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600_000);
  const yesterday = new Date(now.getTime() - 86400_000);
  const tomorrow = new Date(now.getTime() + 86400_000);

  const user = [
    {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      displayName: DEMO_USER.displayName,
      passwordHash: "demo",
      avatarPath: null,
      createdAt: yesterday,
      lastSeenAt: null,
    },
    {
      id: DEMO_PARTNER.id,
      email: DEMO_PARTNER.email,
      displayName: DEMO_PARTNER.displayName,
      passwordHash: "demo",
      avatarPath: null,
      createdAt: yesterday,
      lastSeenAt: null,
    },
  ];

  const couple = [
    {
      id: DEMO_COUPLE_ID,
      inviteCode: DEMO_INVITE,
      status: "active",
      startedAt: yesterday,
      createdAt: yesterday,
      pinnedMessageId: null,
    },
  ];

  const coupleMember = [
    {
      id: "demo-mem-1",
      userId: DEMO_USER.id,
      coupleId: DEMO_COUPLE_ID,
      genderRole: "boy",
      joinedAt: yesterday,
    },
    {
      id: "demo-mem-2",
      userId: DEMO_PARTNER.id,
      coupleId: DEMO_COUPLE_ID,
      genderRole: "girl",
      joinedAt: yesterday,
    },
  ];

  const messageSeed = [
    {
      id: "demo-msg-0",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      body: "Вчера вечером было уютно 🌙",
      createdAt: new Date(yesterday.getTime() + 20 * 3600_000),
      readAt: yesterday,
    },
    {
      id: "demo-msg-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      body: "Привет! Это демо — можно всё потыкать",
      createdAt: hourAgo,
      readAt: new Date(hourAgo.getTime() + 30_000),
    },
    {
      id: "demo-msg-1b",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      body: "Чат, домик, письма — всё уже здесь",
      createdAt: new Date(hourAgo.getTime() + 45_000),
      readAt: new Date(hourAgo.getTime() + 90_000),
    },
    {
      id: "demo-msg-2",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_USER.id,
      body: "Супер, заходим в домик",
      createdAt: new Date(hourAgo.getTime() + 120_000),
      readAt: new Date(hourAgo.getTime() + 150_000),
    },
    {
      id: "demo-msg-3",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_USER.id,
      body: "❤️",
      createdAt: new Date(hourAgo.getTime() + 130_000),
      readAt: new Date(hourAgo.getTime() + 160_000),
    },
    {
      id: "demo-msg-4",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      body: "Настройки пары теперь в «Ещё» → Настройки",
      createdAt: new Date(hourAgo.getTime() + 200_000),
      readAt: null,
    },
  ];

  // Every demo message carries the chat-upgrade fields (edit / reply / quote).
  const message: DemoRow[] = messageSeed.map((m) => ({
    ...m,
    editedAt: null,
    replyToId: null,
    quoteText: null,
    reactionsUpdatedAt: null,
  }));

  const diaryEntry = [
    {
      id: "demo-diary-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_USER.id,
      title: "Наш первый вечер",
      body: "Короткий демо-дневник: здесь будут ваши записи.",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: "demo-diary-2",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      title: "Утро",
      body: "С розовой пометкой — её сообщение в дневнике.",
      createdAt: hourAgo,
      updatedAt: hourAgo,
    },
  ];

  const event = [
    {
      id: "demo-event-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_USER.id,
      title: "Ужин вместе",
      notes: "Демо-событие в календаре",
      occursAt: tomorrow,
      remindAt: null,
      remindedAt: null,
      createdAt: yesterday,
    },
  ];

  const letter = [
    {
      id: "demo-letter-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      title: "Маленькое письмо",
      body: "Письмо из демо: открывается как настоящее.",
      unlockAt: yesterday,
      openedAt: null,
      createdAt: yesterday,
    },
  ];

  const wishlistItem = [
    {
      id: "demo-wish-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_USER.id,
      title: "Прогулка на закате",
      url: null,
      notes: null,
      forPartner: true,
      fulfilled: false,
      createdAt: yesterday,
    },
  ];

  const careItem = [
    {
      id: "demo-care-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      kind: "joy",
      body: "Когда готовишь чай без просьбы",
      visibility: "shared",
      createdAt: yesterday,
    },
  ];

  const moodPing = [
    {
      id: "demo-ping-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_PARTNER.id,
      kind: "miss_you",
      note: "Скучаю",
      createdAt: hourAgo,
    },
  ];

  const moodCheckIn = [
    {
      id: "demo-mood-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_USER.id,
      score: 4,
      note: "Хорошо",
      day: now.toISOString().slice(0, 10),
      createdAt: now,
    },
  ];

  const place = [
    {
      id: "demo-place-1",
      coupleId: DEMO_COUPLE_ID,
      name: "Любимая кофейня",
      address: "ул. Примерная, 1",
      lat: 55.75,
      lng: 37.62,
      notes: "Свидание на выходных",
      visitAt: tomorrow,
      createdAt: yesterday,
    },
  ];

  const timelineEvent = [
    {
      id: "demo-tl-1",
      coupleId: DEMO_COUPLE_ID,
      authorId: DEMO_USER.id,
      title: "Знакомство",
      body: "Момент, который хочется помнить всю жизнь",
      happenedAt: yesterday,
      createdAt: yesterday,
    },
  ];

  return {
    user,
    couple,
    coupleMember,
    message,
    messageReaction: [],
    diaryEntry,
    event,
    letter,
    mediaItem: [],
    mediaComment: [],
    place,
    timelineEvent,
    wishlistItem,
    moodPing,
    careItem,
    moodCheckIn,
    gameSession: [],
    pushSubscription: [],
  };
}

export function getDemoStore(): Store {
  if (!globalThis.__loveDemoStore) {
    globalThis.__loveDemoStore = seed();
  }
  const store = globalThis.__loveDemoStore;
  // Hot-reload may keep an older in-memory store without newer collections.
  if (!store.mediaComment) store.mediaComment = [];
  if (!store.messageReaction) store.messageReaction = [];
  return store;
}

export function newDemoId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
