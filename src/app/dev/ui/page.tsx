import { notFound } from "next/navigation";
import {
  Badge,
  Button,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Panel,
  Select,
  Stack,
  Textarea,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function UiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const swatches = [
    ["ink", "var(--ink)"],
    ["ink-soft", "var(--ink-soft)"],
    ["paper", "var(--paper)"],
    ["paper-deep", "var(--paper-deep)"],
    ["rose", "var(--rose)"],
    ["rose-deep", "var(--rose-deep)"],
    ["rose-soft", "var(--rose-soft)"],
    ["mint", "var(--mint)"],
  ] as const;

  return (
    <div className="ui-gallery">
      <h1>LoveApp UI kit</h1>
      <p className="ui-muted">Dev-only gallery · tokens + primitives for the redesign</p>

      <section>
        <h2>Tokens</h2>
        <div className="ui-swatches">
          {swatches.map(([name, color]) => (
            <div key={name} className="ui-swatch">
              <div className="ui-swatch__chip" style={{ background: color }} />
              <div className="ui-swatch__meta">{name}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Buttons</h2>
        <div className="ui-row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <h2>Form</h2>
        <Panel soft style={{ maxWidth: 420 }}>
          <Field label="Имя" htmlFor="demo-name">
            <Input id="demo-name" placeholder="Аня" />
          </Field>
          <Field label="О себе" htmlFor="demo-bio" hint="До 200 символов">
            <Textarea id="demo-bio" placeholder="Коротко…" />
          </Field>
          <Field label="Роль" htmlFor="demo-role">
            <Select id="demo-role" defaultValue="girl">
              <option value="boy">Мальчик</option>
              <option value="girl">Девочка</option>
            </Select>
          </Field>
          <ErrorText>Пример ошибки валидации</ErrorText>
          <Button type="button" block>
            Сохранить
          </Button>
        </Panel>
      </section>

      <section>
        <h2>Panel & empty</h2>
        <Stack>
          <Panel title="Заголовок панели" narrow>
            <p className="ui-muted">Узкая панель для auth / onboarding.</p>
          </Panel>
          <Panel soft>
            <EmptyState
              title="Пока пусто"
              text="Здесь появятся записи дневника."
              action={<Button variant="secondary">Написать</Button>}
            />
          </Panel>
        </Stack>
      </section>

      <section>
        <h2>Badges</h2>
        <div className="ui-row">
          <Badge>default</Badge>
          <Badge tone="rose">rose</Badge>
          <Badge tone="mint">mint</Badge>
        </div>
      </section>
    </div>
  );
}
