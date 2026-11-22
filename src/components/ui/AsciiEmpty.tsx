/**
 * Empty state drawn in ASCII. The art is decoration (aria-hidden);
 * the children carry the message for everyone.
 */
const ART = {
  lost: String.raw`
       ___________
      | <- home   |
      |___________|
       ____||______
      | nowhere -> |
      |____________|
            ||
  ,,,,,,,,,,||,,,,,,,,,,`,
  idle: String.raw`
 .---------.
 |  . . .  |
 '---------'`,
} as const;

export function AsciiEmpty({
  art,
  children,
  size = "md",
}: {
  art: keyof typeof ART;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <div className="ascii-empty" data-size={size}>
      <pre className="ascii-empty__art" aria-hidden="true">
        {ART[art].replace(/^\n/, "")}
      </pre>
      <div className="ascii-empty__text">{children}</div>
    </div>
  );
}
