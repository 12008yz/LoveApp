"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsPanel({
  inviteCode,
  demoCouple = false,
}: {
  inviteCode: string;
  demoCouple?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leaveCouple() {
    if (!confirm("Удалить пару и все общие данные? Это необратимо.")) return;
    setBusy(true);
    await fetch("/api/couple", { method: "DELETE" });
    setBusy(false);
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="soft-panel">
      <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Настройки пары</h2>
      <p className="meta">Код пары: {inviteCode}</p>
      {demoCouple ? (
        <p className="meta" style={{ marginTop: "0.35rem" }}>
          Сейчас демо с виртуальным партнёром — по коду третьего не добавить. Для реальной
          пары удалите домик ниже и создайте заново.
        </p>
      ) : (
        <p className="meta" style={{ marginTop: "0.35rem" }}>
          Код можно отправить партнёру, пока в домике одно место свободно.
        </p>
      )}
      <button type="button" className="ghost-btn" onClick={leaveCouple} disabled={busy}>
        {busy ? "Удаляем…" : "Удалить пару и данные"}
      </button>
    </div>
  );
}
