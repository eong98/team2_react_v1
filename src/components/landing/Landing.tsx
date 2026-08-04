import Header from './sections/Header';
import Hero from './sections/Hero';
import ProblemSection from './sections/ProblemSection';
import FeaturesSection from './sections/FeaturesSection';
import FlowSection from './sections/FlowSection';
import DashboardPreview from './sections/DashboardPreview';
import RoadmapSection from './sections/RoadmapSection';
import LinksSection from './sections/LinksSection';
import CtaSection from './sections/CtaSection';
import Footer from './sections/Footer';
import './landing.css'

export default function Landing() {
  return (
    <div className='landing'>
      <Header />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <FlowSection />
      <DashboardPreview />
      <RoadmapSection />
      <LinksSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
