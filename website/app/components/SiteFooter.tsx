import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-ink px-5 py-10 text-paper sm:px-8 lg:px-12">
      <div className="site-frame flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
        <div>
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <Image src="/app-icon.svg" alt="" width={34} height={34} />
            Mneme
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-paper/60">
            A desktop workspace for making course material usable.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-paper/60">
          <Link href="/features" className="hover:text-paper">
            Features
          </Link>
          <Link href="/workflow" className="hover:text-paper">
            How it works
          </Link>
          <Link href="/privacy" className="hover:text-paper">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-paper">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
