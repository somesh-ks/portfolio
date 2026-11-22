import { CopyButton } from "./CopyButton";

/** One command with a copy button. The prompt is drawn by CSS, so it is never selected or copied. */
export function Command({ command, prompt = "$" }: { command: string; prompt?: string }) {
  return (
    <div className="command" data-copy-root>
      {/* Long commands scroll sideways on phones, so the line must be keyboard reachable. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre className="command__text" data-prompt={prompt} tabIndex={0}>
        <code>{command}</code>
      </pre>
      <CopyButton text={command} />
    </div>
  );
}
