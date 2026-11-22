import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink() {
  return (
    <Link href="/" className="back-link pressable">
      <ArrowLeft aria-hidden="true" size={15} strokeWidth={1.75} />
      Home
    </Link>
  );
}
