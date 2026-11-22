/** Usage: bun run auth:hash "<password>"  → prints PORTFOLIO_PASSWORD_HASH */
import { hashPassword } from "../src/lib/auth.ts";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: bun run auth:hash "<password of 12+ characters>"');
  process.exit(1);
}
console.warn(await hashPassword(password));
