
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

        <nav className="about-nav">
          <a className="active" href="#overview">Overview</a>
          <a href="#features">Features</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <Link to="/whiteboard" className="sign-in-button">
          Sign in
        </Link>
      </header>

      <section id="overview" className="hero-section">
        <div className="hero-copy-panel">
          <div className="hero-copy">
            <h1>Build your best ideas together, in Whiteboard</h1>
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

      <section id="features" className="features-section">
        <p>See what you can do with Whiteboard</p>
        <span className="down-arrow">⌄</span>
      </section>
    </main>
  );
}

export default AboutPage;