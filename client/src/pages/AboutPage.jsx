
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./AboutPage.css";

function AboutPage() {
  const slides = [
    "/assets/slideshow_image_1.png",
    "/assets/slideshow_image_2.png",
    "/assets/slideshow_image_3.png"
  ];
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);

  useEffect(() => {
  const interval = setInterval(() => {
    setCurrentSlide(previous =>
      previous === slides.length - 1 ? 0 : previous + 1
    );
  }, 4000);

  return () => clearInterval(interval);
}, []);

  return (
    <main className="about-page">
      <header className="about-header">
        <div className="about-logo">
          <img src="/assets/logo_image.png" alt="Whiteboard logo" />
        </div>



        <Link to="/whiteboard" className="sign-in-button">
          Sign in
        </Link>
      </header>

      <section id="overview" className="hero-section">
        <div className="hero-copy-panel">
          <div className="hero-copy">
            <h1>With Interboard, put the thoughts to the canvas.</h1>
            <p>
              Create, draw, type, and collaborate on a shared whiteboard from
              anywhere.
            </p>

            <div className="hero-actions">
              <Link to="/whiteboard" className="primary-button">
                Start Drawing
              </Link>

            </div>
          </div>
        </div>

        <div className="hero-image-panel">
          <div className="hero-image-slider">
  {slides.map((slide, index) => (
    <img
      key={slide}
      src={slide}
      alt="Whiteboard preview"
      className={`hero-slide ${
        index === currentSlide ? "active" : ""
      }`}
    />
  ))}
</div>
        </div>
      </section>

      <section
  className={`showcase-section ${isShowcaseOpen ? "open" : ""}`}
>
  <button
    className="showcase-toggle"
    type="button"
    onClick={() => setIsShowcaseOpen(previous => !previous)}
  >
    See what you can do with Interboard
    <span>{isShowcaseOpen ? "⌃" : "⌄"}</span>
  </button>

    <div className="showcase-content">
      <div className="showcase-row">
        <img src="/assets/showcase_1.png" alt="Plain Fun showcase" />
        <div className="showcase-text">
          <h2>Plain Fun</h2>
          <p>Doodle, brainstorm, play quick games, or just draw freely with friends.</p>
        </div>
      </div>

      <div className="showcase-row reverse">
        <img src="/assets/showcase_2.png" alt="Planning showcase" />
        <div className="showcase-text">
          <h2>Planning</h2>
          <p>Map out workflows, organize ideas, and turn messy thoughts into clear plans.</p>
        </div>
      </div>

      <div className="showcase-row">
        <img src="/assets/showcase_3.png" alt="Expression showcase" />
        <div className="showcase-text">
          <h2>Expression</h2>
          <p>Sketch, annotate, illustrate, and visually communicate ideas your way.</p>
        </div>
      </div>
    </div>
</section>
    </main>
  );
}

export default AboutPage;