import Link from "next/link";
import { ArrowUpRight, Layers2 } from "lucide-react";
export function Header({ dashboard = false }: { dashboard?: boolean }) {
  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="Align home">
        <span className="brand-icon">
          <Layers2 size={22} />
        </span>
        align<span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/" className={!dashboard ? "nav-active" : ""}>
          Overview
        </Link>
        <Link href="/dashboard" className={dashboard ? "nav-active" : ""}>
          Find opportunities
        </Link>
      </nav>
      <div className="header-end">
        <span className="demo-pill">
          <span /> Portfolio demo
        </span>
        <Link className="header-cta" href="/dashboard">
          Your next chapter <ArrowUpRight size={16} />
        </Link>
      </div>
    </header>
  );
}
