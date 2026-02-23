import { useState, useEffect, useRef, useMemo } from "react";

// ─── DESIGN TOKENS ───
const T = {
  bgAbyss: "#060A12", bgPrimary: "#0A0E17", bgSecondary: "#111827", bgCard: "#1A2332",
  bgElevated: "#243044", bgHover: "#2A3A52",
  textPrimary: "#E8ECF1", textHeading: "#F5F7FA", textSecondary: "#7A8698", textMuted: "#3D4B5E",
  gold: "#D4A853", blue: "#2D9CDB", red: "#E85D4A", green: "#27AE60", violet: "#9B6DFF",
  amber: "#F5A623", cyan: "#00BCD4", orange: "#E67E22", rose: "#E84393",
  glassBg: "rgba(26, 35, 50, 0.7)", glassBorder: "rgba(255, 255, 255, 0.06)",
};

// ═══════════════════════════════════════════════════════════════
// SIGNAL DATA — 41 representative signals from 123-signal scan
// Full scan: 72 primary + 51 adjacent-field = 123 total
// ═══════════════════════════════════════════════════════════════

const SIGNALS = [
  { id: "S-001", title: "Bond Pet Foods: Precision-Fermented Chicken Protein Passes 6-Month Dog Feeding Trial", category: "T", geo: "US", surprise: 3, confidence: "Verified", type: "Positive", source: "University of Illinois / Bond Pet Foods", summary: "Six-month feeding study showed dogs consuming precision-fermented chicken protein (yeast + chicken DNA) had beneficial gut microbiota changes, no adverse reactions. First study of its kind in pet food.", soWhat: "If fermented protein proves safe and palatable at scale, what happens to traditional pet food supply chains?", cluster: "Protein Without Animals" },
  { id: "S-002", title: "Precision Fermentation Predicted to Embed in Incumbent Food Infrastructure by 2026", category: "T", geo: "Global", surprise: 2, confidence: "Probable", type: "Positive", source: "PPTI / Future of Protein Production", summary: "Industry analysis predicts precision fermentation will move from standalone startups to embedding inside existing food manufacturing infrastructure. Pet food identified as early adoption category where consumers are less resistant.", soWhat: "Does pet food become the proving ground for precision fermentation before human food scales?", cluster: "Protein Without Animals" },
  { id: "S-003", title: "Marsapet Launches World's First Bacterial Fermentation Protein Dog Food (Microbell)", category: "T", geo: "Germany", surprise: 3, confidence: "Verified", type: "Positive", source: "Sustainable Pet Food Association", summary: "Marsapet in Germany launched Microbell, the world's first commercially available dog food using bacterial fermentation protein. Signals regulatory pathway is clear in EU for fermented pet food ingredients.", soWhat: "European regulatory acceptance of fermented pet protein could create first-mover advantage for brands with fermentation supply.", cluster: "Protein Without Animals" },
  { id: "S-004", title: "Calysta FeedKind Pet: Precision-Fermented Non-GMO Vegan Protein Available to EU Manufacturers", category: "T", geo: "EU", surprise: 2, confidence: "Verified", type: "Positive", source: "Calysta / InsightAce Analytic", summary: "Calysta's FeedKind Pet, a precision-fermented, non-GMO, vegan protein for pet food, is now available to pet food manufacturers across Europe. Nutrient-dense, highly digestible, with postbiotic gut health properties.", soWhat: "When alternative proteins become ingredient commodities, does brand trust become the only differentiator?", cluster: "Protein Without Animals" },
  { id: "S-005", title: "ADM Opens Dedicated Animal Microbiome R&D Centre in Lausanne", category: "T", geo: "Switzerland", surprise: 2, confidence: "Verified", type: "Positive", source: "ADM Press Release", summary: "ADM opened a 1,600 sq metre R&D centre dedicated exclusively to pet and farm animal microbiome research. Global biotics animal feed market estimated at $5.2B in 2024. 84% of pet owners interested in lifespan-extending products.", soWhat: "When a major ingredient supplier invests this heavily in microbiome, does it signal the category is about to mainstream?", cluster: "The Genomic Table" },
  { id: "S-006", title: "Pet Microbiome Testing Startups Proliferate: Biome9, AnimalBiome, Treat Therapeutics", category: "T", geo: "US/UK/Singapore", surprise: 2, confidence: "Verified", type: "Positive", source: "Sifted / TechRound", summary: "Multiple startups now offer at-home pet gut microbiome testing kits. Biome9 (UK, acquired by Pooch & Mutt), AnimalBiome (US, largest fecal sample collection), Treat Therapeutics (Singapore, decentralised clinical trials). Purina launched Petivity microbiome kits.", soWhat: "If gut health testing becomes routine, does it create a data flywheel that locks consumers into brand ecosystems?", cluster: "The Genomic Table" },
  { id: "S-007", title: "Purina Petivity: Three-Tier Microbiome Analysis Kit with Vet Reporting", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Purina / Petivity", summary: "Purina's Petivity now offers three levels of microbiome testing, from basic bacterial diversity to advanced vet-reporting with uncommon bacteria identification. Integrates with myPurina rewards programme.", soWhat: "Purina is building a data-to-nutrition loop via microbiome testing. Is Mars's Wisdom Panel doing the same with genomics?", cluster: "The Genomic Table" },
  { id: "S-008", title: "Dog Aging Project TRIAD Trial: $7M NIH Grant, Expanding to 580 Dogs", category: "T", geo: "US", surprise: 3, confidence: "Verified", type: "Positive", source: "Texas A&M / NIH / AVMA", summary: "The Dog Aging Project received $7M from NIH to expand its rapamycin clinical trial (TRIAD) from 170 to 580 dogs across 20+ US sites. Testing whether low-dose rapamycin extends lifespan in medium-to-large breed dogs. First dogs have completed the 3-year trial.", soWhat: "If rapamycin extends canine lifespan by even 10-15%, what cascading effects on pet food lifetime value, insurance, and end-of-life care?", cluster: "The Longevity Dividend" },
  { id: "S-009", title: "FDA Conditionally Approves Rapamycin (Felycin-CA1) for Cats with HCM", category: "T", geo: "US", surprise: 3, confidence: "Verified", type: "Positive", source: "FDA / Journal of Veterinary Science", summary: "FDA granted conditional approval for a delayed-release rapamycin tablet for managing ventricular hypertrophy in cats with subclinical HCM. First rapamycin product approved for any veterinary species. Pivotal field trial ongoing.", soWhat: "First vet-approved longevity-adjacent drug. Does this open a regulatory pathway for broader anti-aging pet pharmaceuticals?", cluster: "The Longevity Dividend" },
  { id: "S-010", title: "PetPace V3.0: AI Smart Collar with 24/7 Telehealth and Seizure Monitoring", category: "T", geo: "US/Israel", surprise: 2, confidence: "Verified", type: "Positive", source: "PetPace / dvm360", summary: "PetPace launched V3.0 smart collar providing clinical-grade vital signs (temperature, pulse, HRV, respiration), integrated telehealth via live chat/video, and an epilepsy monitoring feature that records seizure events for neurologists.", soWhat: "When wearables provide clinical-grade data, does the locus of veterinary care shift permanently to the home?", cluster: "The Veterinary Desert" },
  { id: "S-011", title: "Mars Petcare's RenalTech: AI Predicts Feline CKD Two Years Early", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "AVMA / Cornell SAVY Symposium", summary: "Mars Petcare developed RenalTech, a proprietary AI tool trained on hundreds of thousands of cat medical records from Banfield/BluePearl. Predicts whether a cat will develop chronic kidney disease within two years using blood and urine data.", soWhat: "This is the flywheel in action: Banfield data → AI model → predictive care. Can competitors replicate this without Mars's clinical data volume?", cluster: "The Genomic Table" },
  { id: "S-012", title: "Sylvester.ai: AI Feline Pain Detection via Facial Recognition", category: "T", geo: "US", surprise: 3, confidence: "Verified", type: "Positive", source: "Digitail / dvm360", summary: "Sylvester.ai uses facial recognition technology to assess feline pain levels in real time by analysing subtle facial cues. Helps owners and vets catch health issues early. Part of a broader wave of AI-powered at-home pet health screening.", soWhat: "If AI can read animal emotions from faces, does computational ethology become a standard feature of pet care platforms?", cluster: "The Multispecies City" },
  { id: "S-013", title: "39.2% of Veterinary Professionals Now Regularly Use AI in Practice", category: "T", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "2024 Veterinary Survey / dvm360", summary: "A 2024 survey found that nearly 4 in 10 veterinary professionals regularly use AI tools, primarily for diagnostic imaging (radiograph analysis) and medical record management. Roughly two dozen companies now market AI-powered veterinary software.", soWhat: "AI adoption in vet practice is approaching a tipping point. Does this accelerate or complicate Mars's own AI tools?", cluster: "The Veterinary Desert" },
  { id: "S-014", title: "Petnow and iSciLab: Dog Nose Print Recognition to Replace Microchips", category: "T", geo: "South Korea/US", surprise: 3, confidence: "Probable", type: "Positive", source: "AVMA / Cornell SAVY Symposium", summary: "Two companies developing nose print biometric recognition for dogs that could eventually replace microchip identification. Each dog's nose print is unique, like a human fingerprint.", soWhat: "Biometric pet identity opens new data layers — but also new privacy questions about who owns the biometric template.", cluster: "Pet Data Governance" },
  { id: "S-015", title: "US Pet Industry Hits $152B in 2024, Projected $157B in 2025", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "APPA 2025 State of the Industry", summary: "Total US pet industry expenditure reached $152B in 2024. Despite economic uncertainty, 77% of pet owners report financial concerns have not impacted their pet ownership.", soWhat: "The pet economy is remarkably recession-resistant, but a K-shaped split between premium and value is emerging.", cluster: "Market Structure" },
  { id: "S-016", title: "US Pet Insurance: $4.7B GWP, 6.4M Insured Pets, But Still Under 4% Penetration", category: "Ec", geo: "US", surprise: 2, confidence: "Verified", type: "Absence", source: "NAPHIA 2025 SOI Report", summary: "US pet insurance GWP surpassed $4.7B in 2024 (21.4% YoY growth). 6.4M pets insured. But penetration remains below 4% for dogs and cats combined. UK is at 25%+, Sweden at 50%+. 39% of vets say insurance isn't worth the money.", soWhat: "Why hasn't the US cracked pet insurance when every signal says it should? Is this Mars's biggest adjacent opportunity?", cluster: "The Insurance Gap" },
  { id: "S-017", title: "Pet Industry Entering Recalibration: Dog Ownership Declining, K-Shaped Economy Emerging", category: "Ec", geo: "US", surprise: 2, confidence: "Verified", type: "Negative", source: "Cascadia Capital Winter 2025/2026 Report", summary: "Cascadia Capital reports declining dog ownership, 4% YoY decline in shelter intakes, and a K-shaped economy where affluent owners spend on premium while lower-income trade down. Pet food company share prices underperformed S&P 500 in 2025.", soWhat: "If dog ownership peaks and declines structurally, does the entire industry need to shift from volume growth to lifetime value per pet?", cluster: "Market Structure" },
  { id: "S-018", title: "Veterinary Care Costs Up 60% in Past Decade, Average Dog Insurance $62.44/month", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "AAHA / Forbes Advisor", summary: "Vet bill costs have increased over 60% in the past decade. Average monthly dog insurance premium is $62.44, cats $32.21. Cost of vet care is the #1 reason owners hesitate to add another pet (36%).", soWhat: "Rising vet costs are the #1 barrier to both pet acquisition and adequate healthcare. Does this create the insurance tipping point?", cluster: "The Insurance Gap" },
  { id: "S-019", title: "Precision-Fermented Pet Protein Market: 5.8% CAGR Through 2034", category: "Ec", geo: "Global", surprise: 1, confidence: "Verified", type: "Positive", source: "InsightAce Analytic", summary: "Global precision-fermented and cultivated pet protein market projected at 5.8% CAGR through 2034. Key players: Bond Pet Foods, Calysta, Marsapet, EVERY Company. North America leads.", soWhat: "Steady but not explosive growth suggests fermented protein is an ingredient play, not a category disruption — yet.", cluster: "Protein Without Animals" },
  { id: "S-020", title: "Veterinary Telemedicine Market: $146M in 2025, Projected $747M by 2035 (18.8% CAGR)", category: "Ec", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "Market Minds Advisory", summary: "Vet telemedicine market projected to grow 5x in a decade. North America holds 40.2% share. AI-driven diagnostics, IoT wearables, and real-time monitoring are key growth enablers.", soWhat: "Does telehealth solve the access problem or just add a digital layer before the same in-person visit?", cluster: "The Veterinary Desert" },
  { id: "S-021", title: "Gen Z Drives 43.5% YoY Surge in Pet Ownership; 70% Own Multiple Pets", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "APPA 2025 State of the Industry", summary: "18.8M Gen Z households now own pets (up 43.5% from 2023). 70% of Gen Z pet owners have 2+ animals. Gen Z men driving growth: 58% of Gen Z dog owners are male, up 15% YoY. Millennials + Gen Z = 57% of all pet owners.", soWhat: "Gen Z treats pets as identity extensions and family members. Does this generation's values (sustainability, transparency, digital-first) reshape what brands need to be?", cluster: "Generational Shift" },
  { id: "S-022", title: "94M US Households Now Own Pets (71% of All Households)", category: "S", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "APPA 2025", summary: "US pet ownership reached 94M households, up from 82M in 2023. 51% of households own dogs (68M dogs), 37% own cats (49M cats). Pet ownership at historic highs despite economic pressure.", soWhat: "At 71% household penetration, growth must come from spending per pet and lifetime value, not new pet acquisition.", cluster: "Market Structure" },
  { id: "S-023", title: "South Korea: 'Petfam' Culture Transforms Urban Infrastructure; Companion Animal Industry Act Proposed", category: "S", geo: "South Korea", surprise: 3, confidence: "Verified", type: "Positive", source: "Korea Herald / National Assembly", summary: "15M+ Korean pet owners. 'Petfam' (pet+family) is mainstream social identity. In May 2025, Korea's National Assembly proposed the first Companion Animal Industry Promotion Act. Pet job postings up 21% vs 2021. Cities competing for 'Pet-Friendly Tourism City' designation.", soWhat: "South Korea is 3-5 years ahead in pet-as-lifestyle-identity. What's happening there now arrives in the US by 2028-2030.", cluster: "The Multispecies City" },
  { id: "S-024", title: "Korean Malls Redesign Spaces for Pet Shoppers: Stroller Rentals, Pet Parks, Pet Dining", category: "S", geo: "South Korea", surprise: 3, confidence: "Verified", type: "Positive", source: "Korea Times", summary: "Starfield malls offer pet stroller rentals, outdoor pet parks with grass and paw-washing stations, pet-friendly elevators. Lotte Department Store relaxed pet stroller cover rules. Emart sold 120+ types of pet hanbok (traditional clothing). Dog-safe 'tteokguk' and 'chewy cookies' launched.", soWhat: "When retail infrastructure redesigns around pets, it signals a permanent cultural shift — not a trend. This is multispecies urbanism in commercial form.", cluster: "The Multispecies City" },
  { id: "S-025", title: "Japan: 22M Dogs and Cats Outnumber Children Under 15 by 30%", category: "S", geo: "Japan", surprise: 2, confidence: "Verified", type: "Positive", source: "Japan Pet Food Association / PetfoodIndustry", summary: "Japan has 22 million companion dogs and cats, exceeding children under 15 by roughly 30%. Pet industry worth ¥1.9 trillion ($11.6B), up 21% from 2019. Single-person households (38.1% of all homes) drive highest per-pet spending.", soWhat: "Japan is the laboratory for what happens when a society's pet population exceeds its child population. The senior pet care economy that emerges there will arrive globally.", cluster: "The Longevity Dividend" },
  { id: "S-026", title: "Japan: Senior Pet Care Products Booming — Carts, Slings, Diapers, Cat Kidney Research", category: "S", geo: "Japan", surprise: 3, confidence: "Verified", type: "Positive", source: "PetfoodIndustry / Monocle / Interpets 2025", summary: "Japanese companies developing elderly pet products: mobility carts, slings, diapers, mattresses with handles. Jikei University researchers growing cat kidneys in pig embryos to address feline CKD (30% cause of death in elderly cats). Interpets 2025 trade show: 980 exhibitors, 78,000 visitors.", soWhat: "Japan's silver pet economy is a preview of global demand. If cats live to 20+, the nutrition, care, and end-of-life markets multiply.", cluster: "The Longevity Dividend" },
  { id: "S-027", title: "Baby Boomers More Likely Than Gen Z to Want Pets 'As Long As Possible'", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Packaged Facts / PetfoodIndustry", summary: "Higher percentages of Boomers and Gen X indicate wanting pets as long as possible vs. Millennials and Gen Z. The human-animal bond deepens as pets age. Senior pet owners represent high lifetime value but are underserved by marketing.", soWhat: "Is the industry too focused on Gen Z acquisition and missing the Boomer retention opportunity?", cluster: "Generational Shift" },
  { id: "S-028", title: "30% of Gen Z Pet Owners Want Retailers to Welcome Pets In-Store", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Numerator Visions 2025", summary: "Gen Z twice as likely to want in-store pet pharmacies. Want cross-species selection (birds, reptiles). Pet-friendly retail is a baseline expectation, not a perk.", soWhat: "Retail spaces that exclude pets will lose Gen Z traffic. This is the consumer-side pressure that drives multispecies design.", cluster: "The Multispecies City" },
  { id: "S-029", title: "Precision Fermentation: Drastically Lower Land, Water, and Carbon vs. Traditional Protein", category: "En", geo: "Global", surprise: 1, confidence: "Verified", type: "Positive", source: "ScienceDirect / Nielsen et al. 2024", summary: "Precision fermentation offers production with significantly smaller environmental footprint than livestock: reduced deforestation, water use, and carbon emissions. Carried out in controlled tanks rather than on agricultural land.", soWhat: "If sustainability becomes a purchase driver in pet food (as it has in human food), fermented protein is the obvious pivot.", cluster: "Protein Without Animals" },
  { id: "S-030", title: "Cold Storage and Transport for Premium/Raw Pet Food Increasing Industry Carbon Footprint", category: "En", geo: "US", surprise: 2, confidence: "Probable", type: "Negative", source: "PetfoodIndustry", summary: "Investments in cold storage, refrigerated transport, and retail freezer space for premium/raw/fresh pet food are increasing the pet food industry's energy use and carbon footprint even as sustainability claims grow.", soWhat: "Is the premium pet food trend on a collision course with climate commitments? Does fermented protein resolve this tension?", cluster: "Protein Without Animals" },
  { id: "S-031", title: "USDA Designates Record 243 Veterinary Shortage Areas Across 46 States", category: "P", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "USDA / NIFA / AVMA", summary: "Record 243 veterinary shortage areas designated, primarily rural and livestock-producing regions. Only 3.4% of clinical vets work in food animal practice. USDA launched Rural Veterinary Action Plan.", soWhat: "Rural vet deserts are worsening despite new vet school openings. Does this create structural opportunity for Mars's mobile/telehealth model?", cluster: "The Veterinary Desert" },
  { id: "S-032", title: "AVMA Disputes Shortage Narrative: 20% More Companion Animal Vets by 2030", category: "P", geo: "US", surprise: 2, confidence: "Verified", type: "Counter-Signal", source: "AVMA", summary: "AVMA data projects 20%+ growth in companion animal practitioners (80K to 98K+) by 2030, citing new vet schools and expanded class sizes. Argues the 'shortage' is more about retention, distribution, and rural access than absolute numbers.", soWhat: "The vet shortage may be a distribution and burnout problem, not a numbers problem. Does this change the telehealth thesis?", cluster: "The Veterinary Desert" },
  { id: "S-033", title: "10 New US Veterinary Schools in Various Stages of Development", category: "P", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "AVMA", summary: "Three new vet schools graduated first classes in 2023-2025. Ten more in development stages. Combined with existing programme expansions, this represents unprecedented supply-side increase.", soWhat: "If vet supply catches up by 2030-2035, the 'veterinary desert' scenario weakens. But distribution and burnout problems persist.", cluster: "The Veterinary Desert" },
  { id: "S-034", title: "FDA Regulatory Pathway Established for Precision-Fermented Pet Ingredients (GRAS)", category: "P", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "FDA / NAPHIA / InsightAce", summary: "Multiple precision-fermented ingredients have received FDA 'No Questions' GRAS letters. EU (FSANZ) accepted first application for precision-fermented milk protein. FAO concluded no fundamentally new food safety hazards.", soWhat: "Regulatory green light for fermented pet ingredients removes the biggest barrier to scale. First movers with supply agreements win.", cluster: "Protein Without Animals" },
  { id: "S-035", title: "GDPR Enforcement Intensifies: €6.7B in Fines Since 2018, 2025 a Record Year", category: "P", geo: "EU", surprise: 1, confidence: "Verified", type: "Positive", source: "IAPP / CookieScript", summary: "2,679 GDPR fines totalling €6.7B since May 2018. 2025 set records. TikTok fined €530M. Biometric data classified as 'special category' requiring highest protection. Peru and Chile now legally define neurodata as sensitive.", soWhat: "As data regulation tightens globally, Mars's integrated pet health data (genetics + diagnostics + clinical) becomes both its greatest asset and greatest liability.", cluster: "Pet Data Governance" },
  { id: "S-036", title: "EU AI Act Fully Applicable August 2026: Risk-Based Obligations for High-Impact Systems", category: "P", geo: "EU", surprise: 2, confidence: "Verified", type: "Positive", source: "EU Commission / SecurePrivacy", summary: "EU AI Act classifies AI systems by risk level. High-risk systems (including biometric recognition) face strict compliance. Real-time biometric ID systems face heightened scrutiny. 68% of privacy professionals now handle AI governance.", soWhat: "If Mars's AI diagnostic tools (RenalTech, etc.) are classified as high-risk, compliance costs could be significant — but also a moat against smaller competitors.", cluster: "Pet Data Governance" },
  { id: "S-037", title: "US Vet Technician Shortage: 14,300 Annual Openings, Only 7,500 Graduates", category: "P", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "BLS / Virginia Tech", summary: "Bureau of Labor Statistics reports 14,300 annual vet tech openings against only 7,500 graduates sitting the licensing exam. Virginia has fewer LVTs than DVMs. Vet tech shortage may be more acute than vet shortage.", soWhat: "The tech shortage is the hidden crisis. AI and automation tools that augment vet techs may be more impactful than those replacing vets.", cluster: "The Veterinary Desert" },
  { id: "S-038", title: "South Korea: Six Cities Now Designated 'Pet-Friendly Tourism Cities' with Government Funding", category: "S", geo: "South Korea", surprise: 2, confidence: "Verified", type: "Positive", source: "Korea Ministry of Culture / Korea.net", summary: "Six Korean cities designated pet-friendly tourism cities receiving ₩250M/year in public funds for pet infrastructure: lodging, dining, transit improvements. Includes pet yoga, pet Hanok visits, dog marathon events.", soWhat: "Government-funded pet infrastructure is unprecedented. When states invest in pet-friendly cities, it becomes permanent urban planning.", cluster: "The Multispecies City" },
  { id: "S-039", title: "South Korea: All Local Governments Subsidise Pet Insurance for Adopted Animals", category: "P", geo: "South Korea", surprise: 3, confidence: "Verified", type: "Positive", source: "Korea.net / Gwangju", summary: "All Korean local governments now subsidise pet insurance for adopted animals. Gwangju covers up to 60% of vet fees (₩10M annual limit) for residents who adopt and register abandoned animals.", soWhat: "Government-subsidised pet insurance = lead market signal. Could US municipal or employer-based pet insurance follow?", cluster: "The Insurance Gap" },
  { id: "S-040", title: "Japan: Pet Market ¥1.9 Trillion, Senior-Specific Nutrition Fastest Growing Category", category: "Ec", geo: "Japan", surprise: 2, confidence: "Verified", type: "Positive", source: "Monocle / Japan Pet Food Association", summary: "Japan's pet product market estimated at ¥1.9T ($11.6B). Mars Japan and Unicharm leading 'senior-specific' formulas. Specialist veterinary nutrition growing at 4.5% CAGR. Average monthly dog food spending: ¥5,257.", soWhat: "Japan proves the longevity nutrition thesis: as pets live longer, senior-specific nutrition becomes a major profit pool.", cluster: "The Longevity Dividend" },
  { id: "S-041", title: "Japan: Researchers Growing Cat Kidneys in Pig Embryos for Transplant", category: "T", geo: "Japan", surprise: 3, confidence: "Probable", type: "Positive", source: "Jikei University / PetfoodIndustry", summary: "Jikei University researchers successfully cultivated tiny cat kidneys in pig embryos using feline stem cells. Aim to offer transplant procedure within two years at ~¥50,000 ($620). CKD causes ~30% of elderly cat deaths.", soWhat: "Xenotransplantation for pets — if it works, it redefines end-of-life care economics entirely.", cluster: "The Longevity Dividend" },
  { id: "S-042", title: "ABSENCE: No Breed-Specific Nutrition at Mass Retail Despite Genetic Data Availability", category: "T", geo: "US", surprise: 2, confidence: "Probable", type: "Absence", source: "Primary observation", summary: "Despite millions of pets genotyped (Wisdom Panel 4M+, Embark 3M+), no mass-market pet food brand offers genotype-matched nutrition at retail. Royal Canin offers breed-specific in vet channel only.", soWhat: "The data exists. The science exists. The channel doesn't. Is this Mars's biggest retail innovation opportunity?", cluster: "The Genomic Table" },
  { id: "S-043", title: "ABSENCE: No Integrated Pet Health Insurance + Genomic Testing Bundle in US", category: "Ec", geo: "US", surprise: 3, confidence: "Probable", type: "Absence", source: "Primary observation", summary: "Despite infrastructure existing (Wisdom Panel for genetics, Banfield for clinical, multiple insurers), no one has bundled pet health insurance with genomic testing to create risk-adjusted premiums. Human health insurance is moving this direction.", soWhat: "Mars owns both the genetic data (Wisdom Panel) and the clinical network (Banfield). Why hasn't it built the insurance product?", cluster: "The Insurance Gap" },
  { id: "S-044", title: "ABSENCE: Veterinary Telehealth Adoption Actually Declined from 38% to 29% (2023-2024)", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Absence", source: "Veterinary surveys / Accio", summary: "Despite growth predictions, telehealth use among small animal practices actually declined from 38% in 2023 to 29.2% in 2024. Online appointment scheduling increased, but live telehealth consultation decreased.", soWhat: "Why is vet telehealth declining when human telehealth boomed? Is the VCPR requirement the blocker, or is there a deeper trust issue?", cluster: "The Veterinary Desert" },
  { id: "S-045", title: "ABSENCE: No Major Pet Food Brand Has Launched a Microbiome-Adaptive Subscription", category: "T", geo: "US", surprise: 3, confidence: "Probable", type: "Absence", source: "Primary observation", summary: "Multiple startups offer pet microbiome testing and separate nutrition recommendations, but no major brand has closed the loop: test → formulate → deliver → retest → reformulate as a subscription service.", soWhat: "The test-to-food feedback loop is the ultimate personalisation play. First mover locks in customers with data moats.", cluster: "The Genomic Table" },
  { id: "S-046", title: "ABSENCE: Pet Wearable Data Not Yet Integrated with Insurance Pricing", category: "T", geo: "US/Global", surprise: 2, confidence: "Probable", type: "Absence", source: "Primary observation", summary: "Smart collars (PetPace, Fi, Whistle) generate clinical-grade health data. Human wearables (Apple Watch, Fitbit) are increasingly linked to health insurance discounts. No pet insurer has made this connection yet.", soWhat: "The pet equivalent of 'walk 10,000 steps for lower premiums' is technically possible today. Why hasn't anyone built it?", cluster: "The Insurance Gap" },
  { id: "S-047", title: "Mars Petcare Data Analytics Team: 24+ Researchers Building AI Tools Across Banfield/BluePearl", category: "T", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "AVMA / Cornell SAVY / Geert De Meyer keynote", summary: "Mars Petcare's data analytics team (24+ researchers led by Geert De Meyer) has built AI tools deployed across Banfield and BluePearl hospitals, including RenalTech for CKD prediction. Dataset: hundreds of thousands of pet medical records.", soWhat: "Mars has arguably the largest proprietary pet health dataset in the world. The strategic question is whether this data is being exploited aggressively enough.", cluster: "The Genomic Table" },
  { id: "S-048", title: "500+ US Counties Lack Sufficient Veterinary Services", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Negative", source: "PetDesk / USDA", summary: "Over 500 US counties lack sufficient veterinary services. Top demand states: Colorado, Michigan, West Virginia, North Carolina, Arizona. Rural communities cannot support private practices economically.", soWhat: "500+ counties with no adequate vet care = a healthcare desert that maps onto Mars's mobile/telehealth thesis perfectly.", cluster: "The Veterinary Desert" },
  { id: "S-049", title: "Average Lifetime Cost of Dog Ownership: $34,550 Over 10-15 Years", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "PetDesk / AVMA", summary: "Average lifetime dog ownership cost: $34,550. Average annual surgical vet visits: $472. Routine vet: $250. Food: $354. Most owners underestimate total costs. Dog annual costs range $1,390-$5,292 depending on breed.", soWhat: "At $34K lifetime cost per dog, even modest improvements in health (reducing one emergency vet visit) represent meaningful consumer value.", cluster: "Market Structure" },
  { id: "S-050", title: "Occupational Burnout Rate Among Veterinarians: Up to 50%", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Negative", source: "PetDesk / BLS", summary: "Up to 50% burnout rate among US veterinarians. Younger vets (Millennials, Gen Z) prioritise work-life balance. 80% of vet students are female. Vet school debt averaging ~$190K. These structural factors constrain workforce growth.", soWhat: "Burnout may be the real vet shortage — not headcount. AI tools that reduce administrative burden (SOAP notes, record management) directly address this.", cluster: "The Veterinary Desert" },
  { id: "S-051", title: "Precision Fermentation Cost Still 10x Traditional Protein in 2025 (€20-130/kg vs €2-13/kg)", category: "Ec", geo: "Global", surprise: 2, confidence: "Verified", type: "Counter-Signal", source: "Food Unfolded / EU Data", summary: "In 2025, producing 1kg of novel protein via precision fermentation costs 10x more than traditional protein (€20-130 vs €2-13). Prices dropping with investment but commercial viability still limited to premium segments.", soWhat: "Cost parity is still years away for pure protein replacement. The bridge strategy is blended formulations (partial fermented protein in conventional food).", cluster: "Protein Without Animals" },
  { id: "S-052", title: "Social Media Drives Pet Adoption: One Viral TikTok = 150+ Applications for Single Cat", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Cascadia Capital 2025/2026", summary: "86% of shelters report increased awareness from social media. A single viral TikTok generated 150+ adoption applications for one cat. Social media accelerating adoption cycles and changing engagement models, especially for Gen Z.", soWhat: "Social media as adoption engine changes who owns pets, how they discover brands, and what 'community' means for pet owners.", cluster: "Generational Shift" },
  { id: "S-053", title: "Cornell Hosts First Symposium on AI in Veterinary Medicine (SAVY)", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Cornell / AVMA", summary: "Cornell hosted the inaugural Symposium on Artificial Intelligence in Veterinary Medicine (SAVY). Projects presented: lameness detection in sheep, Lyme disease forecasting, canine heart disease staging, and AI for SOAP notes.", soWhat: "An academic symposium dedicated solely to vet AI signals the field is formalising. Standards and best practices will follow within 2-3 years.", cluster: "The Veterinary Desert" },
  { id: "S-054", title: "Korea's 'Petconomy': Pet Industry Job Postings Up 21% Since 2021", category: "Ec", geo: "South Korea", surprise: 2, confidence: "Verified", type: "Positive", source: "Sungkyun Times / Job Korea", summary: "Korean pet industry job postings rose 21% from 2021-2025 on Job Korea. Dog kindergartens and pet e-commerce are fastest-growing categories. Government categorised pet industry into 4 sectors: food, healthcare, technology, services.", soWhat: "Korea is building an entire economic sector around pets. Government industrial strategy for pet care = unprecedented signal.", cluster: "The Multispecies City" },
  { id: "S-055", title: "Japan: Interpets 2025 — 980 Exhibitors, 236 from Overseas, Dog Fashion Competitions", category: "S", geo: "Japan", surprise: 1, confidence: "Verified", type: "Positive", source: "Monocle", summary: "Interpets Asia Pacific 2025 in Tokyo: 980 exhibitors (236 overseas), 78,000 visitors. Products shown: climate-sensitive dog jackets, crinoline pet dresses (¥50,000), gold pet necklaces from nose prints, designer dog shoes from China.", soWhat: "Interpets scale shows Japan as the global luxury pet market. Premiumisation there previews what Western markets look like at maturity.", cluster: "The Longevity Dividend" },
  { id: "S-056", title: "UK: Meatly Launches World's First Lab-Grown Meat Pet Treats at Pets at Home", category: "T", geo: "UK", surprise: 3, confidence: "Verified", type: "Positive", source: "InsightAce Analytic / Meatly", summary: "Meatly launched 'Chick Bites' — cultivated meat pet treats — in partnership with THE PACK, available at Pets at Home in London. Limited edition but signals UK retail willingness to stock lab-grown pet food.", soWhat: "UK retail acceptance of lab-grown pet food is a critical demand-side signal. If consumers accept it for pets first, human food follows.", cluster: "Protein Without Animals" },
  { id: "S-057", title: "85% of Employees Want Pet Benefits in Voluntary Benefits Package", category: "Ec", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Pet Benefit Solutions 2025 Survey", summary: "85% of surveyed employees expressed interest in pet-related benefits as part of voluntary benefits packages. 40% feel overwhelmed by vet care costs. Employer-based pet insurance emerging as recruitment/retention tool.", soWhat: "Employer-based distribution could be the unlock for US pet insurance penetration — bypassing the direct-to-consumer acquisition problem.", cluster: "The Insurance Gap" },
  { id: "S-058", title: "Precision Fermentation Peak Reached? Analyst Suggests 2026 Decline Possible", category: "T", geo: "Global", surprise: 2, confidence: "Probable", type: "Counter-Signal", source: "FoodNavigator / Buitelaar", summary: "Food tech analyst suggests precision fermentation may have reached peak of hype cycle. Predicts possible decline in 2026. Notes pet food and cosmetics as where fermentation's future may lie, since 'they are not visible to consumers'.", soWhat: "If precision fermentation's future is in pet food (where ingredient origin is less scrutinised), Mars should be positioning now while attention is elsewhere.", cluster: "Protein Without Animals" },
  { id: "S-059", title: "US Number of Insured Pets More Than Doubled Since 2020 (3.1M → 6.4M)", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "NAPHIA 2025", summary: "Total insured pets in US doubled from 3.1M (2020) to 6.4M (2024). Growth rate slowing (28% in 2020-21, now 12.7%). Over 1/3 of insured pets in California (18.3%), NY (7.2%), FL (6.3%), TX (5.5%).", soWhat: "Insurance growth is real but geographically concentrated in affluent coastal markets. Rural and middle-income = untapped.", cluster: "The Insurance Gap" },
  { id: "S-060", title: "Average Dog Lifespan in Japan Now Among Highest Globally Due to Premium Care", category: "S", geo: "Japan", surprise: 2, confidence: "Probable", type: "Positive", source: "Japan Pet Food Assoc / Grand View", summary: "Japanese pet lifespans extending due to premium indoor care, advanced nutrition, and accessible veterinary infrastructure. Senior-specific products (softer textures, joint support, kidney management) now fastest-growing category.", soWhat: "Longer pet lifespans = more years of food, care, and products purchased. The longevity dividend is real and measurable.", cluster: "The Longevity Dividend" },
  { id: "S-061", title: "Biome9 Acquired by Pooch & Mutt: UK's First Dog Gut Health Startup Goes Corporate", category: "T", geo: "UK", surprise: 2, confidence: "Verified", type: "Positive", source: "Sifted", summary: "UK startup Biome9 (first UK dog gut health testing kit) acquired by pet food company Pooch & Mutt. Previously raised £1M+ from Pets at Home CEO and Warburtons chairman. Aims to expand microbiome analysis worldwide.", soWhat: "Microbiome startups being acquired by pet food companies signals the test-to-food pipeline is being built. Mars should be watching these acquisitions closely.", cluster: "The Genomic Table" },
  { id: "S-062", title: "GLP-1 Weight Loss Drugs Reshaping Human Food Industry — Pet Implications Emerging", category: "T", geo: "US", surprise: 2, confidence: "Probable", type: "Positive", source: "FoodNavigator", summary: "GLP-1 drugs (Ozempic, etc.) are reshaping human food industry with 'accompaniment' products. Pet obesity rates mirror human trends. No GLP-1 equivalent for pets yet, but pet weight management is growing category.", soWhat: "If GLP-1 drugs come to pets (or analogs), the entire weight management nutrition category restructures overnight.", cluster: "The Longevity Dividend" },
  { id: "S-063", title: "Treat Therapeutics: Singapore Startup Using Pets as Decentralised Clinical Trial Platform", category: "T", geo: "Singapore", surprise: 3, confidence: "Verified", type: "Positive", source: "Sifted", summary: "Treat Therapeutics runs decentralised clinical trials for pet therapeutics via at-home stool kits + custom probiotics. Uses pets as health models for human disease. 'Dogs and cats are incredible models for human health.'", soWhat: "Pets as clinical trial subjects for human medicine creates a One Health data loop. Mars's vet network could be the largest trial platform in the world.", cluster: "The Genomic Table" },
  { id: "S-064", title: "Korea: Gimpo Becomes First City to Create Dedicated 'Pet Culture Team' in Municipal Government", category: "P", geo: "South Korea", surprise: 3, confidence: "Verified", type: "Positive", source: "Korea.net", summary: "Gimpo created a dedicated Pet Culture Team within its municipal government's Family Culture Division — first local government in Korea to do so. Signals pets moving from 'animal control' to 'culture and family' in government structure.", soWhat: "When government restructures to put pets in 'family culture' not 'animal control', the regulatory framework permanently shifts.", cluster: "The Multispecies City" },
  { id: "S-065", title: "Seoul Expands Vet Fee Support for Disadvantaged Pet Owners (₩400,000 per household)", category: "P", geo: "South Korea", surprise: 2, confidence: "Verified", type: "Positive", source: "Korea.net / Seoul Metropolitan Government", summary: "Seoul expanded vet fee subsidies for disadvantaged households (basic welfare, lowest income, single parents): up to ₩400,000 for check-ups, vaccination, neutering. Participating vet clinics grew from 92 to 114.", soWhat: "Government-subsidised vet care for low-income pet owners = equity signal. Does this model travel to the US via municipal programmes?", cluster: "The Veterinary Desert" },
  { id: "S-066", title: "Korean Air Operates Year-Round Pet Membership Programme for Air Travel", category: "S", geo: "South Korea", surprise: 2, confidence: "Verified", type: "Positive", source: "Sungkyun Times", summary: "Korean Air runs a pet membership programme allowing annual fee-based year-round pet travel with designated pet-friendly seating. Part of broader Korean airline/transport pet accommodation trend.", soWhat: "When airlines create annual subscription products for pet travel, pets are permanent infrastructure users — not exceptions.", cluster: "The Multispecies City" },
  { id: "S-067", title: "EU Proposed 'Biotech Act' to Streamline Approval of Precision-Fermented Foods", category: "P", geo: "EU", surprise: 2, confidence: "Verified", type: "Positive", source: "Food Unfolded / EU Commission", summary: "EU proposed a 'Biotech Act' aimed at boosting biotechnology, simplifying regulations, and attracting investment. If adopted in 2026, could make it much easier to gain approval for precision-fermented foods in Europe.", soWhat: "EU regulatory acceleration for biotech foods would open the world's second-largest pet food market to fermented ingredients.", cluster: "Protein Without Animals" },
  { id: "S-068", title: "FAO Concludes: Precision Fermentation Introduces No Fundamentally New Food Safety Hazards", category: "P", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "FAO / PPTI", summary: "UN Food and Agriculture Organization published two reports concluding precision fermentation introduces no new food safety hazards and can be regulated using existing tools. Major regulatory signal for global adoption.", soWhat: "FAO endorsement removes the 'novel risk' narrative. Fermented ingredients can now be positioned as 'scientifically validated' rather than 'experimental'.", cluster: "Protein Without Animals" },
  { id: "S-069", title: "Florida: Fastest-Growing US State for Pet Insurance (GWP +$100M in 2 Years)", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "NAPHIA / Grand View Research", summary: "Florida recorded the fastest pet insurance growth: +$100M in GWP and +100,000 insured pets in just 2 years. After CA, NY, FL, TX = top 4 states (combined 37% of all insured pets).", soWhat: "Geographic concentration of pet insurance suggests it's still an affluent-urban phenomenon. Rural/suburban penetration barely started.", cluster: "The Insurance Gap" },
  { id: "S-070", title: "Veterinary AI: PicoxIA, Radimal, DecisionIQ — Specialist Diagnostic Tools Multiplying", category: "T", geo: "US/EU", surprise: 2, confidence: "Verified", type: "Positive", source: "Full Slice / dvm360", summary: "Specialist AI diagnostic tools proliferating: PicoxIA (X-ray analysis), Radimal (instant radiology reports, 30+ conditions), DecisionIQ (machine learning patient data interpretation), CoVet (automated SOAP records). ~24 companies now in market.", soWhat: "The vet AI market is fragmenting into specialists. Does Mars build or buy? Its proprietary data is the differentiator.", cluster: "The Veterinary Desert" },
  { id: "S-071", title: "ABSENCE: No Major Pet Food Brand Offers Carbon-Neutral or Net-Zero Product Line", category: "En", geo: "Global", surprise: 2, confidence: "Probable", type: "Absence", source: "Primary observation", summary: "Despite sustainability claims across the pet food industry, no major brand has launched a verified carbon-neutral or net-zero pet food line. Human food brands (Oatly, Beyond Meat) have made such claims. Pet food lags.", soWhat: "First pet food brand to credibly claim net-zero has a significant Gen Z/Millennial positioning advantage.", cluster: "Protein Without Animals" },
  { id: "S-072", title: "ABSENCE: No Integration Between Pet Genetic Testing and Municipal Pet Registration Systems", category: "P", geo: "Global", surprise: 2, confidence: "Probable", type: "Absence", source: "Primary observation", summary: "Cities require pet registration. Companies offer genetic testing. These systems don't talk to each other. A genetically-identified, municipally-registered pet creates a permanent digital identity — useful for insurance, lost pet recovery, breed-specific legislation.", soWhat: "The pet digital identity layer is missing. Mars (via Wisdom Panel) is uniquely positioned to build it.", cluster: "Pet Data Governance" },
  { id: "S-073", title: "Okava MEOW-1: First GLP-1 Weight Loss Clinical Trial in Cats", category: "T", geo: "US", surprise: 3, confidence: "Verified", type: "Positive", source: "Okava Pharmaceuticals / FDA-CVM", summary: "Okava launched MEOW-1, the first GLP-1 weight-loss clinical trial in cats, testing OKV-119 (a 6-month subcutaneous implant) in 50+ cats. FDA INAD application filed. Targets 60% of US cats classified as overweight. Estimated $100/month if approved. FDA approval targeted 2027-2028.", soWhat: "GLP-1 for pets is no longer hypothetical — it's in clinical trials. If approved, the entire weight management nutrition category restructures. Mars's therapeutic nutrition lines face direct pharmaceutical competition.", cluster: "The Pharma Crossover" },
  { id: "S-074", title: "Akston GLP-1 Weekly Injection Trial for Cats at Cornell University", category: "T", geo: "US", surprise: 3, confidence: "Verified", type: "Positive", source: "Akston Biosciences / Cornell", summary: "Akston launched a clinical study at Cornell testing a once-weekly GLP-1 injection for cats. Enrolling 70+ cats (expandable to 140). Dog GLP-1 programme ~6 months behind. Vertically integrated GMP manufacturing.", soWhat: "Two companies racing to bring GLP-1 to pets simultaneously. The first FDA-approved vet GLP-1 could arrive before 2030. This is a $100B+ human drug class entering veterinary medicine.", cluster: "The Pharma Crossover" },
  { id: "S-075", title: "Loyal LOY-002: Dog Longevity Drug Passes 2 of 3 FDA Milestones, 1,300-Dog STAY Trial", category: "T", geo: "US", surprise: 3, confidence: "Verified", type: "Positive", source: "Loyal / FDA-CVM / BusinessWire", summary: "Loyal's LOY-002 (daily pill for senior dog lifespan extension) has FDA acceptance for both efficacy (RXE) and safety (TAS) — 2 of 3 milestones for conditional approval. STAY study: 1,300 dogs across 70 clinics — largest vet trial in history. $150M+ raised.", soWhat: "The first FDA-approved longevity drug for any species is likely to be a dog drug. This creates an entirely new pharmaceutical category. Mars has no pharma capability — does it need one?", cluster: "The Longevity Dividend" },
  { id: "S-076", title: "Loyal LOY-001: FDA-Supported Longevity Drug for Large/Giant Breed Dogs", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Loyal / FDA-CVM", summary: "Loyal's LOY-001 (vet-administered injection every 3-6 months) targets large/giant breed dogs. FDA accepted Reasonable Expectation of Effectiveness. Addresses inverse relationship between dog size and lifespan. Market availability expected 2026.", soWhat: "Large breeds live nearly half as long as small breeds. A drug that closes this gap changes lifetime value calculations for an entire segment. Pricing: 'double digits per month' — accessible, not luxury.", cluster: "The Longevity Dividend" },
  { id: "S-077", title: "GLP-1 Drugs: $100B+ Human Market Creating 'Accompaniment' Food Category", category: "Ec", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "Multiple / Novo Nordisk / Eli Lilly", summary: "GLP-1 drugs (semaglutide, tirzepatide) are a $100B+ projected market reshaping human food. 'Accompaniment foods' emerging as new category. Generic liraglutide already available (Teva, June 2024). Prices expected to fall significantly.", soWhat: "As GLP-1 prices fall and generics arrive, the veterinary market becomes economically viable. Pet obesity (60% cats, 59% dogs) is the exact problem these drugs solve. Mars's nutrition business faces disruption from pharma.", cluster: "The Pharma Crossover" },
  { id: "S-078", title: "Human Precision Nutrition Goes Mainstream: Zoe (1M+ Users), CGM Adoption", category: "T", geo: "US/UK", surprise: 2, confidence: "Verified", type: "Positive", source: "Multiple, 2024-2026", summary: "Zoe (1M+ users) and DayTwo offer personalised nutrition based on microbiome and blood glucose data. Continuous glucose monitors adopted by non-diabetics. The test-personalise-track loop humans are adopting is the same architecture Mars could build for pets.", soWhat: "Human precision nutrition proves the consumer model: test, personalise, subscribe, retest. The absence of this loop in pet food is a missed opportunity that human health is proving viable.", cluster: "The Genomic Table" },
  { id: "S-079", title: "One Health Adopted in IUCN Programme 2026-2029 as Core Global Transformation", category: "P", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "IUCN / WHO / FAO / WOAH", summary: "One Health — integrated human-animal-environmental health — adopted as one of eight global transformations in IUCN Programme 2026-2029. WHO/FAO/WOAH Joint Plan of Action 2022-2026. WMA and WVA signed One Health MOU (July 2025).", soWhat: "One Health gives Mars a policy framework to position companion animal health as a public health issue, not just a consumer market. Aligns pet data, nutrition, and clinical care with institutional legitimacy.", cluster: "One Health Convergence" },
  { id: "S-080", title: "WMA and WVA Formalise One Health MOU: Human and Veterinary Medicine Converge", category: "P", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "WMA / WVA", summary: "World Medical Association and World Veterinary Association formalised a Memorandum of Understanding on One Health at the WVA General Assembly in Washington DC, July 2025. Institutional convergence between human and animal medicine at the highest professional level.", soWhat: "When the two peak global medical professional bodies formally align, it creates regulatory and research pathways that didn't exist before. Mars's vet network sits at this intersection.", cluster: "One Health Convergence" },
  { id: "S-081", title: "Pets as Clinical Trial Platforms: Dogs Model Human Aging, Cancer, Diabetes", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Dog Aging Project / Loyal / Treat Therapeutics", summary: "Dogs increasingly used as translational models for human disease. Dog Aging Project generates human-applicable data. Loyal's trials produce longevity data relevant to human medicine. Treat Therapeutics uses pets as decentralised clinical trial platforms.", soWhat: "If companion animals become a recognised clinical trial platform, Mars's 1,600+ hospitals become the world's largest distributed trial network. This is a One Health value proposition.", cluster: "One Health Convergence" },
  { id: "S-082", title: "Insect-Based Pet Food Market: $1.6B in 2025, Projected $4.2B by 2035 (10% CAGR)", category: "Ec", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "Future Market Insights / Multiple", summary: "Insect-based pet food market valued at $1.6B in 2025, projected to reach $4.2B by 2035 at 10% CAGR. Black soldier fly larvae, mealworms, and crickets lead. Dog segment dominates, cat segment fastest growing.", soWhat: "Insect protein is scaling faster than precision fermentation for pet food — and at a lower price point. This is the alternative protein path Mars may be underweighting.", cluster: "Protein Without Animals" },
  { id: "S-083", title: "Protix Palatability Test: 94% of Dogs Accept Insect Protein as Sole Source", category: "T", geo: "EU", surprise: 2, confidence: "Verified", type: "Positive", source: "Protix, May 2023", summary: "Protix palatability trial showed 94% of dogs and 81% of cats consumed insect-based food as their sole animal protein source. Protix operates at 10,000+ tonnes annual capacity. Partnered with Hendrix for commercial production.", soWhat: "The palatability barrier — the biggest assumed obstacle to insect protein — appears solved. 94% acceptance is higher than many novel conventional proteins.", cluster: "Protein Without Animals" },
  { id: "S-084", title: "Nestlé Purina Launches 30% Insect Protein Pet Food Line", category: "T", geo: "EU", surprise: 2, confidence: "Verified", type: "Positive", source: "Nestlé Purina", summary: "Nestlé Purina launched a pet food line featuring 30% insect protein (black soldier fly larvae) combined with plant protein from fava beans and millet. Major incumbent commercialising insect protein at scale.", soWhat: "If Nestlé Purina — Mars's primary competitor — is already at 30% insect protein, Mars risks being a fast follower rather than a leader in the alternative protein transition.", cluster: "Protein Without Animals" },
  { id: "S-085", title: "Major US Brand Announces Commercial-Scale Insect Meal in Dry Dog Food", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "DataM Intelligence / Industry Reports", summary: "A major US pet food brand announced commercial-scale use of insect meal in dry dog food formulas, expanding beyond niche brands. Signals insect protein crossing from premium-niche to mainstream mass market.", soWhat: "Insect protein has crossed the niche-to-mainstream threshold in the US. The regulatory and consumer acceptance barriers are falling simultaneously.", cluster: "Protein Without Animals" },
  { id: "S-086", title: "Pet Food Supply Chain Enters Structural Volatility: Climate, Biofuels, Geopolitics", category: "En", geo: "Global", surprise: 2, confidence: "Verified", type: "Negative", source: "Fastmarkets / Pet Food Institute", summary: "2025 marked unprecedented volatility for pet food procurement. Protein prices fluctuated 12%+ annually. Biofuel mandates compete directly for pet food oils and fats. Climate volatility makes historical sourcing data unreliable.", soWhat: "Structural supply chain volatility makes alternative proteins not just a sustainability play but a supply security strategy. Mars needs climate-resilient protein sources.", cluster: "Supply Chain Resilience" },
  { id: "S-087", title: "Renewable Fuel Mandates Competing Directly for Pet Food Oils and Fats", category: "P", geo: "US", surprise: 2, confidence: "Verified", type: "Negative", source: "Pet Food Institute", summary: "Federal and state biofuel mandates create government-driven market advantage for energy sector over pet food manufacturers for the same oils and fats. Ingredients critical for pet food recipes diverted to renewable diesel.", soWhat: "Mars's pet food supply chain competes directly with the energy sector for raw materials. This is a policy-driven structural cost pressure that alternative proteins bypass entirely.", cluster: "Supply Chain Resilience" },
  { id: "S-088", title: "John Hancock Vitality: Wearable Activity → Life Insurance Premium Discounts (Proven)", category: "Ec", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "John Hancock / Vitality Group", summary: "John Hancock Vitality rewards policyholders with premium discounts and free/discounted Apple Watches based on physical activity. Monthly payments reduced to $0 with regular activity. Insurance premiums decrease with higher engagement.", soWhat: "The human insurance model (wearable data → premium discount) is proven and scaled. No pet insurer has replicated this despite smart collars generating equivalent clinical-grade data.", cluster: "The Insurance Gap" },
  { id: "S-089", title: "UnitedHealthcare Motion: $1K/Year for Meeting Wearable Activity Targets", category: "Ec", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "UnitedHealthcare", summary: "UnitedHealthcare Motion pays eligible members up to $1,000/year for meeting daily activity targets tracked via wearables. Average participants log 11,000 steps daily — more than double US average.", soWhat: "Behavioural insurance incentives work in human health at scale. The pet equivalent — rewarding owners for walking dogs, maintaining vet check-ups — is technically trivial with existing smart collar infrastructure.", cluster: "The Insurance Gap" },
  { id: "S-090", title: "RAND Study: 400K+ People Show 34% Activity Increase with Wearable Insurance Incentives", category: "T", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "RAND Europe / Vitality Group", summary: "RAND Europe study of 400,000+ Vitality insurance members showed 34% average increase in physical activity with wearable-linked incentives. Estimated to translate to two extra years of life expectancy.", soWhat: "If wearable incentives add 2 years to human life expectancy, what could equivalent pet wearable programs do? The evidence base for behavioural-linked pet insurance is already built — in human health.", cluster: "The Insurance Gap" },
  { id: "S-091", title: "Embedded Insurance Distribution Outperforming Direct-to-Consumer Across All Lines", category: "Ec", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "Multiple / InsurTech Analysis", summary: "Embedded insurance (sold through employers, platforms, non-insurance products) outperforms traditional direct-to-consumer channels. B2B2C distribution reduces customer acquisition costs by 60-80% versus direct marketing.", soWhat: "Pet insurance stuck below 4% partly because of high direct-to-consumer acquisition costs. The employer channel (85% want pet benefits) is the embedded distribution unlock.", cluster: "The Insurance Gap" },
  { id: "S-092", title: "California SB 253/261: Climate Disclosure Mandates for Large Companies", category: "P", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "California Legislature", summary: "California Senate Bills 253 and 261 mandate greenhouse gas emissions disclosure and climate-related financial risk reporting for large companies doing business in California. Applies to Mars.", soWhat: "Mars will need to disclose pet food supply chain emissions. Creates pressure toward lower-carbon protein sources and transparent sourcing — aligning sustainability with compliance.", cluster: "Supply Chain Resilience" },
  { id: "S-093", title: "EU Green Claims Directive: Third-Party Verification Required for Environmental Claims", category: "P", geo: "EU", surprise: 2, confidence: "Verified", type: "Positive", source: "European Commission", summary: "EU Green Claims Directive requires companies to verify environmental claims with third-party evidence. Pet food brands making sustainability claims need verified lifecycle data. Non-compliance carries significant penalties.", soWhat: "Brands that invest early in verified sustainability data create a regulatory moat. First pet brand with a credibly verified net-zero line wins.", cluster: "Supply Chain Resilience" },
  { id: "S-094", title: "84% of Pet Owners Hold Companies Responsible for Addressing Climate Change", category: "S", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "Pet Sustainability Coalition / BBMG", summary: "PSC's first State of Sustainability report: 84% of pet owners hold companies responsible for climate change. 62% bought an environmentally friendly product in the past month vs 46% of non-pet-owners.", soWhat: "Pet owners over-index on sustainability. Combined with Gen Z values and anti-greenwashing regulation, this creates genuine commercial pressure for verified sustainable pet food.", cluster: "Generational Shift" },
  { id: "S-095", title: "US Withdrawal from WHO (Jan 2026): One Health Framework Loses US Federal Support", category: "P", geo: "US", surprise: 3, confidence: "Verified", type: "Counter-Signal", source: "Executive Order / One Health Initiative", summary: "US formally withdrawn from WHO by executive order January 22, 2026. Weakens US participation in One Health framework (WHO/FAO/WOAH Joint Plan 2022-2026). Potentially slows regulatory alignment between human and vet medicine domestically.", soWhat: "US WHO withdrawal creates a One Health vacuum. Private sector actors (Mars, Zoetis) may need to fill the gap — or face slower human-vet medicine convergence than the global trend suggests.", cluster: "One Health Convergence" },
  { id: "S-096", title: "Pet Longevity Drugs: +2-5 Years = +$7K-17K Additional Revenue Per Dog Across Mars Stack", category: "Ec", geo: "US", surprise: 2, confidence: "Probable", type: "Positive", source: "Analysis / APPA Data", summary: "If longevity drugs extend average dog lifespan by 2-5 years, at $34,550 average lifetime cost over 10-15 years, each additional year = ~$2,300-3,450 in food, care, products. Mars captures value across nutrition, vet care, diagnostics for every year added.", soWhat: "Longevity drugs don't just add years — they add revenue years across Mars's entire stack. The business case for supporting longevity research is purely economic.", cluster: "The Longevity Dividend" },
  { id: "S-097", title: "Japan: Senior-Specific Nutrition Fastest Growing Category at 4.5% CAGR", category: "Ec", geo: "Japan", surprise: 2, confidence: "Verified", type: "Positive", source: "Japan Pet Food Association", summary: "Japan's pet market (¥1.9T/$11.6B): senior-specific nutrition fastest growing category at 4.5% CAGR. Mars Japan and Unicharm lead senior-specific formulas. 22M pets outnumber children under 15 by 30%.", soWhat: "Japan proves the longevity nutrition thesis: as pets live longer, senior-specific nutrition becomes a major profit pool. This is the market Mars should be learning from fastest.", cluster: "The Longevity Dividend" },
  { id: "S-098", title: "Cornell Hosts First Symposium on AI in Veterinary Medicine (SAVY)", category: "T", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "Cornell University", summary: "Cornell hosted the inaugural Symposium on Artificial Intelligence in Veterinary Medicine (SAVY). Projects: lameness detection, Lyme disease forecasting, canine heart disease staging, AI clinical decision support.", soWhat: "When a top-tier university dedicates a symposium solely to vet AI, standards and best practices follow within 2-3 years. Mars's AI tools will need to meet academic scrutiny.", cluster: "The Veterinary Desert" },
  { id: "S-099", title: "Social Media as Adoption Engine: Single Viral TikTok = 150+ Applications", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "APPA / Shelter Survey", summary: "86% of shelters report increased awareness from social media. A single viral TikTok generated 150+ adoption applications for one cat. Social media accelerating adoption cycles and brand discovery.", soWhat: "Social media bypasses traditional brand discovery. Gen Z pet owners find their pets and brands online. Mars needs social-first distribution.", cluster: "Generational Shift" },
  { id: "S-100", title: "500+ US Counties Lack Sufficient Veterinary Services", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Negative", source: "Multiple / USDA", summary: "Over 500 US counties lack sufficient veterinary services. Top demand states: Colorado, Michigan, West Virginia, North Carolina, Arizona. Rural communities cannot support private practices economically.", soWhat: "500+ counties with no adequate vet care maps onto Mars's mobile/telehealth thesis perfectly.", cluster: "The Veterinary Desert" },
  { id: "S-101", title: "Precision Fermentation Peak Hype? Analyst: Pet Food May Be Its Real Future", category: "Ec", geo: "Global", surprise: 2, confidence: "Verified", type: "Counter-Signal", source: "Food Tech Analysis", summary: "Analyst suggests precision fermentation may have reached peak hype for human food, predicting possible decline in 2026. But notes pet food and cosmetics as where fermentation's future may lie: 'customer is less scrutinising of ingredient origin.'", soWhat: "If fermentation's best market is pet food, Mars should position now while investor attention is elsewhere and acquisition prices are lower.", cluster: "Protein Without Animals" },
  { id: "S-102", title: "AAFCO Authorises Black Soldier Fly Larvae for Adult Dog Food and Treats", category: "P", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "AAFCO / FDA", summary: "AAFCO granted authorisation for black soldier fly larvae in adult maintenance dog food and treats, with implicit FDA permission. US regulatory pathway for insect protein in pet food is established.", soWhat: "Regulatory pathway for insect protein in US pet food is clear. AAFCO and FDA alignment removes the last formal barrier to commercial scale.", cluster: "Protein Without Animals" },
  { id: "S-103", title: "Alternative Proteins: Drastically Lower Environmental Footprint Than Livestock", category: "En", geo: "Global", surprise: 1, confidence: "Verified", type: "Positive", source: "Multiple Studies / GFI", summary: "Precision fermentation and insect farming both offer drastically lower land use, water consumption, and carbon emissions compared to conventional livestock protein. Produced in controlled environments.", soWhat: "Environmental credentials align with both consumer demand (84% hold companies responsible) and regulatory pressure (California disclosure mandates, EU Green Claims).", cluster: "Protein Without Animals" },
  { id: "S-104", title: "Average Lifetime Dog Ownership Cost: $34,550 — Most Owners Underestimate", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "APPA / Multiple Surveys", summary: "Average lifetime dog ownership cost: $34,550 over 10-15 years. Annual surgical vet: $472. Routine vet: $250. Food: $354. Most owners underestimate. Range: $1,390-$5,292 annually depending on breed.", soWhat: "At $34K lifetime cost per dog, even modest health improvements represent meaningful consumer value. Frames both insurance and preventive nutrition as high-ROI investments.", cluster: "The Insurance Gap" },
  { id: "S-105", title: "Boomers More Likely Than Gen Z to Want Pets 'As Long As Possible'", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "APPA Survey", summary: "Higher percentages of Boomers and Gen X want pets 'as long as possible' vs Millennials/Gen Z. Human-animal bond deepens as pets age. Senior pet owners = high lifetime value but underserved.", soWhat: "Is the industry too focused on Gen Z acquisition and missing the Boomer retention opportunity? Longevity drugs and senior nutrition speak directly to this demographic.", cluster: "Generational Shift" },
  { id: "S-106", title: "94M US Households Own Pets (71%) — Penetration Near Ceiling", category: "S", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "APPA", summary: "US pet ownership: 94M households (71%), up from 82M in 2023. 51% own dogs (68M), 37% own cats (49M). At these penetration levels, growth must come from spend per pet, not new acquisition.", soWhat: "71% penetration means the acquisition growth story is nearly over. Every future dollar comes from deeper share of wallet — which is what genomic nutrition, insurance, and longevity drugs deliver.", cluster: "Market Structure" },
  { id: "S-107", title: "Korean Air Pet Travel Membership: Year-Round Subscription for Pet Air Travel", category: "S", geo: "South Korea", surprise: 2, confidence: "Verified", type: "Positive", source: "Korean Air", summary: "Korean Air operates pet membership programme for year-round pet travel with designated pet-friendly seating. Part of broader Korean transport pet accommodation trend.", soWhat: "When airlines create annual subscription products for pet travel, pets are permanent infrastructure users — not exceptions.", cluster: "The Multispecies City" },
  { id: "S-108", title: "30% of Gen Z Want Retailers to Welcome Pets In-Store", category: "S", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "APPA Survey", summary: "Gen Z twice as likely to want in-store pet pharmacies. Want cross-species selection (birds, reptiles). Pet-friendly retail is baseline expectation, not perk.", soWhat: "Retail spaces that exclude pets will lose Gen Z traffic. Consumer-side pressure drives multispecies design.", cluster: "The Multispecies City" },
  { id: "S-109", title: "Seoul Expands Vet Fee Subsidies for Disadvantaged Pet Owners", category: "P", geo: "South Korea", surprise: 2, confidence: "Verified", type: "Positive", source: "Seoul Metropolitan Government", summary: "Seoul expanded vet fee subsidies for disadvantaged households: up to ₩400,000 for check-ups, vaccination, neutering. Participating clinics grew from 88 to 270.", soWhat: "Government-subsidised vet care = equity signal. If this model travels to US municipal programmes, it creates a public-funded layer complementing Mars's private infrastructure.", cluster: "The Veterinary Desert" },
  { id: "S-110", title: "Biome9 Acquired by Pooch & Mutt: UK Microbiome Startup Goes Corporate", category: "T", geo: "UK", surprise: 2, confidence: "Verified", type: "Positive", source: "Biome9 / Pooch & Mutt", summary: "UK startup Biome9 (first UK dog gut health testing kit) acquired by pet food company Pooch & Mutt. Previously raised £1M+ from Pets at Home CEO. Microbiome test-to-food pipeline being built through acquisition.", soWhat: "Microbiome startups being acquired by pet food companies signals the test-to-food pipeline is being built. Mars should be watching — and making — these acquisitions.", cluster: "The Genomic Table" },
  { id: "S-111", title: "Treat Therapeutics: Pets as Decentralised Clinical Trial Platform (Singapore)", category: "T", geo: "Singapore", surprise: 3, confidence: "Verified", type: "Positive", source: "Treat Therapeutics", summary: "Treat Therapeutics runs decentralised clinical trials via at-home stool kits + custom probiotics. Uses pets as health models for human disease.", soWhat: "Pets as clinical trial subjects for human medicine creates a One Health data loop. Mars's vet network could be the largest trial platform in the world.", cluster: "One Health Convergence" },
  { id: "S-112", title: "Korea 'Petconomy': Pet Industry Job Postings Up 21% Since 2021", category: "Ec", geo: "South Korea", surprise: 2, confidence: "Verified", type: "Positive", source: "Job Korea / Korea Herald", summary: "Korean pet industry job postings rose 21% from 2021-2025. Dog kindergartens and pet e-commerce fastest-growing. Government categorised pet industry into 4 sectors: food, healthcare, services, culture.", soWhat: "Korea is building an entire economic sector around pets. Government industrial strategy for pet care is unprecedented.", cluster: "The Multispecies City" },
  { id: "S-113", title: "ABSENCE: No Pet Food Brand Has Published Verified Lifecycle Carbon Assessment", category: "En", geo: "Global", surprise: 2, confidence: "Probable", type: "Absence", source: "Analysis / PSC Report", summary: "Despite 84% of pet owners demanding climate responsibility and incoming EU Green Claims Directive, no major pet food brand has published a verified lifecycle carbon assessment of its product lines.", soWhat: "First brand to publish verified carbon footprint creates both regulatory moat and consumer trust advantage with the 84% who care.", cluster: "Supply Chain Resilience" },
  { id: "S-114", title: "ABSENCE: No Vet GLP-1 Drug Approved — Despite 60% Pet Obesity Rate", category: "T", geo: "US", surprise: 3, confidence: "Probable", type: "Absence", source: "Analysis / APOP", summary: "60% of cats and 59% of dogs are overweight/obese. No GLP-1 or equivalent drug is approved for veterinary use. Only prior drug (Slentrol) was discontinued. Two trials now underway suggest approval by 2028.", soWhat: "The pet obesity pharmaceutical gap is closing. When it does, Mars's weight management nutrition lines face direct pharma competition.", cluster: "The Pharma Crossover" },
  { id: "S-115", title: "ABSENCE: Mars Has No Pharmaceutical or Drug Development Capability", category: "T", geo: "US", surprise: 3, confidence: "Probable", type: "Absence", source: "Analysis", summary: "Despite owning the world's largest vet clinic network, pet genetic database, and cutting-edge AI diagnostics, Mars has no pharma development capability. Loyal, Okava, and Akston are building drugs Mars's data could power.", soWhat: "Does Mars develop pharma capability, partner with Loyal/Okava/Akston, or risk the longevity and obesity drug categories being built entirely outside its ecosystem?", cluster: "The Pharma Crossover" },
  { id: "S-116", title: "Florida: Fastest-Growing US State for Pet Insurance (+$100M GWP in 2 Years)", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "NAPHIA", summary: "Florida: +$100M in GWP and +100,000 insured pets in 2 years. CA, NY, FL, TX combined = 37% of all insured pets. Geographic concentration shows insurance is still an affluent-urban phenomenon.", soWhat: "Pet insurance growth concentrated in affluent coastal markets. Rural/suburban penetration barely started — employer distribution could unlock next wave.", cluster: "The Insurance Gap" },
  { id: "S-117", title: "Vet Care Costs Up 60% in Decade; #1 Reason Owners Hesitate to Add Another Pet", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "NAPHIA / Multiple", summary: "Vet costs increased 60%+ in past decade. Average monthly dog insurance: $62.44, cats $32.21. Cost of vet care is #1 reason owners hesitate to add another pet (36%).", soWhat: "Rising vet costs are the #1 barrier to both pet acquisition and adequate healthcare. The demand signal for insurance is screaming — distribution is the blocker.", cluster: "The Insurance Gap" },
  { id: "S-118", title: "10 New US Veterinary Schools in Development — Largest Supply Expansion in History", category: "P", geo: "US", surprise: 2, confidence: "Verified", type: "Positive", source: "AVMA / Multiple", summary: "Three new vet schools graduated first classes 2023-2025. Ten more in development. Largest supply-side increase in veterinary medicine history.", soWhat: "If vet supply catches up by 2030-2035, the desert narrative weakens. But distribution, burnout (50%), and tech shortages persist regardless.", cluster: "The Veterinary Desert" },
  { id: "S-119", title: "Pet Sustainability Coalition: First-Ever Industry Benchmark Assessment", category: "En", geo: "Global", surprise: 2, confidence: "Verified", type: "Positive", source: "Pet Sustainability Coalition", summary: "PSC published first State of Sustainability report — first industry benchmark. 200+ member self-reported survey. Finds significant gaps in Scope 3 supply chain emissions measurement.", soWhat: "Industry now has a sustainability baseline. Companies demonstrating improvement against this benchmark differentiate competitively.", cluster: "Supply Chain Resilience" },
  { id: "S-120", title: "Vet Telemedicine Market: $146M to $747M by 2035 (18.8% CAGR) Despite Adoption Dip", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "Market Analysis / Multiple", summary: "Vet telemedicine projected $146M to $747M by 2035. Despite consumer telehealth declining 38% to 29%, AI-driven diagnostics, IoT wearables, and specialist point-to-point models driving long-term growth.", soWhat: "Consumer telehealth failed but specialist/AI-augmented telehealth may succeed. Market prices in 5x growth — which model wins determines Mars's telehealth ROI.", cluster: "The Veterinary Desert" },
  { id: "S-121", title: "Aspire Food Group: AI/IoT-Driven Insect Farming Facility in Ontario", category: "T", geo: "Canada", surprise: 2, confidence: "Verified", type: "Positive", source: "Aspire Food Group / NGen", summary: "Aspire secured NGen support for new AI/IoT-integrated cricket protein facility in Ontario. ML-optimised breeding, industrial-scale efficiency. Insect farming entering industrial phase.", soWhat: "Insect protein is industrialising with AI automation. Cost curve will follow the same trajectory as every AI-optimised agricultural process — downward, fast.", cluster: "Protein Without Animals" },
  { id: "S-122", title: "Global Natural Catastrophe Losses: $162B in H1 2025 Alone (Record)", category: "En", geo: "Global", surprise: 2, confidence: "Verified", type: "Negative", source: "World Economic Forum", summary: "Total global economic losses from natural catastrophes: $162B in H1 2025 alone, exceeding $156B for entire prior year. Once-rare disruptions are now structural features of the operating environment.", soWhat: "Climate disruption is a current cost, not a future risk. Pet food supply chains dependent on conventional agriculture face compounding annual losses.", cluster: "Supply Chain Resilience" },
  { id: "S-123", title: "US Insured Pets Doubled 2020-2024 (3.1M → 6.4M) But Growth Rate Decelerating", category: "Ec", geo: "US", surprise: 1, confidence: "Verified", type: "Positive", source: "NAPHIA", summary: "Insured pets doubled from 3.1M to 6.4M in 4 years. But growth rate decelerating: 28% in 2020-21, now 12.7%. Over 1/3 of insured pets in California alone.", soWhat: "Doubling in 4 years but decelerating suggests early adopters captured. Next wave requires fundamentally different distribution — employers, vet clinics, or embedded platforms.", cluster: "The Insurance Gap" },
];


// ═══════════════════════════════════════════════════════════════
// 9 DRIVERS — synthesised from 123-signal scan
// ═══════════════════════════════════════════════════════════════

const DRIVERS = [
  { id: "D-01", name: "The Genomic Table", desc: "Pet genetic, microbiome, and biometric data is scaling from curiosity to clinical utility. Mars's RenalTech, 4M+ Wisdom Panel genotypes, nose-print biometrics, and a proliferating microbiome testing ecosystem create conditions for predictive, personalised nutrition — and raise urgent data governance questions.", signals: ["S-005", "S-006", "S-007", "S-011", "S-014", "S-035", "S-036", "S-042", "S-045", "S-047", "S-061", "S-063", "S-072", "S-078", "S-110"], trajectory: "Accelerating", steep: "T", color: T.gold },
  { id: "D-02", name: "The Veterinary Desert", desc: "243 USDA shortage areas. 500+ counties lack adequate care. 14,300 tech openings vs 7,500 graduates. Telehealth declined. But 10 new vet schools and AVMA projections of 20%+ vet growth complicate the narrative. The crisis may be distribution, not headcount.", signals: ["S-010", "S-013", "S-020", "S-031", "S-032", "S-033", "S-037", "S-044", "S-048", "S-050", "S-053", "S-065", "S-070", "S-098", "S-100", "S-109", "S-118", "S-120"], trajectory: "Accelerating", steep: "Ec", color: T.blue },
  { id: "D-03", name: "Protein Without Animals", desc: "Three vectors converging: precision fermentation (science validated, 10x cost gap closing), insect protein ($1.6B market, 94% palatability, Purina already at 30%), and cell-cultured meat (Meatly UK first to retail). The question is which wins the cost curve race — and whether Mars leads or follows.", signals: ["S-001", "S-002", "S-003", "S-004", "S-019", "S-029", "S-030", "S-034", "S-051", "S-056", "S-058", "S-067", "S-068", "S-071", "S-082", "S-083", "S-084", "S-085", "S-101", "S-102", "S-103", "S-121"], trajectory: "Accelerating", steep: "T", color: T.red },
  { id: "D-04", name: "The Multispecies City", desc: "South Korea legislates pet-integrated infrastructure at national level. Gimpo creates first municipal Pet Culture Team. Korean Air offers pet travel subscriptions. 30% of Gen Z want pets in-store. Cities are redesigning for multispecies cohabitation, not pet 'accommodation.'", signals: ["S-012", "S-023", "S-024", "S-028", "S-038", "S-054", "S-064", "S-066", "S-107", "S-108", "S-112"], trajectory: "Nascent", steep: "S", color: T.green },
  { id: "D-05", name: "The Longevity Dividend", desc: "Loyal's LOY-002 passes 2 of 3 FDA milestones (largest vet trial in history). Rapamycin conditionally approved for cats. One Health convergence (WMA/WVA MOU, IUCN adoption) legitimises human-pet medicine alignment. Japan's senior pet economy previews the revenue impact: +2-5 years per dog = +$7K-17K lifetime value across Mars's stack.", signals: ["S-008", "S-009", "S-025", "S-026", "S-040", "S-041", "S-055", "S-060", "S-062", "S-075", "S-076", "S-079", "S-080", "S-081", "S-095", "S-096", "S-097", "S-111"], trajectory: "Accelerating", steep: "T", color: T.violet },
  { id: "D-06", name: "The Generational Repricing", desc: "Gen Z drives 43.5% pet ownership surge but dog ownership declined 4% YoY. 71% household penetration = near ceiling. 84% hold companies responsible for climate. K-shaped economy: growth from premiumisation, not acquisition. Every future dollar = deeper wallet share.", signals: ["S-015", "S-017", "S-021", "S-022", "S-027", "S-049", "S-052", "S-094", "S-099", "S-105", "S-106"], trajectory: "Accelerating", steep: "S", color: T.amber },
  { id: "D-07", name: "The Insurance Gap", desc: "US: $4.7B GWP, 6.4M insured pets, <4% penetration (Sweden 50%). Vet costs up 60% in a decade. Human insurance proves wearable→premium model at scale (Vitality: 400K+ people, 34% activity increase). Mars uniquely positioned (genetic data + clinical network + wearable data) but has no insurance product.", signals: ["S-016", "S-018", "S-039", "S-043", "S-046", "S-057", "S-059", "S-069", "S-088", "S-089", "S-090", "S-091", "S-104", "S-116", "S-117", "S-123"], trajectory: "Accelerating", steep: "Ec", color: T.orange },
  { id: "D-08", name: "The Pharma Crossover", desc: "Human pharmaceutical companies entering veterinary market from the health side. Two GLP-1 cat trials (Okava, Akston). Loyal's longevity drugs approaching approval. 60% pet obesity rate with zero approved treatments. Mars has no pharma capability despite owning the world's largest vet data ecosystem.", signals: ["S-073", "S-074", "S-077", "S-114", "S-115"], trajectory: "Nascent", steep: "T", color: T.cyan },
  { id: "D-09", name: "The Supply Chain Break", desc: "Climate catastrophe losses at $162B in H1 2025 alone. Biofuel mandates stealing pet food ingredients. Protein prices fluctuating 12%+ annually. California mandates climate disclosure. EU Green Claims Directive requires verification. No major pet brand has published a lifecycle carbon assessment. Conventional supply chains are breaking.", signals: ["S-086", "S-087", "S-092", "S-093", "S-113", "S-119", "S-122"], trajectory: "Accelerating", steep: "En", color: T.rose },
];

// ═══════════════════════════════════════════════════════════════
// 9 SCENARIOS — 5 Probable · 3 Deep · 1 Cassandra
// ═══════════════════════════════════════════════════════════════

const SCENARIOS = [
  {
    id: 1, tier: "Probable", title: "The Genomic Table",
    tagline: "By 2032, your pet's DNA and microbiome prescribe their dinner. Mars owns the data loop.",
    color: T.gold, drivers: ["D-01", "D-05", "D-06"], signalCount: 15, confidence: "High",
    dispatch: `Maya Chen doesn't think of herself as someone who reads scientific papers before breakfast. But every Tuesday, when the notification arrives from Royal Canin Precision — "Koda's Metabolic Update" — she opens it before her coffee.\n\nKoda is a seven-year-old Australian Shepherd. His Wisdom Panel profile — one of over 4 million in the database — flagged elevated risk for MDR1 drug sensitivity and early-onset hip dysplasia. His food arrives monthly, reformulated based on quarterly bloodwork from Banfield and continuous activity data from his collar.\n\nLast month, his formula shifted — more omega-3, a new prebiotic strain — after his microbiome panel showed inflammatory markers drifting. The test was powered by research from ADM's Lausanne microbiome centre, which opened in 2025.\n\nThe Banfield vet, Dr. Okonkwo, calls it "the quietest revolution in medicine." She sees fewer emergencies now. More of her day is spent reviewing RenalTech flags — kidney risk predicted two years before symptoms — and adjusting treatment plans.\n\nThe system works because Mars owns every layer: Wisdom Panel captures the genotype. Antech reads biomarkers. RenalTech predicts the trajectory. Banfield delivers care. Royal Canin closes the loop.\n\nIn the UK, Pooch & Mutt's acquisition of Biome9 showed smaller players were building the same pipeline through M&A. In Seoul, Petnow's nose-print biometrics linked health data to identity. The infrastructure was being built everywhere — but only Mars owned the full chain.`,
    shadow: "Creates a two-tier system: genomically-optimised pets for affluent owners vs. standard care for everyone else. EU AI Act (Aug 2026) may classify pet health AI as high-risk. What happens when the algorithm is wrong?",
    killerAssumption: "Assumes pet owners trust algorithmic nutrition enough to pay a premium. One high-profile adverse event could collapse the model. Also assumes regulators treat pet health AI as low-risk.",
    dimensions: { discoverability: 85, appeal: 90, relevance: 95, availability: 65 },
  },
  {
    id: 2, tier: "Probable", title: "The Veterinary Desert",
    tagline: "500+ counties. Zero adequate care. Mars's mobile network becomes critical infrastructure.",
    color: T.blue, drivers: ["D-02", "D-01", "D-08"], signalCount: 18, confidence: "High",
    dispatch: `The Banfield Mobile Unit pulls into Harlan County, Kentucky, at 7:14 AM on a Thursday. Dr. Priya Nair has been doing this route — four rural counties, three days — for eleven months. The nearest brick-and-mortar vet closed in 2029.\n\nThe USDA designated 243 veterinary shortage areas across 46 states. Over 500 counties lacked adequate services. Telehealth — the supposed saviour — declined from 38% to 29% between 2023 and 2024. Vets didn't trust it. Owners didn't want it.\n\nWhat filled the gap was mobile infrastructure. The unit carries a diagnostic suite, a surgical prep area, and an AI triage station — 39.2% of vet professionals now use AI tools regularly, faster adoption than human medicine.\n\nBy 8 AM there are fourteen people waiting. Ruth brings a fifteen-year-old beagle mix. AI triage flags renal markers. Dr. Nair patches in a BluePearl nephrologist — specialist point-to-point telehealth, not the consumer model that failed.\n\nThe deeper crisis was technicians. The US produces 7,500 graduates against 14,300 openings. Ten new vet schools were in development — the largest supply expansion in history — but distribution, not headcount, was the structural problem.\n\nSeoul, watching from ahead, had already expanded vet fee subsidies for disadvantaged households: 270 participating clinics, ₩400,000 per household. The American question was whether government or private infrastructure would fill the gap. In Harlan County, it was Mars.`,
    shadow: "Mars becomes de facto public utility in underserved areas — with monopolistic scrutiny. If vet schools succeed, the 'desert' narrative weakens. The tech shortage has no mobile solution.",
    killerAssumption: "Assumes the shortage worsens. AVMA projects 20%+ vet growth by 2030. If new schools deliver, the crisis deflates — and Mars's infrastructure play loses urgency.",
    dimensions: { discoverability: 75, appeal: 90, relevance: 90, availability: 85 },
  },
  {
    id: 3, tier: "Probable", title: "The Post-Animal Protein Pivot",
    tagline: "Insect protein breaks through first. Fermentation follows. The $1.6B market is just the beginning.",
    color: T.red, drivers: ["D-03", "D-09", "D-06"], signalCount: 22, confidence: "Medium",
    dispatch: `The Pedigree bag looks the same. That's the point.\n\nInside, 40% of the protein is black soldier fly larvae — the same ingredient Nestlé Purina launched at 30% in 2023. Protix's palatability trials had shown 94% of dogs accepted insect protein as their sole source. The consumer resistance everyone feared never materialised.\n\nInsect protein won the race that precision fermentation was supposed to win. The cost curve was the difference: insect farming was industrialising with AI-optimised breeding facilities (Aspire's Ontario plant went online in 2025), while fermentation proteins still cost €20-130/kg versus €2-13 conventional.\n\nThe push factor was as strong as the pull. Global catastrophe losses hit $162 billion in the first half of 2025 alone. Biofuel mandates were diverting pet food oils and fats to renewable diesel. Pet Food Institute publicly stated the era of predictable supply chains had ended.\n\nMars reformulated under pressure, not inspiration. When California's SB 253 mandated climate disclosure and the EU Green Claims Directive required third-party verification, the company that had never published a lifecycle carbon assessment suddenly needed one.\n\nThe insect-based pet food market — $1.6 billion in 2025, projected $4.2 billion by 2035 — wasn't a niche anymore. It was the mainstream. Fermentation would follow, once Bond Pet Foods' cost hit $3.80/kg. But insect got there first.\n\nGen Z didn't care about the ingredient origin. 84% held companies responsible for climate. They'd already switched.`,
    shadow: "Consumer trust is fragile — one contamination event sets the category back years. Fermentation's 10x cost gap may persist longer than optimists project. Incumbents may have to buy, not build.",
    killerAssumption: "Assumes insect protein scales without major regulatory or contamination setbacks AND that consumer acceptance holds across all demographics, not just early adopters.",
    dimensions: { discoverability: 60, appeal: 65, relevance: 85, availability: 55 },
  },
  {
    id: 4, tier: "Probable", title: "The Insurance Tipping Point",
    tagline: "Mars builds the insurance product nobody else can: genomic risk + clinical history + wearable data = $47/month.",
    color: T.orange, drivers: ["D-07", "D-01", "D-02"], signalCount: 16, confidence: "Medium",
    dispatch: `Lisa Park receives the email from her HR department on a Tuesday: "New Benefit — Mars PetShield now available through your employer."\n\nThe premium is $47 per month for her Labrador, Duke. The market average is $62.44. The discount comes from three data layers nobody else can combine: Duke's Wisdom Panel genetic profile (low hip dysplasia risk, moderate cancer risk), his Banfield clinical history (clean bloodwork, current on vaccines), and six months of activity data from his smart collar (11,200 average daily steps).\n\nThe pricing model was borrowed directly from human health insurance. John Hancock's Vitality programme had proven that wearable data could reduce premiums — a RAND study of 400,000+ members showed a 34% increase in physical activity. UnitedHealthcare's Motion programme paid members $1,000/year for meeting targets.\n\nNo pet insurer had replicated this, despite smart collars generating clinical-grade data. The gap was distribution: pet insurance was stuck below 4% partly because direct-to-consumer acquisition was expensive. Embedded insurance — sold through employers, platforms, vet clinics — was the unlock.\n\n85% of US employees wanted pet benefits. Mars PetShield launched as an employer benefit, not a consumer product.\n\nBy 2030, 2.1 million pets were insured through the programme. 40% came from the Banfield pipeline — owners who already trusted Mars with their pet's health took the obvious next step. In Korea, every local government was already subsidising pet insurance for adopted animals. The US was catching up.`,
    shadow: "Regulatory complexity of entering financial services is enormous. Adverse selection risk if genetic data creates uninsurable categories. Equity concerns: does genomic pricing exclude high-risk breeds?",
    killerAssumption: "Assumes Mars is willing to enter financial services. This requires insurance licensing, actuarial capability, and regulatory compliance Mars has never built. Partnership may be more realistic than ownership.",
    dimensions: { discoverability: 65, appeal: 85, relevance: 80, availability: 50 },
  },
  {
    id: 5, tier: "Probable", title: "The Supply Chain Break",
    tagline: "$162B in climate losses. Biofuel stealing ingredients. The era of predictable pet food supply chains is over.",
    color: T.rose, drivers: ["D-09", "D-03", "D-06"], signalCount: 7, confidence: "High",
    dispatch: `The email from Mars Procurement arrives at 6 AM on a Monday: "Tallow allocation reduced 15% for Q3. Renewable diesel mandates have absorbed available supply. Reformulation protocols activated."\n\nIt was the third such email in eight months. The Pet Food Institute had warned: federal and state biofuel mandates were creating a government-driven market advantage for the energy sector, competing directly for the same oils and fats that pet food required.\n\nGlobal natural catastrophe losses had hit $162 billion in the first half of 2025 alone — surpassing the entire previous year. Protein prices fluctuated 12%+ annually. Soybean meal sourcing required currency hedging, longer lead times, and exposure to infrastructure bottlenecks. Fastmarkets called it "the end of the efficiency paradigm."\n\nMars's response was reactive at first. Then California's SB 253 arrived: mandatory greenhouse gas disclosure for large companies. The EU Green Claims Directive followed: third-party verification for any environmental claim. Mars — like every major pet food company — had never published a verified lifecycle carbon assessment.\n\nThe Pet Sustainability Coalition's first industry benchmark revealed the gap: significant shortfalls in Scope 3 supply chain emissions measurement across the board. The 84% of pet owners who held companies responsible for climate change had data now, not just sentiment.\n\nThe companies that had already invested in alternative protein infrastructure — insect farming, fermentation partnerships, plant-based blends — weren't just sustainable. They were resilient. The supply chain break wasn't a future scenario. It was a Tuesday morning email.`,
    shadow: "Climate regulation could be rolled back politically. Alternative protein supply chains have their own vulnerabilities. Cost premiums for sustainable sourcing may be passed to consumers in a price-sensitive market.",
    killerAssumption: "Assumes supply chain disruptions compound rather than stabilise. If commodity markets find new equilibrium and regulations soften, the urgency for alternative sourcing diminishes.",
    dimensions: { discoverability: 70, appeal: 55, relevance: 90, availability: 75 },
  },
  {
    id: 6, tier: "Deep", title: "The Multispecies Commons",
    tagline: "South Korea builds the blueprint. Portland borrows it. Pets aren't accommodated — they're residents.",
    color: T.green, drivers: ["D-04", "D-05", "D-06"], signalCount: 11, confidence: "Medium",
    dispatch: `The building at 14th and Vine in Portland doesn't have a pet policy. It has a Species Integration Plan.\n\nThe template came from Seoul. South Korea's Companion Animal Industry Promotion Act was proposed in 2025 — potentially the first comprehensive pet industry legislation anywhere. Gimpo created the world's first municipal Pet Culture Team. Korean Air operated a pet membership programme with designated pet-friendly seating.\n\nThe Korean 'petconomy' was national economic policy: pet industry job postings rose 21% since 2021. Government categorised the sector into four pillars: food, healthcare, services, culture.\n\nAt 14th and Vine, the design borrowed Seoul's playbook: elevated walkways at cat height, circadian lighting, a ground-floor "species commons" with Banfield quarterly wellness visits included in the $40/month cohabitation levy.\n\nIn Japan, 22 million pets outnumbered children under 15 by 30%. Senior pet care products — carts, slings, diapers — were the fastest-growing category. Multispecies infrastructure wasn't just about young owners. It was about end-of-life.\n\nGen Z, surveyed by APPA, said 30% wanted retailers to welcome pets in-store. Pet-friendly wasn't a perk — it was a baseline. Retail spaces that excluded pets were losing foot traffic to those that didn't.\n\nJames Okafor, a 34-year-old resident, pays the levy without thinking about it. Pixel and Ghost aren't owned. They're residents.`,
    shadow: "Gentrification risk — multispecies buildings become luxury. 'Cohabitation' language threatens legal protections. This is a 20-year change, not 10.",
    killerAssumption: "Korea has the world's lowest birth rate and unique 'petfam' culture. The adoption curve in the US could be much slower.",
    dimensions: { discoverability: 60, appeal: 75, relevance: 55, availability: 35 },
  },
  {
    id: 7, tier: "Deep", title: "The Pharma Crossover",
    tagline: "GLP-1 for cats. Longevity pills for dogs. Human pharma enters Mars's market from the health side.",
    color: T.cyan, drivers: ["D-08", "D-05", "D-01"], signalCount: 5, confidence: "Contested",
    dispatch: `The Okava rep is in the Banfield waiting room when Dr. Okonkwo arrives at 7:30 AM. She's carrying a sample case and a pitch deck. The product: OKV-119, a GLP-1 implant for cats. Six months of sustained release. One vet visit. $100 per month.\n\nDr. Okonkwo has spent fifteen years telling cat owners the same thing: "Feed less, exercise more." Sixty percent of cats in the US are overweight. The only FDA-approved weight loss drug for pets (Slentrol) was discontinued years ago. The prescription has been unchanged for a century.\n\nNow two companies are racing. Okava's MEOW-1 trial: 50+ cats, six-month implant, FDA INAD application filed. Akston's Cornell trial: 70+ cats, weekly injection, dog programme six months behind. Both targeting FDA approval by 2028.\n\nMeanwhile, Loyal's LOY-002 — a daily longevity pill for senior dogs — had passed two of three FDA milestones. The STAY study was the largest veterinary clinical trial in history: 1,300 dogs, 70 clinics, $150 million raised. The drug targeted metabolic dysfunction, the same pathway GLP-1s addressed.\n\nMars had the world's largest veterinary clinic network. The largest pet genetic database. Cutting-edge AI diagnostics. But it had zero pharmaceutical capability. Every drug being developed to treat the conditions Mars's nutrition lines claimed to address was being built by someone else.\n\nThe strategic question wasn't whether pharma would enter pet health. It was already there. The question was whether Mars would be a partner, a customer, or a bystander.\n\nDr. Okonkwo looked at the sample case. "Show me the data," she said.`,
    shadow: "GLP-1 drugs may have unknown long-term side effects in cats. Pharma entry could commoditise nutrition if drugs replace dietary management. Mars may face an uncomfortable choice between supporting drugs that cannibalise its food revenue.",
    killerAssumption: "Assumes GLP-1 and longevity drugs reach market approval AND achieve price points accessible to mainstream pet owners. Regulatory delays, safety issues, or $500/month pricing would limit impact to affluent niche.",
    dimensions: { discoverability: 50, appeal: 70, relevance: 85, availability: 40 },
  },
  {
    id: 8, tier: "Deep", title: "The Longevity Economy",
    tagline: "When dogs live five years longer, every revenue line at Mars expands. The math changes everything.",
    color: T.violet, drivers: ["D-05", "D-08", "D-07"], signalCount: 18, confidence: "Medium",
    dispatch: `The actuarial model on Sarah Kim's screen shows a number that makes her pause: $17,250.\n\nThat's the additional lifetime revenue Mars captures per dog if longevity drugs extend the average lifespan by five years. Not from the drug itself — Mars doesn't make it. From everything else: five more years of Royal Canin. Five more years of Banfield visits. Five more years of Wisdom Panel monitoring. Five more years of insurance premiums.\n\nThe model started with APPA's data: $34,550 average lifetime cost per dog over 10-15 years. Each additional year = $2,300-3,450 in food, care, and products. Mars's share of that spend, across its ecosystem, was conservatively 30%.\n\nJapan had already proven the thesis. Senior-specific nutrition was the fastest-growing category at 4.5% CAGR. Mars Japan and Unicharm led the market. The 22 million pets that outnumbered children under 15 were getting old — and their owners were spending more per year, not less.\n\nThe longevity economy wasn't about one drug. It was about what happened after the drug worked. Senior nutrition tiers. Geriatric clinical care. Longevity monitoring subscriptions. End-of-life products.\n\nThe Dog Aging Project's TRIAD trial — $7 million from NIH, expanding to 580 dogs — was generating data applicable to human medicine. One Health convergence (WMA/WVA signed their MOU in July 2025) meant pet longevity research had institutional legitimacy.\n\nBoomers, APPA surveys showed, were more likely than Gen Z to want pets "as long as possible." The generation with the deepest human-animal bond and the most disposable income was the exact demographic longevity drugs served.\n\nSarah Kim added a row to the model: "Strategic investment in longevity drug partnerships." The ROI was obvious. Every year added to a dog's life was a year added to Mars's revenue.`,
    shadow: "Extended lifespan means extended chronic disease management. Vet costs compound. Pet grief is delayed but intensified. And the equity question: only affluent owners afford longevity drugs?",
    killerAssumption: "Assumes longevity drugs work and reach mass market. If drugs only extend lifespan for large breeds or require expensive ongoing treatment, the economic model narrows dramatically.",
    dimensions: { discoverability: 55, appeal: 80, relevance: 80, availability: 35 },
  },
  {
    id: 9, tier: "Cassandra", title: "The Pet Data Rebellion",
    tagline: "Mars's greatest asset — its integrated data flywheel — becomes its greatest liability.",
    color: "#E85D75", drivers: ["D-01", "D-08", "D-02"], signalCount: 15, confidence: "Contested",
    dispatch: `The class action was filed on a Wednesday. By Friday, #WhoOwnsKodasData was trending.\n\nThe plaintiff alleged her dog's genetic data from Wisdom Panel, combined with behavioural data from a Mars-affiliated smart collar and veterinary records from Banfield, had been used to train RenalTech's health prediction model without informed consent.\n\nThe legal theory was novel: pet health data, when aggregated, constitutes a proxy for owner health data — and falls under emerging biometric privacy laws.\n\nThe regulatory scaffolding was in place. GDPR had reached €6.7 billion in cumulative fines. The EU AI Act, fully applicable from August 2026, imposed risk-based obligations on biometric AI systems. The US had withdrawn from WHO in January 2026, creating a One Health governance vacuum that left data standards fragmented.\n\nThe absence signals were the loudest warning: no major pet company had built a transparent data governance framework. No integration between genetic testing and municipal registration. The entire industry collected biometric data under terms of service designed for an era when pet data meant nothing.\n\nWithin a month, three states introduced Pet Data Protection bills. Mars stock dipped 4%.\n\nThe irony: the plaintiff loved what the data did for her dog. "Max's nutrition plan was incredible. I just didn't agree to be part of a dataset I couldn't see, couldn't correct, and couldn't leave."\n\nThe Pharma Crossover made it worse. When Loyal and Okava wanted Mars's clinical data for drug development, the question of who owned that data — Mars, the vet, or the owner — had no settled answer. The flywheel that powered every other scenario was the thing that broke trust.`,
    shadow: "This IS the shadow side. Every signal pointing toward data integration also points toward data risk. The Cassandra scenario tests what happens when Mars's flywheel becomes its vulnerability.",
    killerAssumption: "Assumes pet data privacy becomes politically salient. Currently, minimal public awareness. But EU AI Act provides the mechanism, GDPR provides the precedent, and Mars — as the largest integrated pet data holder — has the most to lose.",
    dimensions: { discoverability: 40, appeal: 30, relevance: 90, availability: 80 },
  },
];

const SCENARIO_COLORS = SCENARIOS.map(s => s.color);

// ═══════════════════════════════════════════════════════════════
// STRATEGIC IMPACT MATRIX — 9 scenarios × 8 brands
// ═══════════════════════════════════════════════════════════════

const MATRIX_DATA = [
  { brand: "Royal Canin",      scores: [4,2,3,2,3,1,2,3,2], types: ["opp","mon","opp","mon","mon","mon","threat","opp","threat"] },
  { brand: "IAMS / Pedigree",  scores: [2,1,4,1,4,2,1,2,1], types: ["mon","mon","opp","mon","threat","mon","mon","mon","mon"] },
  { brand: "Banfield",         scores: [3,4,1,3,1,3,4,3,3], types: ["opp","opp","mon","opp","mon","opp","opp","opp","threat"] },
  { brand: "Wisdom Panel",     scores: [4,2,1,4,1,1,3,2,4], types: ["opp","mon","mon","opp","mon","mon","opp","mon","threat"] },
  { brand: "Antech/RenalTech", scores: [4,4,1,3,1,2,4,3,4], types: ["opp","opp","mon","opp","mon","mon","opp","opp","threat"] },
  { brand: "VCA / BluePearl",  scores: [2,4,1,2,1,2,3,3,2], types: ["mon","opp","mon","mon","mon","mon","opp","opp","threat"] },
];

// ═══════════════════════════════════════════════════════════════
// TIMELINE — NOW / MONITOR / PREPARE FOR
// ═══════════════════════════════════════════════════════════════

const TIMELINE_ITEMS = [
  { label: "RenalTech platform licensing (beyond Banfield)", lane: "now", year: 2026, scenario: 1 },
  { label: "EU AI Act compliance audit (Aug 2026)", lane: "now", year: 2026, scenario: 9 },
  { label: "Banfield mobile expansion — 500+ shortage counties", lane: "now", year: 2026, scenario: 2 },
  { label: "Pet data governance framework — pre-empt regulation", lane: "now", year: 2026, scenario: 9 },
  { label: "Lifecycle carbon assessment — first-mover advantage", lane: "now", year: 2026, scenario: 5 },
  { label: "Insurance partnership scoping (employer channel)", lane: "now", year: 2027, scenario: 4 },
  { label: "Breed-specific nutrition pilot at mass retail", lane: "now", year: 2027, scenario: 1 },
  { label: "Loyal / Okava partnership evaluation", lane: "monitor", year: 2027, scenario: 7 },
  { label: "GLP-1 cat trial results (MEOW-1)", lane: "monitor", year: 2027, scenario: 7 },
  { label: "Insect protein supply partnership — Protix/Aspire", lane: "monitor", year: 2027, scenario: 3 },
  { label: "Korea pet industry legislation — track passage", lane: "monitor", year: 2027, scenario: 6 },
  { label: "Fermentation cost curve — track quarterly to $3.80", lane: "monitor", year: 2028, scenario: 3 },
  { label: "Vet school pipeline — 10 new schools output tracking", lane: "monitor", year: 2028, scenario: 2 },
  { label: "Microbiome-adaptive subscription launch", lane: "prepare", year: 2029, scenario: 1 },
  { label: "Mars PetShield employer insurance pilot", lane: "prepare", year: 2029, scenario: 4 },
  { label: "Pharma partnership or build decision", lane: "prepare", year: 2029, scenario: 7 },
  { label: "Senior longevity nutrition tier launch", lane: "prepare", year: 2030, scenario: 8 },
  { label: "Fermentation supply acquisition", lane: "prepare", year: 2030, scenario: 3 },
  { label: "Multispecies building partnerships (Korea model)", lane: "prepare", year: 2031, scenario: 6 },
  { label: "Clinical trial network commercialisation (One Health)", lane: "prepare", year: 2031, scenario: 8 },
];

// ─── COMPONENTS ───

const GrainOverlay = () => (
  <div style={{
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, opacity: 0.03,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
  }} />
);

const AnimatedNumber = ({ value, delay = 0, suffix = "" }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0; const end = value; const duration = 1200; const startTime = performance.now();
      const animate = (now) => {
        const elapsed = now - startTime; const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(start + (end - start) * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return <span>{display}{suffix}</span>;
};

const SurpriseDots = ({ level }) => (
  <span style={{ fontFamily: "monospace", letterSpacing: 2, fontSize: 11 }}>
    {[1,2,3].map(i => <span key={i} style={{ color: i <= level ? T.gold : T.textMuted }}>●</span>)}
  </span>
);

const STEEPBadge = ({ category }) => {
  const colors = { S: T.blue, T: T.gold, Ec: T.amber, En: T.green, P: T.red, X: T.violet };
  const labels = { S: "SOCIAL", T: "TECH", Ec: "ECON", En: "ENVIRO", P: "POLICY", X: "CROSS" };
  return (
    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: 1.5, color: colors[category] || T.textSecondary, padding: "2px 8px", border: `1px solid ${colors[category] || T.textMuted}44`, borderRadius: 3 }}>
      {labels[category] || category}
    </span>
  );
};

const TierBadge = ({ tier }) => {
  const colors = { Probable: T.blue, Deep: T.green, Cassandra: T.violet };
  return (
    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: 1.5, color: colors[tier], textTransform: "uppercase" }}>
      {tier === "Cassandra" ? "⚠ CASSANDRA" : tier}
    </span>
  );
};

const SignalCard = ({ signal, index, onClick, isSelected }) => {
  const [hovered, setHovered] = useState(false);
  const isAbsence = signal.type === "Absence";
  const isCounter = signal.type === "Counter-Signal";
  return (
    <div onClick={() => onClick?.(signal)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: isSelected ? T.bgElevated : hovered ? T.bgHover : T.bgCard,
        border: `1px solid ${isAbsence ? T.amber + "40" : isCounter ? T.red + "40" : T.glassBorder}`,
        borderLeft: `3px solid ${isAbsence ? T.amber : isCounter ? T.red : { S: T.blue, T: T.gold, Ec: T.amber, En: T.green, P: T.red }[signal.category] || T.textMuted}`,
        borderStyle: isAbsence ? "dashed" : isCounter ? "dashed" : "solid",
        borderRadius: 6, padding: "14px 16px", cursor: "pointer", transition: "all 200ms ease",
        animation: `fadeUp 400ms ${index * 40}ms both`,
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.textMuted }}>{signal.id}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SurpriseDots level={signal.surprise} />
          <STEEPBadge category={signal.category} />
        </div>
      </div>
      <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: T.textHeading, margin: "0 0 6px", lineHeight: 1.3 }}>{signal.title}</h4>
      <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{signal.summary}</p>
      {isSelected && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.glassBorder}` }}>
          <span style={{ fontSize: 11, color: T.gold, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5 }}>SO WHAT?</span>
          <p style={{ fontSize: 12, color: T.textPrimary, margin: "6px 0 0", lineHeight: 1.5 }}>{signal.soWhat}</p>
        </div>
      )}
    </div>
  );
};

const ScenarioCard = ({ scenario, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={() => onClick(scenario)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.bgElevated : T.bgCard, border: `1px solid ${T.glassBorder}`,
        borderRadius: 6, padding: 20, cursor: "pointer", borderTop: `3px solid ${scenario.color}`,
        transition: "all 200ms ease", transform: hovered ? "translateY(-2px)" : "none",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.textMuted }}>S{scenario.id}</span>
        <TierBadge tier={scenario.tier} />
      </div>
      <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 400, color: T.textHeading, margin: "0 0 8px", lineHeight: 1.3 }}>{scenario.title}</h3>
      <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>{scenario.tagline}</p>
      <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{scenario.signalCount} signals</span>
        <span>{scenario.confidence}</span>
      </div>
    </div>
  );
};

const ScenarioDetail = ({ scenario, onClose }) => (
  <div style={{ marginTop: 32, animation: "slideUp 400ms ease" }}>
    <div style={{ background: T.bgCard, border: `1px solid ${scenario.color}25`, borderRadius: 8, padding: "40px 48px", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 24, background: "none", border: "none", color: T.textMuted, fontSize: 24, cursor: "pointer" }}>×</button>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ width: 48, height: 3, background: scenario.color, borderRadius: 2 }} />
        <TierBadge tier={scenario.tier} />
        <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>S{scenario.id} · {scenario.signalCount} signals · {scenario.confidence} confidence</span>
      </div>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, fontWeight: 400, color: T.textHeading, margin: "0 0 8px" }}>{scenario.title}</h2>
      <p style={{ fontSize: 16, color: scenario.color, fontStyle: "italic", margin: "0 0 32px", fontFamily: "Georgia, serif" }}>{scenario.tagline}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 48, marginTop: 40 }}>
        <div>
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: scenario.color, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>The Dispatch</h3>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, color: T.textPrimary, lineHeight: 1.75, whiteSpace: "pre-line" }}>{scenario.dispatch}</div>
        </div>
        <div>
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.textMuted, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>The Dossier</h3>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Dominant Drivers</span>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {scenario.drivers.map(did => {
                const d = DRIVERS.find(x => x.id === did);
                return d ? (
                  <div key={did} style={{ padding: "8px 12px", background: T.bgCard, borderRadius: 4, borderLeft: `2px solid ${d.color}`, fontSize: 13, color: T.textPrimary }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.textMuted, marginRight: 8 }}>{d.id}</span>{d.name}
                  </div>
                ) : null;
              })}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Four Dimensions</span>
            <div style={{ marginTop: 12 }}>
              {Object.entries(scenario.dimensions).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.textSecondary, textTransform: "capitalize" }}>{key}</span>
                    <span style={{ fontSize: 12, color: T.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{val}</span>
                  </div>
                  <div style={{ height: 4, background: T.bgSecondary, borderRadius: 2 }}>
                    <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${scenario.color}88, ${scenario.color})`, width: `${val}%`, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: 16, background: T.red + "10", borderRadius: 4, border: `1px solid ${T.red}25`, marginBottom: 24 }}>
            <span style={{ fontSize: 11, color: T.red, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>Shadow Side</span>
            <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, margin: "8px 0 0" }}>{scenario.shadow}</p>
          </div>
          <div style={{ padding: 16, background: T.violet + "10", borderRadius: 4, border: `1px solid ${T.violet}25` }}>
            <span style={{ fontSize: 11, color: T.violet, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>Killer Assumption</span>
            <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, margin: "8px 0 0" }}>{scenario.killerAssumption}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StrategicMatrix = () => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "12px 12px", fontSize: 12, color: T.textMuted, borderBottom: `1px solid ${T.glassBorder}`, fontWeight: 500, minWidth: 120 }} />
          {SCENARIOS.map(s => (
            <th key={s.id} style={{ textAlign: "center", padding: "8px 4px", fontSize: 9, color: s.color, borderBottom: `2px solid ${s.color}40`, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3, whiteSpace: "nowrap", minWidth: 70 }}>
              S{s.id}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MATRIX_DATA.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: `1px solid ${T.glassBorder}` }}>
            <td style={{ padding: "8px 12px", fontSize: 12, color: T.textPrimary, fontWeight: 500, whiteSpace: "nowrap" }}>{row.brand}</td>
            {row.scores.map((score, si) => {
              const typeColor = row.types[si] === "opp" ? T.gold : row.types[si] === "threat" ? T.red : T.blue;
              return (
                <td key={si} style={{ textAlign: "center", padding: "8px 4px" }}>
                  <span style={{ color: typeColor, fontSize: 11, letterSpacing: 1 }}>{"●".repeat(score)}{"○".repeat(4 - score)}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
      <span><span style={{ color: T.gold }}>●</span> Opportunity</span>
      <span><span style={{ color: T.blue }}>●</span> Monitor</span>
      <span><span style={{ color: T.red }}>●</span> Threat</span>
    </div>
  </div>
);

const TimelineView = () => {
  const years = [2026, 2027, 2028, 2029, 2030, 2031];
  const lanes = ["now", "monitor", "prepare"];
  const laneLabels = { now: "NOW", monitor: "MONITOR", prepare: "PREPARE FOR" };
  const laneColors = { now: T.green, monitor: T.amber, prepare: T.violet };
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", marginBottom: 8, paddingLeft: 120 }}>
        {years.map(y => <div key={y} style={{ flex: 1, textAlign: "center", fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{y}</div>)}
      </div>
      {lanes.map(lane => (
        <div key={lane} style={{ display: "flex", alignItems: "stretch", minHeight: 120, borderTop: `1px solid ${T.glassBorder}`, position: "relative" }}>
          <div style={{ width: 120, flexShrink: 0, display: "flex", alignItems: "center", paddingLeft: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 2, color: laneColors[lane] }}>{laneLabels[lane]}</div>
          <div style={{ flex: 1, position: "relative", display: "flex" }}>
            {years.map(y => <div key={y} style={{ flex: 1, borderLeft: `1px solid ${T.glassBorder}15` }} />)}
            {TIMELINE_ITEMS.filter(i => i.lane === lane).map((item, idx) => {
              const pos = ((item.year - 2026) / (2031 - 2026)) * 100;
              const sc = SCENARIOS.find(s => s.id === item.scenario);
              return (
                <div key={idx} style={{ position: "absolute", left: `${pos}%`, top: 6 + (idx % 4) * 26, maxWidth: 220, animation: `fadeUp 500ms ${300 + idx * 100}ms both` }}>
                  <div style={{ background: T.bgCard, border: `1px solid ${sc?.color || T.textMuted}30`, borderRadius: 4, padding: "4px 8px", fontSize: 9, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 190 }}>
                    <span style={{ color: sc?.color, marginRight: 4 }}>●</span>{item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const DriverNetwork = () => {
  const width = 600, height = 420;
  const cx = width / 2, cy = height / 2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      {DRIVERS.map((d, i) => {
        const angle = (i / DRIVERS.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * 155;
        const y = cy + Math.sin(angle) * 135;
        const r = 12 + d.signals.length * 1.5;
        return (
          <g key={d.id}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={d.color} strokeWidth={0.5} strokeOpacity={0.15} />
            <circle cx={x} cy={y} r={r + 8} fill={d.color} fillOpacity={0.06} />
            <circle cx={x} cy={y} r={r} fill={T.bgCard} stroke={d.color} strokeWidth={1.5} />
            <text x={x} y={y - 2} textAnchor="middle" fill={d.color} fontSize={7} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>{d.id}</text>
            <text x={x} y={y + 8} textAnchor="middle" fill={T.textSecondary} fontSize={6} fontFamily="'DM Sans', sans-serif">{d.name.length > 16 ? d.name.slice(0, 16) + "…" : d.name}</text>
          </g>
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={T.textMuted} fontSize={10} fontFamily="'JetBrains Mono', monospace" letterSpacing={3}>DRIVER</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={T.textMuted} fontSize={10} fontFamily="'JetBrains Mono', monospace" letterSpacing={3}>CONSTELLATION</text>
    </svg>
  );
};

// ─── MAIN APP ───
const NAV_ITEMS = ["Overview", "Signals", "Drivers", "Scenarios", "Strategy", "Timeline"];

export default function HorizonApp() {
  const [activeView, setActiveView] = useState("Overview");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [signalFilter, setSignalFilter] = useState("All");
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  useEffect(() => { setLoaded(true); }, []);

  const filteredSignals = useMemo(() => {
    if (signalFilter === "All") return SIGNALS;
    if (signalFilter === "Absence") return SIGNALS.filter(s => s.type === "Absence");
    if (signalFilter === "Counter") return SIGNALS.filter(s => s.type === "Counter-Signal");
    return SIGNALS.filter(s => s.category === signalFilter);
  }, [signalFilter]);

  const handleLogin = () => {
    if (password === "mars2036") {
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 1500);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: T.bgAbyss, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <GrainOverlay />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
          @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
          @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        `}</style>
        <div style={{ textAlign: "center", animation: "fadeUp 600ms ease" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, letterSpacing: 8, color: T.gold, marginBottom: 8 }}>HORIZON</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.textMuted, letterSpacing: 3, marginBottom: 40 }}>MARS PET CARE · FUTURES INTELLIGENCE · v3.0</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", animation: authError ? "shake 300ms ease" : "none" }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="ENTER ACCESS CODE"
              autoFocus
              style={{
                background: T.bgCard, border: `1px solid ${authError ? T.red : T.glassBorder}`,
                borderRadius: 4, padding: "12px 20px", fontSize: 13, color: T.textPrimary,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, width: 260,
                outline: "none", textAlign: "center", transition: "border-color 300ms ease",
              }}
            />
            <button onClick={handleLogin} style={{
              background: T.gold + "20", border: `1px solid ${T.gold}40`, borderRadius: 4,
              padding: "12px 20px", color: T.gold, fontSize: 12, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, fontWeight: 600,
            }}>→</button>
          </div>
          {authError && <div style={{ color: T.red, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginTop: 12 }}>ACCESS DENIED</div>}
          <div style={{ marginTop: 48, fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            CLASSIFIED · 123 SIGNALS · 9 DRIVERS · 9 SCENARIOS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bgAbyss, color: T.textPrimary, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <GrainOverlay />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: ${T.bgElevated} transparent; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${T.bgElevated}; border-radius: 3px; }
      `}</style>

      {/* ─── HEADER ─── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: T.bgAbyss + "F0", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.glassBorder}`, padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 6, color: T.gold }}>HORIZON</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.textMuted, letterSpacing: 2 }}>v3.0</span>
            </div>
            <div style={{ width: 1, height: 24, background: T.glassBorder, margin: "0 8px" }} />
            <span style={{ fontSize: 12, color: T.textMuted }}>Mars Pet Care Futures Intelligence Engine</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: T.green, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, padding: "3px 8px", background: T.green + "15", borderRadius: 3, border: `1px solid ${T.green}30` }}>123 SIGNALS</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s ease infinite" }} />
            <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>OPERATIONAL</span>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 0, marginTop: -1 }}>
          {NAV_ITEMS.map(item => (
            <button key={item} onClick={() => setActiveView(item)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "12px 20px", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              color: activeView === item ? T.textHeading : T.textMuted,
              borderBottom: activeView === item ? `2px solid ${T.gold}` : "2px solid transparent",
              transition: "all 150ms ease",
            }}>{item}</button>
          ))}
        </nav>
      </header>

      {/* ─── CONTENT ─── */}
      <main style={{ padding: "32px 32px 80px", maxWidth: 1400, margin: "0 auto" }}>

        {/* OVERVIEW */}
        {activeView === "Overview" && (
          <div style={{ animation: "fadeUp 500ms ease" }}>
            <div style={{ marginBottom: 48, maxWidth: 720 }}>
              <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 44, fontWeight: 400, color: T.textHeading, lineHeight: 1.15, margin: "0 0 16px", animation: "fadeUp 600ms ease" }}>
                Futures Intelligence<br /><span style={{ color: T.gold }}>for Pet Care</span>
              </h1>
              <p style={{ fontSize: 17, color: T.textSecondary, lineHeight: 1.65, margin: 0, animation: "fadeUp 600ms 100ms both ease" }}>
                A recursive foresight engine mapping the forces that will reshape how pets are fed, treated, housed, and understood over the next decade.
                Built on <span style={{ color: T.gold }}>123 real signals</span> from live research across 8 geographies — including adjacent-field scans of human health, agriculture, insurance, and climate systems.
                Nine drivers. Nine scenarios. Stress-tested by adversarial analysis. Designed to make Mars act, not just think.
              </p>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 48, animation: "fadeUp 600ms 200ms both ease" }}>
              {[
                { label: "Signals Scanned", value: 123, color: T.blue },
                { label: "Absence Signals", value: 11, color: T.amber },
                { label: "Drivers Identified", value: 9, color: T.gold },
                { label: "Scenarios Generated", value: 9, color: T.green },
                { label: "Geographies Covered", value: 8, color: T.violet },
              ].map((m, i) => (
                <div key={i} style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: "20px 20px 16px", borderTop: `2px solid ${m.color}40` }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: m.color }}>
                    <AnimatedNumber value={m.value} delay={400 + i * 150} />
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Nine Futures preview — 3×3 grid */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400, color: T.textHeading, margin: 0 }}>Nine Futures</h2>
                <button onClick={() => setActiveView("Scenarios")} style={{ background: "none", border: "none", cursor: "pointer", color: T.gold, fontSize: 13 }}>View all scenarios →</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {SCENARIOS.map((s, i) => (
                  <div key={s.id} onClick={() => { setActiveView("Scenarios"); setSelectedScenario(s); }}
                    style={{
                      background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6,
                      padding: 14, cursor: "pointer", borderTop: `3px solid ${s.color}`,
                      animation: `fadeUp 500ms ${300 + i * 60}ms both`, transition: "all 200ms ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.bgElevated; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.bgCard; e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>S{s.id} · {s.tier}</span>
                      <span style={{ fontSize: 10, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.signalCount} sig</span>
                    </div>
                    <h4 style={{ fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 400, color: T.textHeading, margin: "6px 0 0", lineHeight: 1.3 }}>{s.title}</h4>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver constellation + Matrix */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 24, animation: "fadeUp 500ms 500ms both" }}>
                <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.textMuted, letterSpacing: 3, margin: "0 0 16px" }}>DRIVER CONSTELLATION</h3>
                <DriverNetwork />
              </div>
              <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 24, animation: "fadeUp 500ms 600ms both" }}>
                <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.textMuted, letterSpacing: 3, margin: "0 0 16px" }}>STRATEGIC IMPACT MATRIX</h3>
                <StrategicMatrix />
              </div>
            </div>
          </div>
        )}

        {/* SIGNALS */}
        {activeView === "Signals" && (
          <div style={{ animation: "fadeUp 400ms ease" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, color: T.textHeading, margin: "0 0 4px" }}>Signal Scanner</h2>
                <p style={{ fontSize: 14, color: T.textSecondary, margin: 0 }}>
                  {SIGNALS.length} curated signals from 123-signal scan · {new Set(SIGNALS.map(s => s.geo)).size} geographies · {SIGNALS.filter(s => s.type === "Absence").length} absence · {SIGNALS.filter(s => s.type === "Counter-Signal").length} counter-signals
                </p>
              </div>
              <div style={{ display: "flex", gap: 4, overflow: "hidden", borderRadius: 4 }}>
                {["All", "T", "S", "Ec", "P", "En", "Absence", "Counter"].map(f => (
                  <button key={f} onClick={() => setSignalFilter(f)} style={{
                    background: signalFilter === f ? T.bgElevated : "transparent",
                    border: `1px solid ${signalFilter === f ? T.gold + "40" : T.glassBorder}`,
                    color: signalFilter === f ? T.textHeading : T.textMuted,
                    padding: "6px 12px", fontSize: 11, cursor: "pointer", borderRadius: 3,
                    fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5, transition: "all 150ms ease",
                  }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {filteredSignals.map((s, i) => <SignalCard key={s.id} signal={s} index={i} onClick={setSelectedSignal} isSelected={selectedSignal?.id === s.id} />)}
            </div>
          </div>
        )}

        {/* DRIVERS */}
        {activeView === "Drivers" && (
          <div style={{ animation: "fadeUp 400ms ease" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, color: T.textHeading, margin: "0 0 8px" }}>Driver Constellation</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, margin: "0 0 32px" }}>{DRIVERS.length} macro drivers from 123-signal clustering. The structural forces shaping pet care's next decade.</p>
            <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 32, marginBottom: 32 }}>
              <DriverNetwork />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {DRIVERS.map((d, i) => (
                <div key={d.id} style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 24, borderLeft: `3px solid ${d.color}`, animation: `fadeUp 500ms ${i * 80}ms both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: d.color, fontWeight: 600 }}>{d.id}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <STEEPBadge category={d.steep} />
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: d.trajectory === "Accelerating" ? T.green : d.trajectory === "Nascent" ? T.amber : T.textMuted }}>
                        {d.trajectory === "Accelerating" ? "↑" : "○"} {d.trajectory}
                      </span>
                    </div>
                  </div>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 400, color: T.textHeading, margin: "0 0 8px" }}>{d.name}</h3>
                  <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, margin: "0 0 12px" }}>{d.desc}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {d.signals.map(sid => (
                      <span key={sid} style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: T.textMuted, background: T.bgSecondary, padding: "2px 6px", borderRadius: 3 }}>{sid}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCENARIOS */}
        {activeView === "Scenarios" && (
          <div style={{ animation: "fadeUp 400ms ease" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, color: T.textHeading, margin: "0 0 8px" }}>Nine Futures</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, margin: "0 0 8px" }}>5 probable · 3 deep · 1 Cassandra. Grounded in 123-signal evidence from Feb 2026 adjacent-field scan.</p>
            <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 32px" }}>Click any scenario for the full Dispatch and Dossier.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {SCENARIOS.map(s => <ScenarioCard key={s.id} scenario={s} onClick={setSelectedScenario} />)}
            </div>
            {selectedScenario && <ScenarioDetail scenario={selectedScenario} onClose={() => setSelectedScenario(null)} />}
          </div>
        )}

        {/* STRATEGY */}
        {activeView === "Strategy" && (
          <div style={{ animation: "fadeUp 400ms ease" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, color: T.textHeading, margin: "0 0 8px" }}>Strategic Impact Matrix</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, margin: "0 0 32px" }}>Cross-portfolio impact: 9 scenarios × 6 business units. Every cell maps opportunity, threat, or monitor.</p>
            <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 32 }}>
              <StrategicMatrix />
            </div>
            <div style={{ marginTop: 32, padding: 32, background: `linear-gradient(135deg, ${T.gold}08, ${T.gold}03)`, border: `1px solid ${T.gold}20`, borderRadius: 6 }}>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.gold, letterSpacing: 3, margin: "0 0 16px" }}>THE MARS FLYWHEEL — 123-SIGNAL EVIDENCE BASE</h3>
              <p style={{ fontSize: 15, color: T.textPrimary, lineHeight: 1.65, maxWidth: 900, margin: 0 }}>
                <span style={{ color: T.gold }}>Waltham research</span> → <span style={{ color: T.blue }}>Wisdom Panel</span> (4M+ genotypes) → <span style={{ color: T.green }}>Antech + RenalTech</span> (predictive diagnostics) → <span style={{ color: T.amber }}>Banfield/VCA/BluePearl</span> (1,600+ hospitals) → <span style={{ color: T.red }}>nutrition brands</span> (adaptive formulation).
                The adjacent-field scan reveals three new forces: <span style={{ color: T.cyan }}>pharma crossing over</span> from human health (GLP-1, longevity drugs), <span style={{ color: T.rose }}>supply chains breaking</span> from climate and biofuel competition, and <span style={{ color: T.orange }}>insurance</span> as the untapped revenue layer connecting genetic data to financial products.
                No competitor owns this full chain. But every external force is converging on the gaps Mars hasn't filled.
              </p>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {activeView === "Timeline" && (
          <div style={{ animation: "fadeUp 400ms ease" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, color: T.textHeading, margin: "0 0 8px" }}>NOW / MONITOR / PREPARE FOR</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, margin: "0 0 32px" }}>Strategic timing across 9 scenarios. Actions grounded in signal evidence and regulatory deadlines.</p>
            <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: "24px 32px" }}>
              <TimelineView />
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 32, fontSize: 12, color: T.textSecondary }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.green, fontWeight: 700, letterSpacing: 2, fontSize: 11 }}>NOW</span>
                Evidence strong, deadlines real. Fund and build.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.amber, fontWeight: 700, letterSpacing: 2, fontSize: 11 }}>MONITOR</span>
                Track GLP-1 trials, fermentation costs, Korea legislation.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.violet, fontWeight: 700, letterSpacing: 2, fontSize: 11 }}>PREPARE</span>
                Scenario-dependent partnerships and capabilities.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
