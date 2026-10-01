import Hero from '@/sections/Hero'
import About from '@/sections/About'
import Solutions from '@/sections/Solutions'
import Services from '@/sections/Services'
import Features from '@/sections/Features'
import HowItWorks from '@/sections/HowItWorks'
import Gallery from '@/sections/Gallery'
import Pricing from '@/sections/Pricing'
import Faq from '@/sections/Faq'
import Footer from '@/sections/Footer'

export default function LandingPage() {
  return (
    <div className="landing overflow-x-clip">
      <main>
        <Hero />
        <About />
        <Solutions />
        <Services />
        <Features />
        <HowItWorks />
        <Gallery />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
