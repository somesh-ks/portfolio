"use client";

/**
 * The same scripted agent run, shown two ways. Left: a spinner, then a wall
 * of text. Right: plan, tool calls and results as readable steps, a stop
 * button that always works, and an approval gate before anything leaves.
 */
import {
  CircleCheck,
  CircleDashed,
  Hand,
  LoaderCircle,
  Play,
  RotateCcw,
  Square,
  Wrench,
} from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { AsciiEmpty } from "@/components/ui/AsciiEmpty";

interface Step {
  kind: "plan" | "tool" | "result" | "gate" | "answer";
  label: string;
  detail: string;
  confidence?: "high" | "low";
}

const SCRIPT: Step[] = [
  {
    kind: "plan",
    label: "Plan",
    detail:
      "Find last week's failed checkout events, group them by error, then draft a note to the team.",
  },
  { kind: "tool", label: "query_events", detail: '{ "event": "checkout_failed", "since": "7d" }' },
  {
    kind: "result",
    label: "212 events",
    detail: "3 error codes. card_declined 61%, timeout 30%, address_invalid 9%.",
    confidence: "high",
  },
  { kind: "tool", label: "read_file", detail: '{ "path": "services/payments/retry.ts" }' },
  {
    kind: "result",
    label: "Likely cause",
    detail:
      "Timeouts start after the retry change on Tuesday. The diff lowers the timeout from 8s to 3s.",
    confidence: "low",
  },
  {
    kind: "gate",
    label: "Send email to #payments (14 people)?",
    detail: "Subject: Checkout timeouts since Tuesday's retry change",
  },
  {
    kind: "answer",
    label: "Done",
    detail: "Summary sent. Timeouts are the fixable part; declines are expected.",
  },
];

const DUMP =
  "I looked into the checkout failures. There were 212 events over the last 7 days with three error codes: card_declined accounts for 61%, timeout for 30% and address_invalid for 9%. Looking at services/payments/retry.ts the timeouts seem to begin after the retry change on Tuesday which lowered the timeout from 8s to 3s. I have sent an email to #payments with the subject Checkout timeouts since Tuesday's retry change.";

type Status = "idle" | "running" | "waiting" | "stopped" | "done";
interface State {
  status: Status;
  shown: number;
  naive: "idle" | "spinning" | "dumped";
  approved: boolean | null;
}
type Action =
  | { type: "start" }
  | { type: "advance" }
  | { type: "stop" }
  | { type: "decide"; approved: boolean }
  | { type: "naive"; phase: State["naive"] }
  | { type: "reset" };

const INITIAL: State = { status: "idle", shown: 0, naive: "idle", approved: null };
const GATE_INDEX = SCRIPT.findIndex((step) => step.kind === "gate");

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...INITIAL, status: "running", shown: 1, naive: "spinning" };
    case "advance": {
      if (state.status !== "running") return state;
      const shown = state.shown + 1;
      if (shown - 1 === GATE_INDEX) return { ...state, shown, status: "waiting" };
      if (shown >= SCRIPT.length) return { ...state, shown: SCRIPT.length, status: "done" };
      return { ...state, shown };
    }
    case "stop":
      return state.status === "running" || state.status === "waiting"
        ? { ...state, status: "stopped" }
        : state;
    case "decide":
      return action.approved
        ? { ...state, approved: true, status: "running", shown: state.shown + 1 }
        : { ...state, approved: false, status: "done" };
    case "naive":
      return { ...state, naive: action.phase };
    case "reset":
      return INITIAL;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

const STEP_DELAY_MS = 900;
const NAIVE_DELAY_MS = 4200;

function StepIcon({ step, active }: { step: Step; active: boolean }) {
  const props = { "aria-hidden": true, size: 15, strokeWidth: 1.75 } as const;
  if (active) return <LoaderCircle {...props} className="spin" />;
  if (step.kind === "tool") return <Wrench {...props} />;
  if (step.kind === "gate") return <Hand {...props} />;
  return <CircleCheck {...props} />;
}

export function AgenticStreamDemo() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { play } = useSound();
  const stopRef = useRef<HTMLButtonElement>(null);

  // One timer per visible step: `shown` is a dependency so each step re-arms it.
  // oxlint-disable-next-line react/exhaustive-deps
  useEffect(() => {
    if (state.status !== "running") return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "advance" });
      play("tick");
    }, STEP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.status, state.shown, play]);

  useEffect(() => {
    if (state.naive !== "spinning") return;
    const timer = window.setTimeout(
      () => dispatch({ type: "naive", phase: "dumped" }),
      NAIVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [state.naive]);

  const active = state.status === "running" || state.status === "waiting";
  const steps = SCRIPT.slice(0, state.shown);

  return (
    <div className="toy stream">
      <div className="toy__bar">
        {active ? (
          <button
            ref={stopRef}
            type="button"
            className="button pressable"
            onClick={() => {
              dispatch({ type: "stop" });
              play("toggle");
            }}
          >
            <Square aria-hidden="true" size={14} strokeWidth={2} />
            Stop
          </button>
        ) : state.status === "idle" ? (
          <button
            type="button"
            className="button button--primary pressable"
            onClick={() => {
              dispatch({ type: "start" });
              play("tap");
            }}
          >
            <Play aria-hidden="true" size={14} strokeWidth={2} />
            Run both
          </button>
        ) : (
          <button
            type="button"
            className="button pressable"
            onClick={() => {
              dispatch({ type: "start" });
              play("tap");
            }}
          >
            <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
            Run again
          </button>
        )}
        <span className="toy__status" aria-live="polite">
          {
            {
              idle: "Ready",
              running: "Working",
              waiting: "Waiting for you",
              stopped: "Stopped by you",
              done: "Finished",
            }[state.status]
          }
        </span>
      </div>

      <div className="stream__panes">
        <section className="stream__pane" aria-labelledby="naive-title">
          <h3 id="naive-title" className="stream__title">
            Spinner, then a wall
          </h3>
          <div className="stream__body">
            {state.naive === "idle" ? (
              <AsciiEmpty art="idle" size="sm">
                Nothing yet.
              </AsciiEmpty>
            ) : null}
            {state.naive === "spinning" ? (
              <p className="stream__spinner">
                <LoaderCircle aria-hidden="true" size={18} className="spin" />
                Thinking…
              </p>
            ) : null}
            {state.naive === "dumped" ? <p className="stream__dump">{DUMP}</p> : null}
          </div>
        </section>

        <section className="stream__pane" aria-labelledby="staged-title">
          <h3 id="staged-title" className="stream__title">
            Staged, stoppable, gated
          </h3>
          <ol className="stream__steps">
            {state.status === "idle" ? (
              <li>
                <AsciiEmpty art="idle" size="sm">
                  Nothing yet.
                </AsciiEmpty>
              </li>
            ) : null}
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              const isGate = step.kind === "gate";
              return (
                <li
                  key={step.label}
                  className={`stream__step stream__step--${step.kind}`}
                  data-confidence={step.confidence}
                >
                  <span className="stream__icon">
                    <StepIcon
                      step={step}
                      active={isLast && state.status === "running" && step.kind === "tool"}
                    />
                  </span>
                  <span className="stream__text">
                    <span className="stream__label">
                      {step.label}
                      {step.confidence === "low" ? (
                        <span className="stream__confidence">Unsure, worth checking</span>
                      ) : null}
                    </span>
                    <span className={step.kind === "tool" ? "stream__args" : "stream__detail"}>
                      {step.detail}
                    </span>
                    {isGate && state.status === "waiting" ? (
                      <span className="stream__gate">
                        <button
                          type="button"
                          className="button button--primary pressable"
                          onClick={() => {
                            dispatch({ type: "decide", approved: true });
                            play("pop");
                          }}
                        >
                          Send it
                        </button>
                        <button
                          type="button"
                          className="button pressable"
                          onClick={() => {
                            dispatch({ type: "decide", approved: false });
                            play("toggle");
                          }}
                        >
                          Don&apos;t send
                        </button>
                      </span>
                    ) : null}
                    {isGate && state.approved === false ? (
                      <span className="stream__detail">You said no. Nothing was sent.</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
            {state.status === "stopped" ? (
              <li className="stream__step stream__step--stopped">
                <span className="stream__icon">
                  <CircleDashed aria-hidden="true" size={15} strokeWidth={1.75} />
                </span>
                <span className="stream__text">
                  <span className="stream__label">Stopped</span>
                  <span className="stream__detail">Nothing after this point ran.</span>
                </span>
              </li>
            ) : null}
          </ol>
        </section>
      </div>
    </div>
  );
}
