import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  FileText,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/header";
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> A little clarity for your next big move
            </div>
            <h1>
              Your experience.
              <br />
              Your ambitions.
              <br />
              <span>A better fit.</span>
            </h1>
            <p>
              There’s more to your next role than a job title.
              <br className="desktop-break" /> Discover opportunities that
              connect where you’ve
              <br className="desktop-break" /> been with where you want to go.
            </p>
            <div className="hero-actions">
              <Link href="/dashboard" className="button primary">
                Find your next opportunity <ArrowUpRight size={19} />
              </Link>
              <span>No sign-up. Just possibilities.</span>
            </div>
            <div className="hero-note">
              <span className="tiny-stars">✦</span> Built around you, not
              another endless job board.
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustration of a sample job opportunity"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-dot dot-one" />
            <div className="art-dot dot-two" />
            <span className="floating-label">
              <Sparkles size={15} /> A more meaningful match
            </span>
            <div className="match-preview">
              <div className="preview-top">
                <span className="company-logo lavender">F</span>
                <span className="preview-bookmark">✧</span>
              </div>
              <div className="preview-company">
                Forma <span>•</span> Remote
              </div>
              <h2>
                Senior Product
                <br />
                Designer
              </h2>
              <div className="preview-tags">
                <span>Design systems</span>
                <span>Product design</span>
              </div>
              <div className="preview-score">
                <div>
                  <strong>Look beyond the job title.</strong>
                  <p>Explore the work, evidence, and gaps.</p>
                </div>
              </div>
              <div className="preview-reason">
                <Check size={15} /> Your experience, in context.
                <br />
                <Check size={15} /> A clearer application decision.
              </div>
              <div className="preview-footer">
                A glimpse of what’s possible <ArrowUpRight size={17} />
              </div>
            </div>
            <div className="resume-float">
              <span>
                <FileText size={21} />
              </span>
              <div>
                <strong>Your story, connected.</strong>
                <small>Experience → opportunity</small>
              </div>
              <span className="float-check">
                <Check size={14} />
              </span>
            </div>
            <span className="art-caption">
              SAMPLE OPPORTUNITY · DEMONSTRATION DATA
            </span>
          </div>
        </section>
        <section className="principle-strip shell">
          <span>A more intentional way forward</span>
          <p>
            Less searching.<span> More discovering.</span>
          </p>
          <Compass size={32} strokeWidth={1.3} />
        </section>
        <section className="how-section shell" id="how-it-works">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A simpler starting point</span>
              <h2>Big possibilities. Three small steps.</h2>
            </div>
            <Link href="/dashboard">
              Let’s get started <ArrowRight size={17} />
            </Link>
          </div>
          <div className="steps">
            <article>
              <span className="step-icon">
                <FileText size={23} />
              </span>
              <span className="step-number">01</span>
              <h3>Start with your story</h3>
              <p>
                Select your resume in PDF or DOCX format. Your experience is the
                starting point.
              </p>
            </article>
            <article>
              <span className="step-icon">
                <SlidersHorizontal size={23} />
              </span>
              <span className="step-number">02</span>
              <h3>Make room for your priorities</h3>
              <p>
                Set the role, location, work style, and salary that make sense
                for your next chapter.
              </p>
            </article>
            <article>
              <span className="step-icon">
                <Sparkles size={23} />
              </span>
              <span className="step-number">03</span>
              <h3>Explore the possibilities</h3>
              <p>
                Browse sample roles with transparent explanations of what a
                match could look like.
              </p>
            </article>
          </div>
        </section>
        <section className="demo-banner shell">
          <span className="demo-banner-icon">
            <Sparkles size={20} />
          </span>
          <p>
            <strong>A thoughtful prototype, a transparent beginning.</strong>{" "}
            Imported jobs are evaluated with signed-in Codex. Resume and job
            text are sent to OpenAI. Sample jobs are fictional; no live job
            search is performed.
          </p>
          <span className="small-tag">EARLY EXPLORATION</span>
        </section>
      </main>
      <footer className="shell footer">
        <span>
          align. <span>Find work that feels like you.</span>
        </span>
        <span>
          Made for the next chapter. © {new Date().getFullYear()} Align
        </span>
      </footer>
    </>
  );
}
