import { getDemoStore, newDemoId, type DemoRow } from "@/lib/demo-store";

type Where = Record<string, unknown>;

function matchWhere(row: DemoRow, where?: Where): boolean {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (value == null) continue;
    if (key === "OR" && Array.isArray(value)) {
      if (!value.some((clause) => matchWhere(row, clause as Where))) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(value)) {
      if (!value.every((clause) => matchWhere(row, clause as Where))) return false;
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      const op = value as Record<string, unknown>;
      const cell = row[key];
      if ("not" in op) {
        if (cell === op.not) return false;
        continue;
      }
      if ("gt" in op) {
        if (!(cell instanceof Date) || !(op.gt instanceof Date) || !(cell > op.gt)) {
          return false;
        }
        continue;
      }
      if ("gte" in op) {
        const gte = op.gte;
        if (typeof cell === "string" && typeof gte === "string") {
          if (cell < gte) return false;
        } else if (cell instanceof Date && gte instanceof Date) {
          if (!(cell >= gte)) return false;
        } else {
          return false;
        }
        continue;
      }
      if ("lte" in op) {
        if (!(cell instanceof Date) || !(op.lte instanceof Date) || !(cell <= op.lte)) {
          return false;
        }
        continue;
      }
      if ("in" in op && Array.isArray(op.in)) {
        if (!op.in.includes(cell)) return false;
        continue;
      }
      if ("endsWith" in op && typeof op.endsWith === "string") {
        if (typeof cell !== "string" || !cell.endsWith(op.endsWith)) return false;
        continue;
      }
      continue;
    }
    if (row[key] !== value) return false;
  }
  return true;
}

function applySelect(row: DemoRow, select?: Record<string, boolean>) {
  if (!select) return { ...row };
  const out: DemoRow = { id: row.id };
  for (const [k, on] of Object.entries(select)) {
    if (on) out[k] = row[k];
  }
  return out;
}

function applyInclude(model: string, row: DemoRow, include?: Record<string, unknown>) {
  if (!include) return { ...row };
  const store = getDemoStore();
  const out: DemoRow = { ...row };

  for (const [rel, conf] of Object.entries(include)) {
    if (!conf) continue;
    const select =
      typeof conf === "object" && conf && "select" in conf
        ? (conf as { select: Record<string, boolean> }).select
        : undefined;
    const nestedInclude =
      typeof conf === "object" && conf && "include" in conf
        ? (conf as { include: Record<string, unknown> }).include
        : undefined;

    if (rel === "author" || rel === "user") {
      const userId = (row.authorId || row.userId || row.fromUserId) as string | undefined;
      const user = store.user.find((u) => u.id === userId);
      out[rel] = user ? applySelect(user, select) : null;
      continue;
    }
    // Chat MESSAGE_INCLUDE: reply preview + reactions
    if (rel === "replyTo" && model === "message") {
      const replyId = row.replyToId as string | null | undefined;
      if (!replyId) {
        out.replyTo = null;
        continue;
      }
      const target = store.message.find((m) => m.id === replyId);
      if (!target) {
        out.replyTo = null;
        continue;
      }
      const author = store.user.find((u) => u.id === target.authorId);
      const replySelect =
        typeof conf === "object" && conf && "select" in conf
          ? (conf as { select: Record<string, unknown> }).select
          : undefined;
      if (replySelect) {
        const picked: DemoRow = { id: String(target.id) };
        for (const [key, val] of Object.entries(replySelect)) {
          if (!val) continue;
          if (key === "author") {
            const authorSelect =
              typeof val === "object" && val && "select" in val
                ? (val as { select: Record<string, boolean> }).select
                : undefined;
            picked.author = author ? applySelect(author, authorSelect) : null;
          } else {
            picked[key] = target[key];
          }
        }
        out.replyTo = picked;
      } else {
        out.replyTo = {
          ...target,
          author: author ? { ...author } : null,
        };
      }
      continue;
    }
    if (rel === "reactions" && model === "message") {
      const rows = store.messageReaction.filter((r) => r.messageId === row.id);
      out.reactions = rows.map((r) => applySelect(r, select));
      continue;
    }
    if (rel === "couple") {
      const couple = store.couple.find((c) => c.id === row.coupleId);
      if (!couple) {
        out.couple = null;
        continue;
      }
      let c: DemoRow = { ...couple };
      if (nestedInclude?.members) {
        const members = store.coupleMember.filter((m) => m.coupleId === couple.id);
        const memConf = nestedInclude.members as { include?: { user?: unknown } };
        c = {
          ...c,
          members: members.map((m) => {
            let mm: DemoRow = { ...m };
            if (memConf?.include?.user) {
              const u = store.user.find((x) => x.id === m.userId);
              const userSelect =
                typeof memConf.include.user === "object" &&
                memConf.include.user &&
                "select" in memConf.include.user
                  ? (memConf.include.user as { select: Record<string, boolean> }).select
                  : undefined;
              mm = { ...mm, user: u ? applySelect(u, userSelect) : null };
            }
            return mm;
          }),
        };
      }
      out.couple = c;
      continue;
    }
    if (rel === "members") {
      const members = store.coupleMember.filter((m) => m.coupleId === row.id);
      const memConf = conf as { include?: { user?: unknown } };
      out.members = members.map((m) => {
        let mm: DemoRow = { ...m };
        if (memConf?.include?.user) {
          const u = store.user.find((x) => x.id === m.userId);
          mm = { ...mm, user: u ? { ...u } : null };
        }
        return mm;
      });
    }
  }
  return out;
}

function sortRows(rows: DemoRow[], orderBy?: Record<string, "asc" | "desc">) {
  if (!orderBy) return rows;
  const [key, dir] = Object.entries(orderBy)[0] ?? [];
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av instanceof Date && bv instanceof Date
      ? av.getTime() - bv.getTime()
      : String(av).localeCompare(String(bv));
    return dir === "desc" ? -cmp : cmp;
  });
}

function flattenCreateData(data: Record<string, unknown>) {
  const row: DemoRow = { id: (data.id as string) || newDemoId("row") };
  const nestedCreates: { rel: string; items: Record<string, unknown>[] }[] = [];

  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && "create" in v) {
      const create = (v as { create: Record<string, unknown> | Record<string, unknown>[] }).create;
      nestedCreates.push({
        rel: k,
        items: Array.isArray(create) ? create : [create],
      });
      continue;
    }
    row[k] = v;
  }
  if (!row.createdAt) row.createdAt = new Date();
  return { row, nestedCreates };
}

function presentRow(
  model: string,
  row: DemoRow,
  args: { include?: Record<string, unknown>; select?: Record<string, boolean> },
) {
  const withInc = applyInclude(model, row, args.include);
  if (args.select) return applySelect(withInc, args.select);
  return withInc;
}

function modelDelegate(model: keyof ReturnType<typeof getDemoStore>) {
  return {
    async findUnique(args: {
      where: Where;
      include?: Record<string, unknown>;
      select?: Record<string, boolean>;
    }) {
      const store = getDemoStore();
      const row = store[model].find((r) => matchWhere(r, args.where));
      if (!row) return null;
      return presentRow(model, row, args);
    },
    async findFirst(args: {
      where?: Where;
      include?: Record<string, unknown>;
      select?: Record<string, boolean>;
      orderBy?: Record<string, "asc" | "desc">;
    } = {}) {
      const store = getDemoStore();
      const rows = sortRows(
        store[model].filter((r) => matchWhere(r, args.where)),
        args.orderBy,
      );
      const row = rows[0];
      if (!row) return null;
      return presentRow(model, row, args);
    },
    async findMany(args: {
      where?: Where;
      include?: Record<string, unknown>;
      select?: Record<string, boolean>;
      orderBy?: Record<string, "asc" | "desc">;
      take?: number;
    } = {}) {
      const store = getDemoStore();
      let rows = sortRows(
        store[model].filter((r) => matchWhere(r, args.where)),
        args.orderBy,
      );
      if (args.take) rows = rows.slice(0, args.take);
      return rows.map((r) => presentRow(model, r, args));
    },
    async create(args: {
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
      select?: Record<string, boolean>;
    }) {
      const store = getDemoStore();
      const { row, nestedCreates } = flattenCreateData(args.data);
      store[model].push(row);

      for (const nested of nestedCreates) {
        if (nested.rel === "members" && model === "couple") {
          for (const item of nested.items) {
            store.coupleMember.push({
              id: newDemoId("mem"),
              coupleId: row.id,
              createdAt: new Date(),
              ...item,
            } as DemoRow);
          }
        }
      }

      return presentRow(model, row, args);
    },
    async update(args: {
      where: Where;
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
      select?: Record<string, boolean>;
    }) {
      const store = getDemoStore();
      const idx = store[model].findIndex((r) => matchWhere(r, args.where));
      if (idx < 0) throw new Error(`demo ${model} not found`);
      store[model][idx] = { ...store[model][idx], ...args.data };
      return presentRow(model, store[model][idx], args);
    },
    async updateMany(args: { where?: Where; data: Record<string, unknown> }) {
      const store = getDemoStore();
      let count = 0;
      store[model] = store[model].map((r) => {
        if (!matchWhere(r, args.where)) return r;
        count += 1;
        return { ...r, ...args.data };
      });
      return { count };
    },
    async delete(args: { where: Where }) {
      const store = getDemoStore();
      const idx = store[model].findIndex((r) => matchWhere(r, args.where));
      if (idx < 0) throw new Error(`demo ${model} not found`);
      const [removed] = store[model].splice(idx, 1);
      return removed;
    },
    async deleteMany(args: { where?: Where } = {}) {
      const store = getDemoStore();
      const before = store[model].length;
      store[model] = store[model].filter((r) => !matchWhere(r, args.where));
      return { count: before - store[model].length };
    },
    async upsert(args: {
      where: Where;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      // Support compound uniques like { authorId_day: { authorId, day } }
      let where = args.where;
      const compound = Object.values(args.where).find(
        (v) => v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date),
      );
      if (compound && typeof compound === "object") {
        where = compound as Where;
      }
      const found = await this.findFirst({ where });
      if (found) return this.update({ where: { id: found.id }, data: args.update });
      return this.create({ data: args.create });
    },
  };
}

export function createDemoPrisma() {
  const models = [
    "user",
    "couple",
    "coupleMember",
    "message",
    "messageReaction",
    "diaryEntry",
    "event",
    "letter",
    "mediaItem",
    "place",
    "timelineEvent",
    "wishlistItem",
    "moodPing",
    "careItem",
    "moodCheckIn",
    "gameSession",
    "pushSubscription",
  ] as const;

  const client: Record<string, unknown> = {
    async $transaction(arg: unknown) {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === "function") return arg(client);
      return arg;
    },
    async $connect() {},
    async $disconnect() {},
  };

  for (const m of models) {
    client[m] = modelDelegate(m);
  }

  // Seed store on first access
  getDemoStore();
  console.log("demo-prisma: in-memory store ready (no database)");
  return client;
}
