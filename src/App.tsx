import { useState, useEffect } from "react";
import { Nav } from "./components/sections/Nav";
import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { Enterprise } from "./components/sections/Enterprise";
import { HowItWorks } from "./components/sections/HowItWorks";
import { Install } from "./components/sections/Install";
import { Footer } from "./components/sections/Footer";
import { Terms } from "./components/pages/Terms";
import { Privacy } from "./components/pages/Privacy";

function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export function App() {
  const route = useHashRoute();

  if (route === "#/terms") {
    return (
      <div className="min-h-screen text-[var(--foreground)]">
        <Nav />
        <Terms />
        <Footer />
      </div>
    );
  }

  if (route === "#/privacy") {
    return (
      <div className="min-h-screen text-[var(--foreground)]">
        <Nav />
        <Privacy />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <Nav />
      <Hero />
      <Features />
      <Enterprise />
      <HowItWorks />
      <Install />
      <Footer />
    </div>
  );
}
