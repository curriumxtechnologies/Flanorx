import Navbar from "../../components/public_components/Navbar"
import Hero from "../../components/public_components/Hero"
import WhatWeDo from "../../components/public_components/WhatWeDo"
import ForBusiness from "../../components/public_components/ForBusiness"
import Partners from "../../components/public_components/Partners"
import Footer from "../../components/public_components/Footer"

const Homepage = () => {
  return (
    <div>
      <Navbar />
      <Hero />
      <WhatWeDo />
      <ForBusiness />
      <Partners />
      <Footer />
    </div>
  )
}

export default Homepage
