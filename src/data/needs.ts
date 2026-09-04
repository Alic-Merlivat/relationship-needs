/**
 * The taxonomy has two levels:
 *
 *   CORE RELATIONSHIP NEED  (9 of them, the `NeedCategory` values below)
 *       ↓
 *   Individual need cards    (5 each, except Communication & Understanding
 *                             which carries 6 — see AGENTS/product notes)
 *
 * Cards are what users compare against each other. Core Needs are the
 * higher-level lens results are eventually reported through.
 */
/**
 * Identifies the card set a stored assessment was answered against.
 *
 * Persisted alongside every saved history: need ids are only meaningful
 * relative to a taxonomy, so a future change to the cards must be able to
 * tell old results apart rather than silently re-score them against cards
 * the person never saw. Bump this whenever ids are added, removed, or
 * given different meanings.
 */
export const TAXONOMY_VERSION = "v2-9core-46";

export type NeedCategory =
  | "Love & Affection"
  | "Intimacy & Desire"
  | "Security & Trust"
  | "Communication & Understanding"
  | "Respect & Appreciation"
  | "Connection & Togetherness"
  | "Autonomy & Boundaries"
  | "Growth & Exploration"
  | "Partnership & Shared Life";

export const CATEGORY_EMOJI: Record<NeedCategory, string> = {
  "Love & Affection": "❤️",
  "Intimacy & Desire": "🔥",
  "Security & Trust": "🔐",
  "Communication & Understanding": "💬",
  "Respect & Appreciation": "🤝",
  "Connection & Togetherness": "🫂",
  "Autonomy & Boundaries": "🕊️",
  "Growth & Exploration": "🌱",
  "Partnership & Shared Life": "🏡",
};

/** The question each Core Need answers, in the user's own voice. */
export const CATEGORY_QUESTION: Record<NeedCategory, string> = {
  "Love & Affection": "Do I feel loved?",
  "Intimacy & Desire": "Do I feel desired and intimately connected?",
  "Security & Trust": "Do I feel safe trusting this relationship?",
  "Communication & Understanding": "Do I feel heard and understood?",
  "Respect & Appreciation": "Do I feel valued and respected?",
  "Connection & Togetherness": "Do we share meaningful time and a sense of us?",
  "Autonomy & Boundaries": "Can I remain myself within this relationship?",
  "Growth & Exploration": "Do we keep growing, playing and discovering together?",
  "Partnership & Shared Life": "Are we building a life together?",
};

/** Compact label for space-constrained UI (cards, chips, legends). */
export const CATEGORY_SHORT_LABEL: Record<NeedCategory, string> = {
  "Love & Affection": "Love",
  "Intimacy & Desire": "Intimacy",
  "Security & Trust": "Security",
  "Communication & Understanding": "Communication",
  "Respect & Appreciation": "Respect",
  "Connection & Togetherness": "Connection",
  "Autonomy & Boundaries": "Autonomy",
  "Growth & Exploration": "Growth",
  "Partnership & Shared Life": "Partnership",
};

export interface RelationshipNeed {
  id: string;
  name: string;
  category: NeedCategory;
  description: string;
  /** Concrete everyday examples of what this card includes, shown as context under the description. */
  subNeeds: string[];
}

export const NEEDS: RelationshipNeed[] = [
  // ❤️ Love & Affection — expressions of love
  {
    id: "affection",
    name: "Affection",
    category: "Love & Affection",
    description: "Feeling loved through touch and everyday physical closeness.",
    subNeeds: ["hugs", "cuddling", "kissing", "holding hands", "tenderness"],
  },
  {
    id: "romance",
    name: "Romance",
    category: "Love & Affection",
    description: "Feeling that your relationship is intentionally kept romantic and special.",
    subNeeds: ["dates", "surprises", "romantic gestures", "thoughtful moments"],
  },
  {
    id: "feeling-cherished",
    name: "Feeling Cherished",
    category: "Love & Affection",
    description:
      "Feeling warmly treasured by your partner — loved for who you are, not for what you do.",
    subNeeds: ["being treasured", "loving attention", "warmth", "feeling special"],
  },
  {
    id: "thoughtfulness",
    name: "Thoughtfulness",
    category: "Love & Affection",
    description: "Small, unprompted acts of caring that show you're being thought about.",
    subNeeds: ["remembering details", "little kindnesses", "checking in", "small gestures"],
  },
  {
    id: "words-of-love",
    name: "Words of Love",
    category: "Love & Affection",
    description: "Hearing love spoken out loud rather than only assumed.",
    subNeeds: ["saying I love you", "verbal affirmation", "loving words", "spoken warmth"],
  },

  // 🔥 Intimacy & Desire — feeling wanted and erotically connected
  {
    id: "feeling-desired",
    name: "Feeling Desired",
    category: "Intimacy & Desire",
    description: "Feeling attractive, wanted and actively chosen by your partner.",
    subNeeds: ["attraction", "flirting", "compliments", "being pursued"],
  },
  {
    id: "sexual-intimacy",
    name: "Sexual Intimacy",
    category: "Intimacy & Desire",
    description: "Having a mutually fulfilling sexual connection as part of the relationship.",
    subNeeds: ["sex", "erotic connection", "pleasure", "physical intimacy"],
  },
  {
    id: "passion",
    name: "Passion",
    category: "Intimacy & Desire",
    description: "Experiencing erotic energy, excitement and chemistry with your partner.",
    subNeeds: ["chemistry", "desire", "intensity", "sensuality"],
  },
  {
    id: "sexual-openness",
    name: "Sexual Openness",
    category: "Intimacy & Desire",
    description: "Being able to communicate desires and explore sexuality together without shame.",
    subNeeds: ["fantasies", "preferences", "experimentation", "talking about sex"],
  },
  {
    id: "sexual-reciprocity",
    name: "Sexual Reciprocity",
    category: "Intimacy & Desire",
    description:
      "Feeling that sexual interest, initiation and pleasure are mutual rather than one-sided.",
    subNeeds: ["initiation", "mutual desire", "giving and receiving"],
  },

  // 🔐 Security & Trust — the relationship as dependable and safe
  {
    id: "trust",
    name: "Trust",
    category: "Security & Trust",
    description: "Believing your partner is faithful to you and won't betray your bond.",
    subNeeds: ["fidelity", "faithfulness", "no betrayal", "benefit of the doubt"],
  },
  {
    id: "honesty",
    name: "Honesty",
    category: "Security & Trust",
    description: "Knowing that important truths are communicated openly, even when uncomfortable.",
    subNeeds: ["truthfulness", "disclosure", "sincerity", "no deception"],
  },
  {
    id: "reliability",
    name: "Reliability",
    category: "Security & Trust",
    description: "Being able to count on your partner to follow through on what they say.",
    subNeeds: ["consistency", "keeping promises", "dependability"],
  },
  {
    id: "stability",
    name: "Stability",
    category: "Security & Trust",
    description:
      "Experiencing the relationship itself as steady rather than unpredictable or turbulent.",
    subNeeds: ["predictability", "continuity", "even keel", "no on-off cycles"],
  },
  {
    id: "reassurance",
    name: "Reassurance",
    category: "Security & Trust",
    description: "Receiving confirmation that you are loved and that the relationship is okay.",
    subNeeds: ["comforting words", "confirmation", "checking in"],
  },

  // 💬 Communication & Understanding — being heard, understood, and able to repair
  {
    id: "open-communication",
    name: "Open Communication",
    category: "Communication & Understanding",
    description: "Being able to talk freely and honestly about what matters.",
    subNeeds: ["openness", "difficult conversations", "sharing concerns"],
  },
  {
    id: "being-understood",
    name: "Being Understood",
    category: "Communication & Understanding",
    description:
      "Knowing your partner genuinely listens and grasps who you are and how you experience things.",
    subNeeds: ["active listening", "empathy", "perspective-taking", "not being dismissed"],
  },
  {
    id: "validation",
    name: "Validation",
    category: "Communication & Understanding",
    description: "Having your emotions treated as legitimate, even when they aren't fully understood.",
    subNeeds: ["emotional acknowledgment", "legitimacy", "not being told you overreact"],
  },
  {
    id: "clarity",
    name: "Clarity",
    category: "Communication & Understanding",
    description:
      "Knowing where you stand instead of having to guess what your partner thinks or wants.",
    subNeeds: ["directness", "expectations", "intentions", "certainty"],
  },
  {
    id: "conflict-safety",
    name: "Conflict Safety",
    category: "Communication & Understanding",
    description: "Being able to disagree without cruelty, intimidation or emotional destruction.",
    subNeeds: ["calm disagreement", "no contempt", "emotional regulation"],
  },
  {
    id: "repair",
    name: "Repair",
    category: "Communication & Understanding",
    description:
      "Knowing that after hurt or conflict, both of you work to reconnect and make things right.",
    subNeeds: ["apologies", "accountability", "forgiveness", "reconnection"],
  },

  // 🤝 Respect & Appreciation — dignity, recognition and standing
  {
    id: "respect",
    name: "Respect",
    category: "Respect & Appreciation",
    description:
      "Feeling that your feelings, choices, opinions and dignity are treated with consideration.",
    subNeeds: ["dignity", "consideration", "being taken seriously"],
  },
  {
    id: "appreciation",
    name: "Appreciation",
    category: "Respect & Appreciation",
    description: "Feeling that what you contribute to the relationship is noticed and valued.",
    subNeeds: ["gratitude", "acknowledgment", "recognition"],
  },
  {
    id: "admiration",
    name: "Admiration",
    category: "Respect & Appreciation",
    description: "Feeling that your partner sees qualities in you they genuinely respect and admire.",
    subNeeds: ["praise", "pride", "positive regard"],
  },
  {
    id: "acceptance",
    name: "Acceptance",
    category: "Respect & Appreciation",
    description: "Feeling loved as the person you are rather than constantly needing to change.",
    subNeeds: ["non-judgment", "imperfections", "authenticity"],
  },
  {
    id: "being-prioritized",
    name: "Being Prioritized",
    category: "Respect & Appreciation",
    description:
      "Feeling like a priority in your partner's time and decisions rather than an afterthought.",
    subNeeds: ["making time", "being considered", "not coming last", "protected time"],
  },

  // 🫂 Connection & Togetherness — closeness, presence and a sense of "us"
  {
    id: "emotional-closeness",
    name: "Emotional Closeness",
    category: "Connection & Togetherness",
    description:
      "Feeling deeply connected by openly sharing your inner world without needing to protect yourself.",
    subNeeds: ["vulnerability", "sharing feelings", "fears and hopes", "being let in"],
  },
  {
    id: "emotional-support",
    name: "Emotional Support",
    category: "Connection & Togetherness",
    description: "Knowing your partner will be there emotionally when life becomes difficult.",
    subNeeds: ["comfort", "encouragement", "compassion", "having your back"],
  },
  {
    id: "emotional-presence",
    name: "Emotional Presence",
    category: "Connection & Togetherness",
    description: "Having your partner truly present and emotionally available when you're together.",
    subNeeds: ["attention", "availability", "responsiveness", "phone down"],
  },
  {
    id: "quality-time",
    name: "Quality Time",
    category: "Connection & Togetherness",
    description: "Having meaningful, undistracted time together that strengthens your bond.",
    subNeeds: ["dates", "conversations", "shared moments", "undistracted attention"],
  },
  {
    id: "companionship",
    name: "Companionship",
    category: "Connection & Togetherness",
    description: "Enjoying everyday life together and genuinely liking each other's company.",
    subNeeds: ["friendship", "everyday closeness", "doing life together"],
  },

  // 🕊️ Autonomy & Boundaries — remaining yourself inside the relationship
  {
    id: "autonomy",
    name: "Autonomy",
    category: "Autonomy & Boundaries",
    description: "Being free to make your own choices without needing permission or approval.",
    subNeeds: ["freedom of choice", "agency", "not asking permission", "self-direction"],
  },
  {
    id: "personal-space",
    name: "Personal Space",
    category: "Autonomy & Boundaries",
    description: "Having enough time and space alone to recharge and maintain your own life.",
    subNeeds: ["alone time", "solitude", "room to breathe"],
  },
  {
    id: "individual-identity",
    name: "Individual Identity",
    category: "Autonomy & Boundaries",
    description:
      "Remaining connected to your own interests, friendships and identity while being a couple.",
    subNeeds: ["hobbies", "friends", "self-expression", "identity"],
  },
  {
    id: "boundaries",
    name: "Boundaries",
    category: "Autonomy & Boundaries",
    description: "Having your personal limits recognized and respected without punishment or pressure.",
    subNeeds: ["saying no", "privacy", "physical and emotional limits"],
  },
  {
    id: "financial-independence",
    name: "Financial Independence",
    category: "Autonomy & Boundaries",
    description: "Having money and spending you control yourself, without needing to justify it.",
    subNeeds: ["own income", "discretionary spending", "financial agency"],
  },

  // 🌱 Growth & Exploration — developing, playing and discovering
  {
    id: "mutual-growth",
    name: "Mutual Growth",
    category: "Growth & Exploration",
    description: "Actively supporting each other's development rather than holding one another back.",
    subNeeds: ["encouragement", "cheering each other on", "supporting goals"],
  },
  {
    id: "personal-growth",
    name: "Personal Growth",
    category: "Growth & Exploration",
    description: "Having room to grow and change as an individual within the relationship.",
    subNeeds: ["room to change", "self-development", "not being held back"],
  },
  {
    id: "fun-playfulness",
    name: "Fun & Playfulness",
    category: "Growth & Exploration",
    description: "Laughing, being silly and experiencing lightness together.",
    subNeeds: ["humor", "teasing", "games", "laughter", "play"],
  },
  {
    id: "adventure-novelty",
    name: "Adventure & Novelty",
    category: "Growth & Exploration",
    description: "Experiencing new things together and keeping life from becoming too routine.",
    subNeeds: ["travel", "spontaneity", "new experiences", "breaking routine"],
  },
  {
    id: "curiosity",
    name: "Curiosity",
    category: "Growth & Exploration",
    description: "Being mentally engaged by each other — interesting conversation and new ideas.",
    subNeeds: ["interesting conversation", "new ideas", "learning together", "mental spark"],
  },

  // 🏡 Partnership & Shared Life — building something together
  {
    id: "teamwork",
    name: "Teamwork",
    category: "Partnership & Shared Life",
    description: "Feeling that you and your partner face life as allies rather than as opponents.",
    subNeeds: ["cooperation", "problem-solving", "being on the same side"],
  },
  {
    id: "commitment",
    name: "Commitment",
    category: "Partnership & Shared Life",
    description: "Knowing your partner actively chooses the relationship and intends to invest in it.",
    subNeeds: ["dedication", "choosing each other", "long-term intent"],
  },
  {
    id: "fairness",
    name: "Fairness",
    category: "Partnership & Shared Life",
    description:
      "Feeling that responsibilities and decisions are balanced, with an equal say in what affects you both.",
    subNeeds: ["balanced workload", "give-and-take", "equal say", "joint decisions"],
  },
  {
    id: "practical-support",
    name: "Practical Support",
    category: "Partnership & Shared Life",
    description: "Knowing your partner will step in and help when you need it.",
    subNeeds: ["helping", "sharing responsibilities", "acts of service"],
  },
  {
    id: "shared-future",
    name: "Shared Future",
    category: "Partnership & Shared Life",
    description:
      "Moving toward a compatible vision of life together — values, family, money and purpose pointing the same way.",
    subNeeds: [
      "future plans",
      "shared values",
      "family and parenting",
      "money compatibility",
      "shared purpose",
    ],
  },
];
