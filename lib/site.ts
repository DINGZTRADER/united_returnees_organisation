export const SITE = {
  name: "United Returnees Organisation",
  shortName: "URO",
  tagline: "Return. Reconnect. Rebuild.",
  description:
    "United Returnees Organisation helps Ugandans planning to return or already back home access trusted reintegration support, practical information, opportunity and community.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "256750038345",
  annualFeeUsd: 100,
  socialHandle: "@UNITEDRETURNEES",
  publicRecognitionUrl: "https://diasporaaffairs.go.ug/blog-single55.html",
};

export const NAV = [
  ["About", "/about"],
  ["Returnee Support", "/services"],
  ["Resources", "/resources"],
  ["Contact", "/contact"],
] as const;

export const SUPPORT_PATHWAYS = [
  { title: "Employment", text: "Career guidance, CV readiness, professional networking and pathways to suitable opportunities.", icon: "briefcase" },
  { title: "Business & Entrepreneurship", text: "Practical guidance on business setup, compliance, markets, mentorship and access to relevant support networks.", icon: "store" },
  { title: "Investment", text: "Trusted information and referrals to help returnees evaluate productive investment opportunities with greater confidence.", icon: "chart" },
  { title: "Settlement & Relocation", text: "Orientation on housing, schools, banking, telecommunications and the practical realities of settling back home.", icon: "home" },
  { title: "Legal & Government Services", text: "Clear pathways to official information, public services and verified institutions relevant to returnees.", icon: "shield" },
  { title: "Community & Wellbeing", text: "Peer connection, events, mentorship and a supportive network of people who understand the return journey.", icon: "people" },
] as const;

export const READINESS = [
  { step: "01", title: "Organize", text: "Define the return objective, resources, deadlines, dependencies and the people responsible for each critical decision." },
  { step: "02", title: "Educate", text: "Research the real operating environment: institutions, rules, relationships, market conditions, risks and local practices." },
  { step: "03", title: "Discipline", text: "Protect capital, attention and time. Keep decisions aligned to the plan and set clear walk-away thresholds before pressure arrives." },
] as const;

export const RESOURCE_CATEGORIES = ["Business","Employment","Investment","Tax","Property","Education","Healthcare","Banking","Government Services","Living in Uganda"] as const;
