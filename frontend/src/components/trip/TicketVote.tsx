import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { AvatarStack } from "../common/AvatarStack";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { useIsViewer } from "../../hooks/useIsViewer";
import { useCastTicketVote, useDeleteTicketPoll, useOpenTicketPoll, useTicketsBought } from "../../hooks/useTicketPoll";
import { useMyNames, useUsers } from "../../hooks/useUsers";
import { toast } from "../../store/toast.store";
import { formatAmount, formatTicketSaleStart } from "../../utils/format";
import { groupPeople } from "../../utils/people";
import { myTicketChoice, notVotedYet, tallyTicketPoll, VOTE_UNSURE, type TicketTally } from "../../utils/ticketPoll";
import { tripInfo, tripPeople, type Trip } from "../../utils/trips";
import type { TicketPoll, TicketPollOption } from "../../types";

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** What a member picked, in words: the ticket's name, or "Weet ik nog niet". */
export function choiceLabel(poll: Pick<TicketPoll, "options">, choice: string | null): string | null {
  if (choice === null) return null;
  if (choice === VOTE_UNSURE) return "Weet ik nog niet";
  return poll.options.find((o) => o.id === choice)?.label ?? null;
}

/** The ticket options with a bar for how many people want each: the card on the overview while the vote is open. */
export function TicketBars({ tally, myChoice }: { tally: TicketTally; myChoice: string | null }) {
  const most = Math.max(1, ...tally.options.map((o) => o.people.length));
  return (
    <ul className="space-y-2.5">
      {tally.options.map(({ option, people }) => (
        <li key={option.id}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
              <span className="truncate">{option.label}</span>
              {myChoice === option.id && <Check size={14} className="shrink-0 text-brand-text" aria-label="Jouw keuze" />}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-ink-2">
              {people.length}
              {option.price > 0 && <span className="text-ink-3"> · {formatAmount(option.price)}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <div className="h-full rounded-full bg-brand" style={{ width: `${(people.length / most) * 100}%` }} />
          </div>
        </li>
      ))}
      {tally.unsure.length > 0 && <li className="text-[12.5px] text-ink-3">{tally.unsure.length} weet het nog niet</li>}
    </ul>
  );
}

/** One thing to pick: a ticket, or "unsure". The chosen one has the ink border and a tick. */
function ChoiceButton({
  label, detail, chosen, people, disabled, onClick,
}: { label: string; detail?: string; chosen: boolean; people: string[]; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={chosen}
      className={`flex w-full items-center gap-3 rounded-xl border-1.5 px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed ${
        chosen ? "border-ink bg-sunken" : "border-line bg-surface hover:border-ink-3"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{label}</span>
        {detail && <span className="block text-[12.5px] text-ink-3">{detail}</span>}
      </span>
      <AvatarStack names={people} size="sm" max={4} />
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${chosen ? "bg-selected text-selected-on" : "border-1.5 border-line"}`}>
        {chosen && <Check size={12} />}
      </span>
    </button>
  );
}

/** Pick your ticket, see who has not voted, and (for admins) close the vote by saying who bought. */
export function TicketVoteView({ trip, poll }: { trip: Trip; poll: TicketPoll }) {
  const { me, myNames } = useMyNames();
  const { data: users = [] } = useUsers();
  const viewer = useIsViewer();
  const vote = useCastTicketVote(trip.id);
  const info = tripInfo(trip);
  const tally = tallyTicketPoll(poll, users);
  const myChoice = myTicketChoice(poll, myNames);
  const missing = notVotedYet(tripPeople(trip, users), tally);
  const canVote = !viewer && !!me;

  async function pick(choice: string) {
    if (!me) return;
    // Under the name the member already voted with, so a changed vote replaces the old one.
    const asName = poll.votes.find((v) => myNames.includes(v.voter))?.voter ?? me.name;
    try {
      await vote.mutateAsync({ choice, userName: asName });
    } catch (e) {
      toast("error", errorText(e, "Je stem is niet opgeslagen. Probeer opnieuw."));
    }
  }

  const peopleOf = (names: { name: string }[]) => names.map((p) => p.name);

  return (
    <div className="space-y-5">
      {info.ticket_sale_start && (
        <p className="text-[13px] text-ink-2">Verkoop start {formatTicketSaleStart(info.ticket_sale_start)}.</p>
      )}

      <div className="space-y-2">
        <p className="section-label">Welk ticket wil jij?</p>
        {tally.options.map(({ option, people }) => (
          <ChoiceButton
            key={option.id}
            label={option.label}
            detail={option.price > 0 ? formatAmount(option.price) : undefined}
            chosen={myChoice === option.id}
            people={peopleOf(people)}
            disabled={!canVote}
            onClick={() => pick(option.id)}
          />
        ))}
        <ChoiceButton label="Weet ik nog niet" chosen={myChoice === VOTE_UNSURE} people={peopleOf(tally.unsure)} disabled={!canVote} onClick={() => pick(VOTE_UNSURE)} />
      </div>

      {missing.length > 0 && (
        <div>
          <p className="section-label mb-1.5">Nog niet gestemd ({missing.length})</p>
          <p className="text-[13px] leading-relaxed text-ink-2">{missing.map((p) => p.name).join(", ")}</p>
        </div>
      )}

      <AdminClose trip={trip} poll={poll} />
    </div>
  );
}

/** Admins only: who bought which ticket, which ends the vote; or throw the vote away. */
function AdminClose({ trip, poll }: { trip: Trip; poll: TicketPoll }) {
  const { me } = useMyNames();
  const { data: users = [] } = useUsers();
  const bought = useTicketsBought(trip.id);
  const remove = useDeleteTicketPoll(trip.id);
  const [buyer, setBuyer] = useState("");
  const [optionId, setOptionId] = useState<string>(poll.options[0]?.id ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  if (!me?.is_admin) return null;

  async function submit() {
    try {
      await bought.mutateAsync({ buyer, optionId });
      toast("success", "De tickets staan als gekocht.");
    } catch (e) {
      toast("error", errorText(e, "Kon de tickets niet als gekocht zetten. Probeer opnieuw."));
    }
  }

  return (
    <div className="space-y-3 rounded-xl border-1.5 border-line p-3.5">
      <p className="section-label">Voor beheerders: tickets gekocht</p>
      <div>
        <span className="field-label">Wie heeft ze gekocht?</span>
        <NamePicker options={users.map((u) => u.name)} value={buyer} onChange={setBuyer} placeholder="Kies de koper…" />
      </div>
      <div>
        <span className="field-label">Welk ticket is het?</span>
        <div className="flex flex-wrap gap-2">
          {poll.options.map((o: TicketPollOption) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOptionId(o.id)}
              className={`chip ${optionId === o.id ? "chip-on" : "chip-off"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <Button className="w-full" onClick={submit} loading={bought.isPending} disabled={!buyer || !optionId}>
        Tickets zijn gekocht
      </Button>
      <DeleteVote confirming={confirmingDelete} setConfirming={setConfirmingDelete} onDelete={() => remove.mutate()} />
    </div>
  );
}

function DeleteVote({ confirming, setConfirming, onDelete }: { confirming: boolean; setConfirming: (v: boolean) => void; onDelete: () => void }) {
  return confirming ? (
    <div className="flex items-center justify-end gap-2">
      <span className="mr-auto text-[12.5px] text-ink-2">De stemmen gaan verloren.</span>
      <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Annuleren</Button>
      <Button size="sm" variant="danger" onClick={onDelete}>Verwijderen</Button>
    </div>
  ) : (
    <button type="button" onClick={() => setConfirming(true)} className="btn-ghost btn-compact w-full px-3.5">
      <Trash2 size={14} /> Poll verwijderen
    </button>
  );
}

/** After the tickets are bought: who bought which ticket, and the vote is out of the way. Admins can still throw it away. */
export function TicketBoughtView({ trip, poll }: { trip: Trip; poll: TicketPoll }) {
  const { me, myNames } = useMyNames();
  const { data: users = [] } = useUsers();
  const remove = useDeleteTicketPoll(trip.id);
  const [confirming, setConfirming] = useState(false);
  const option = poll.options.find((o) => o.id === poll.chosen_option);
  const mine = choiceLabel(poll, myTicketChoice(poll, myNames));
  const buyer = poll.buyer ? groupPeople([poll.buyer], users)[0]?.name ?? poll.buyer : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-1.5 border-line bg-sunken px-3.5 py-3">
        <p className="text-[14px] font-semibold text-ink">Gekocht door {buyer}</p>
        {option && (
          <p className="mt-0.5 text-[13px] text-ink-2">
            {option.label}
            {option.price > 0 && ` · ${formatAmount(option.price)} per ticket`}
          </p>
        )}
        {mine && <p className="mt-0.5 text-[13px] text-ink-3">Jij koos: {mine}</p>}
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-3">Betalen regel je met {buyer ?? "de koper"} via Financiën.</p>
      {me?.is_admin && <DeleteVote confirming={confirming} setConfirming={setConfirming} onDelete={() => remove.mutate()} />}
    </div>
  );
}

interface DraftOption {
  key: number;
  label: string;
  price: string;
}

/** Admins only: start a vote. The tickets of the event are filled in already and can be changed. */
export function StartTicketVote({ trip }: { trip: Trip }) {
  const open = useOpenTicketPoll(trip.id);
  const info = tripInfo(trip);
  const [options, setOptions] = useState<DraftOption[]>(() =>
    (info.ticket_types ?? []).map((t, i) => ({ key: i, label: t.title, price: String(t.price) })),
  );
  const [counter, setCounter] = useState(options.length);

  const update = (key: number, patch: Partial<DraftOption>) => setOptions((all) => all.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const ready = options.length > 0 && options.every((o) => o.label.trim());

  async function submit() {
    try {
      await open.mutateAsync(options.map((o) => ({ label: o.label.trim(), price: Number(o.price.replace(",", ".")) || 0 })));
      toast("success", "De ticket poll is geopend.");
    } catch (e) {
      toast("error", errorText(e, "Kon de poll niet openen. Probeer opnieuw."));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-ink-2">
        Laat iedereen stemmen welk ticket ze willen, bijvoorbeeld alleen zaterdag of het hele weekend.
      </p>
      {options.map((o) => (
        <div key={o.key} className="flex items-center gap-2">
          <input
            className="input-field min-w-0 flex-1"
            value={o.label}
            onChange={(e) => update(o.key, { label: e.target.value })}
            placeholder="Bijvoorbeeld za + zo"
            aria-label="Naam van het ticket"
            maxLength={60}
          />
          <input
            className="input-field w-24 shrink-0"
            value={o.price}
            onChange={(e) => update(o.key, { price: e.target.value })}
            placeholder="€"
            inputMode="decimal"
            aria-label="Prijs in euro"
          />
          <button type="button" className="icon-btn shrink-0" aria-label="Ticket weghalen" onClick={() => setOptions((all) => all.filter((x) => x.key !== o.key))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {options.length < 8 && (
        <button
          type="button"
          className="btn-tonal btn-compact w-full px-3.5"
          onClick={() => {
            setOptions((all) => [...all, { key: counter, label: "", price: "" }]);
            setCounter((c) => c + 1);
          }}
        >
          <Plus size={14} /> Ticket toevoegen
        </button>
      )}
      <Button className="w-full" onClick={submit} loading={open.isPending} disabled={!ready}>
        Poll openen
      </Button>
    </div>
  );
}
