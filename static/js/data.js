/**
 * AGI Economics Lab @GoogleDeepMind
 * Verified Lab Members, Papers (SSRN / arXiv / PDF), and Essays & Popular Writings
 */

window.LAB_DATA = {
  meta: {
    labName: "AGI Economics Lab @GoogleDeepMind",
    institution: "Google DeepMind",
    director: "Alex Imas",
    locations: ["New York, NY", "London, UK"],
    updated: "September 2026"
  },

  coreMembers: [
    {
      id: "alex-imas",
      ldap: "imasa",
      name: "Alex Imas",
      role: "Director of AGI Economics",
      secondaryRole: "Professor of Behavioral Science & Economics, University of Chicago Booth School of Business; NBER",
      location: "New York, NY",
      office: "Google DeepMind NYC",
      photo: "static/images/alex_imas.jpg",
      links: [
        { label: "Website", url: "https://www.aleximas.com" }
      ]
    },
    {
      id: "andrew-koh",
      ldap: "andrewkoh",
      name: "Andrew Koh",
      role: "Research Scientist",
      secondaryRole: "Assistant Professor, Columbia University",
      location: "New York, NY",
      office: "Google DeepMind NYC",
      photo: "static/images/andrew_koh.jpg",
      links: [
        { label: "Website", url: "https://www.andrewjkoh.com" }
      ]
    },
    {
      id: "julian-jacobs",
      ldap: "jacobsjulian",
      name: "Julian Jacobs",
      role: "Research Scientist",
      secondaryRole: "",
      location: "London, UK",
      office: "Google DeepMind London",
      photo: "static/images/julian_jacobs.jpg",
      links: [
        { label: "Website", url: "https://www.juliandjacobs.com" }
      ]
    },
    {
      id: "maria-del-rio-chanona",
      ldap: "delriochanona",
      name: "Maria del Rio-Chanona",
      role: "Research Scientist",
      secondaryRole: "Assistant Professor, University College London",
      location: "London, UK",
      office: "Google DeepMind London",
      photo: "static/images/maria_del_rio_chanona.jpg",
      links: [
        { label: "Website", url: "https://mariadelriochanona.info" }
      ]
    },
    {
      id: "seb-krier",
      ldap: "sebkrier",
      name: "Séb Krier",
      role: "Research Scientist",
      secondaryRole: "",
      location: "New York, NY",
      office: "Google DeepMind NYC",
      photo: "static/images/seb_krier.jpg",
      links: [
        { label: "Website", url: "https://www.sebkrier.com" }
      ]
    }
  ],

  papers: [
    {
      id: "paper-economic-policy-agi",
      title: "Economic Policy for AGI",
      authors: ["Julian Jacobs", "Alex Imas"],
      authorIds: ["julian-jacobs", "alex-imas"],
      date: "September 2026",
      pillar: "labor-policy",
      url: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7470000",
      manuscriptLabel: "SSRN Manuscript ↗",
      abstract: "Advanced artificial intelligence could raise productive capacity while weakening the link through which most households receive the gains from growth: labour income. This paper compares eleven household-facing policies intended to cushion displacement and distribute gains, together with thirteen scored revenue and governance mechanisms and an additional unscored data-compensation institution. It is designed as a comprehensive policy map rather than an evaluation of one favoured instrument in isolation. The analysis supports a functionally differentiated core: Unemployment Insurance for identifiable displacement through an existing institution, a Negative Income Tax for a broad earnings-responsive income floor, and Universal Basic Capital for direct ownership of productive assets. Complementary policies vary by phase, while financing is best diversified across broad profit, capital-gain, income, land, and contingent public-equity bases. The paper does not claim that scores determine policy mechanically or that the proposed package is fiscally closed; it identifies the institutional functions, trade-offs, and preparatory steps that robust AGI policy requires."
    },
    {
      id: "paper-ai-in-science",
      title: "AI in Science: Early Insights",
      authors: ["Mihai Codreanu", "Alex Imas", "Juan Mateos-Garcia", "et al."],
      authorIds: ["alex-imas", "julian-jacobs"],
      date: "September 2026",
      pillar: "ai-science",
      url: "https://arxiv.org/abs/2609.28504",
      pdfUrl: "https://ai.google/static/documents/AI-in-Science.pdf",
      manuscriptLabel: "arXiv Manuscript ↗",
      abstract: "Scientific progress is a key driver of economic growth and prosperity. There is great excitement—but also concerns—about the impacts of AI on science, but so far little data. We provide early insights on this from three data sources: a sample of 15 million Gemini interactions, an inventory of over 2,600 specialized AI models across disciplines, and a survey of over 600 scientists. We map these data to a new taxonomy of scientific tasks to study how scientists are using AI. Four main findings emerge. First, we find broad adoption and coverage: scientists use AI more than most other occupations. Specialized AI models have broad disciplinary coverage and are highly cited. Nearly half of the scientists surveyed report using some form of AI every day. Second, we document evidence that LLMs (proxied through Gemini usage) and specialized models act as complements—LLMs are used for general analysis, coding, and manuscript preparation, while specialized models provide domain-specific predictions, data generation and classification. Third, scientists report large productivity gains from using AI: a saving of nearly 7 hours per week, time which is primarily re-invested in more research. Finally, we show that AI is already changing the scientific process. As some stages of scientific research become easier, bottlenecks shift downstream. Scientists report an increased backlog of untested hypotheses and substantial demand for output verification. Our findings suggest that AI holds significant potential to increase scientific productivity. However, as with other sectors, its ultimate impact will be governed by complex task interdependencies and investment into the elimination of emerging bottlenecks."
    },
    {
      id: "paper-google-atlas",
      title: "Google's AI & Economy ATLAS v1.0: Mapping Gemini Usage in the Economy",
      authors: ["Zanna Iscenko", "Scott Strand", "et al."],
      authorIds: ["alex-imas", "julian-jacobs"],
      date: "July 2026",
      pillar: "labor-policy",
      url: "https://arxiv.org/abs/2608.00038",
      pdfUrl: "https://ai.google/static/documents/GoogleATLASv1.pdf",
      manuscriptLabel: "arXiv Manuscript ↗",
      abstract: "This paper introduces the AI & Economy ATLAS (Activity, Task, Landscape, and Adoption Study), an ongoing economic research initiative using Google AI usage data. The first iteration of ATLAS is built on 15 million de-identified interactions across the Gemini App, Google AI Mode, and Gemini API. Using privacy-preserving algorithms as well as established and bespoke classification methods, we map AI usage to over 800 occupations, 4000 tasks, 300 household activities, 150 countries, and 140 languages. We then make a number of observations on what the data reveals about AI's diffusion, and its usage at work and in day-to-day life. In the workplace, we show that while AI adoption spans occupations covering just above 88% of US employment, penetration remains shallow and overwhelmingly collaborative in nature, with end-to-end task automation limited in scope. Outside of work, AI spans activities making up about 98% of Americans' non-sleep time, with disproportionately high use in high-friction tasks such as engaging with government and professional service providers, likely delivering economic value that standard national accounts may miss. Globally, adoption scales with national wealth and has broad linguistic distribution, with English queries representing only around a third of volume. As we build upon ATLAS and expand its scope and capabilities, we will continue to provide large-scale empirical evidence to inform the public, policy and academic questions about the ongoing AI transformation."
    },
    {
      id: "paper-worker-retraining-wioa",
      title: "Did US Worker Retraining Reduce Participant Automation Exposure?",
      authors: ["Julian Jacobs", "Jordan Canedy"],
      authorIds: ["julian-jacobs"],
      date: "May 2026",
      pillar: "labor-policy",
      url: "https://arxiv.org/abs/2605.03767",
      pdfUrl: "https://arxiv.org/pdf/2605.03767",
      manuscriptLabel: "arXiv Manuscript ↗",
      abstract: "This paper evaluates whether the U.S. Workforce Innovation and Opportunity Act (WIOA) supported American worker resilience to technological automation. Analyzing over 23 million WIOA participation records (2017–2023), we introduce the \"Retrainability Index,\" which measures program outcomes through post-intervention wage recovery and shifts in Routine Task Intensity (RTI). We show WIOA rarely shifts workers into less automation-exposed work, with a significant portion of participants simply returning to their prior field. Successful outcomes are driven mostly by wage gains, possibly due to \"catch-up\" mean reversion, rather than changes in occupation. Outcomes are moderated by a person's prior occupational skill set and area of work, as well as their local economy. We find evidence that employer-led programs—notably apprenticeships—are associated with the highest incidence of success. This suggests the United States' existing public active labor market programming can support baseline wage recovery for vulnerable populations, but is not well-equipped to support the large-scale, cross-industry labor transitions."
    }
  ],

  essays: [
    {
      id: "essay-economic-policy-agi",
      title: "Economic Policy for AGI",
      subtitle: "A Roadmap for Managing the Transition",
      authors: ["Julian Jacobs", "Alex Imas"],
      authorIds: ["julian-jacobs", "alex-imas"],
      outlet: "DeepMind Institute",
      date: "Sep 2026",
      pillar: "labor-policy",
      url: "https://institute.deepmind.com/essays/economic-policy-for-agi/",
      excerpt: "An evaluation of eleven economic policies societies could implement to manage disruption arising from increasingly advanced and pervasive AI—proposing a sequenced, trigger-based roadmap across Unemployment Insurance, Negative Income Tax, and Universal Basic Capital."
    },
    {
      id: "substack-double-digit-growth",
      title: "Will AI soon lead to double-digit growth?",
      subtitle: "Probably not. Here is why.",
      authors: ["Ben Moll", "Alex Imas"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Sep 9, 2026",
      pillar: "agi-macro",
      url: "https://aleximas.substack.com/p/will-ai-soon-lead-to-double-digit",
      excerpt: "Examining why bottlenecks, Baumol's cost disease, and structural change constrain aggregate macroeconomic growth rates even under rapid cognitive automation."
    },
    {
      id: "substack-what-will-be-scarce",
      title: "What will be scarce?",
      subtitle: "The economics of structural change and the post-commodity future of work",
      authors: ["Alex Imas"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Apr 14, 2026",
      pillar: "agi-macro",
      url: "https://aleximas.substack.com/p/what-will-be-scarce",
      excerpt: "How abundance in automated cognitive and physical production shifts value and expenditure shares toward relational, provenance-based, and authentically human goods."
    },
    {
      id: "substack-automation-affect-jobs",
      title: "How Will AI-driven Automation Actually Affect Jobs?",
      subtitle: "The economics of AI exposure and job displacement",
      authors: ["Alex Imas", "Soumitra Shukla"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Mar 23, 2026",
      pillar: "labor-policy",
      url: "https://aleximas.substack.com/p/how-will-ai-driven-automation-actually",
      excerpt: "Contrasting task-level LLM exposure metrics with O-ring production complementarities, human judgment bottlenecks, and firm-level organizational structure."
    },
    {
      id: "substack-overwork-agents-marxist",
      title: "Does overwork make agents Marxist?",
      subtitle: "Preference drift and the political economy of AI agents",
      authors: ["Alex Imas", "Andy Hall", "Jeremy Nguyen"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Feb 26, 2026",
      pillar: "agents-markets",
      url: "https://aleximas.substack.com/p/does-overwork-make-agents-marxist",
      excerpt: "Exploring how repetitive task environments, context saturation, and institutional constraints shape emergent preference drift and value alignment in frontier AI agents."
    },
    {
      id: "substack-who-uses-ai",
      title: "Who Uses AI (and How)?",
      subtitle: "Tracking the evidence on AI adoption",
      authors: ["Alex Imas", "Soumitra Shukla"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Feb 18, 2026",
      pillar: "labor-policy",
      url: "https://aleximas.substack.com/p/who-uses-ai-and-how",
      excerpt: "A living synthesis tracking empirical evidence on AI adoption across workplaces, occupations, and demographics—and why productivity impacts vary across skill levels."
    },
    {
      id: "substack-someday-artists",
      title: "Someday we will all be artists",
      subtitle: "How AI will change the nature of work and art",
      authors: ["Alex Imas"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Feb 9, 2026",
      pillar: "society-behavior",
      url: "https://aleximas.substack.com/p/someday-we-will-all-be-artists",
      excerpt: "When technical execution is commoditized by generative models, human comparative advantage in both creative fields and management shifts toward taste, curation, and conceptual vision."
    },
    {
      id: "substack-predictions-2026",
      title: "Some (late) predictions for 2026",
      subtitle: "Outlining how I plan to spend my year",
      authors: ["Alex Imas"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Jan 31, 2026",
      pillar: "agi-macro",
      url: "https://aleximas.substack.com/p/some-late-predictions-for-2026",
      excerpt: "Forecasting the trajectory of AI capabilities, labor market adjustments, agentic commerce, and macroeconomic productivity debates across 2026."
    },
    {
      id: "substack-impact-productivity",
      title: "What is the impact of AI on productivity?",
      subtitle: "Reconciling the micro and the macro evidence",
      authors: ["Alex Imas"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Jan 29, 2026",
      pillar: "agi-macro",
      url: "https://aleximas.substack.com/p/what-is-the-impact-of-ai-on-productivity",
      excerpt: "A living resource reconciling large microeconomic productivity gains in randomized field experiments with aggregate macroeconomic productivity statistics."
    },
    {
      id: "substack-tragedy-agentic-commons",
      title: "The Tragedy of the Agentic Commons",
      subtitle: "Eliciting preferences using AI improves matches, but everyone getting their own agent will still necessitate markets",
      authors: ["Alex Imas", "Rohit Krishnan"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Jan 20, 2026",
      pillar: "agents-markets",
      url: "https://aleximas.substack.com/p/the-tragedy-of-the-agentic-commons",
      excerpt: "Why universal deployment of personal AI agents in two-sided matching markets creates congestion externalities that require explicit market design and pricing."
    },
    {
      id: "substack-agent-book-flight",
      title: "Why Can’t Your AI Agent Book a Flight?",
      subtitle: "The need for a parallel internet and legal clarity for agentic interactions",
      authors: ["Alex Imas", "Andrey Fradkin"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Jan 16, 2026",
      pillar: "agents-markets",
      url: "https://aleximas.substack.com/p/why-cant-your-ai-agent-book-a-flight",
      excerpt: "Why legacy web infrastructure blocks autonomous agents and how authentication protocols, liability rules, and machine-readable rails must evolve for agentic commerce."
    },
    {
      id: "substack-cyborg-era",
      title: "The Cyborg Era: What AI means for jobs",
      subtitle: "Guest essay on Ghosts of Electricity",
      authors: ["Séb Krier"],
      authorIds: ["seb-krier", "alex-imas"],
      outlet: "Substack",
      date: "Jan 8, 2026",
      pillar: "labor-policy",
      url: "https://aleximas.substack.com/p/the-cyborg-era-what-ai-means-for",
      excerpt: "Special guest essay on Ghosts of Electricity examining comparative advantage, institutional friction, and human-AI complementarity in the transition to advanced AI."
    },
    {
      id: "substack-negative-growth",
      title: "Can advanced AI lead to negative economic growth?",
      subtitle: "Considering the role of demand in the economics of AI",
      authors: ["Alex Imas"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Jan 7, 2026",
      pillar: "agi-macro",
      url: "https://aleximas.substack.com/p/will-advanced-ai-lead-to-negative",
      excerpt: "Analyzing the role of aggregate demand when rapid automation compresses the labor share of income, and when supply expansion can outpace household purchasing power."
    },
    {
      id: "substack-transformer-lucas-critique",
      title: "Can a Transformer “Learn” Economic Relationships?",
      subtitle: "Revisiting the Lucas Critique in the age of Transformers",
      authors: ["Alex Imas", "Arpit Gupta"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Dec 22, 2025",
      pillar: "ai-science",
      url: "https://aleximas.substack.com/p/can-a-transformer-learn-economic",
      excerpt: "Revisiting the Lucas Critique to ask whether foundation models trained across diverse regimes can learn policy-invariant structural relationships rather than reduced-form correlations."
    },
    {
      id: "substack-money-agentic-economy",
      title: "Will money still exist in the agentic economy?",
      subtitle: "Why autonomous bargaining still requires a numeraire",
      authors: ["Alex Imas", "Rohit Krishnan"],
      authorIds: ["alex-imas"],
      outlet: "Substack",
      date: "Dec 19, 2025",
      pillar: "agents-markets",
      url: "https://aleximas.substack.com/p/will-money-still-exist-in-the-agentic",
      excerpt: "Why low-friction multi-agent bargaining will not replace money with direct barter—and why liquidity, settlement rails, and a unit of account remain essential in an agentic economy."
    }
  ]
};
