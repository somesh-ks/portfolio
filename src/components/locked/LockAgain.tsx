/**
 * Shown only on an unlocked study, next to the back link: says this browser
 * is unlocked and signs it out of every locked study. A plain form POST, so it
 * works without JavaScript and the redirect is a full page load (no client
 * cache can keep the unlocked page on screen). BfcacheReload stops Back from
 * replaying the unlocked page out of the back-forward cache.
 */
import { BfcacheReload } from "./BfcacheReload";

export function LockAgain({ slug }: { slug: string }) {
  return (
    <form method="post" action="/api/lock" className="lock-again">
      <input type="hidden" name="slug" value={slug} />
      <span>Unlocked</span>
      <button type="submit" className="lock-again__button pressable">
        Lock again
      </button>
      <BfcacheReload />
    </form>
  );
}
