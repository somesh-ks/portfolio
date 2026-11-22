import { BackLink } from "@/components/editorial/BackLink";
import { AsciiEmpty } from "@/components/ui/AsciiEmpty";

export default function NotFound() {
  return (
    <article className="entry">
      <BackLink />
      <header className="entry__header">
        <h1 className="entry__title">Nothing here</h1>
      </header>
      <AsciiEmpty art="lost">
        <p>This page moved or never existed. Everything I've made is linked from the home page.</p>
      </AsciiEmpty>
    </article>
  );
}
