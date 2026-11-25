import { BackLink } from "@/components/editorial/BackLink";
import { SiteChrome } from "@/components/editorial/SiteChrome";
import { AsciiEmpty } from "@/components/ui/AsciiEmpty";

export default function NotFound() {
  // The root not-found sits outside the (site) group, so it brings its own frame.
  return (
    <SiteChrome>
      <article className="entry">
        <BackLink />
        <header className="entry__header">
          <h1 className="entry__title">Nothing here</h1>
        </header>
        <AsciiEmpty art="lost">
          <p>
            This page moved or never existed. Everything I've made is linked from the home page.
          </p>
        </AsciiEmpty>
      </article>
    </SiteChrome>
  );
}
