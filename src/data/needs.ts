export type NeedCategory =
  | "Love"
  | "Connection"
  | "Security"
  | "Respect"
  | "Communication"
  | "Intimacy"
  | "Autonomy"
  | "Partnership"
  | "Togetherness"
  | "Future";

export const CATEGORY_EMOJI: Record<NeedCategory, string> = {
  Love: "❤️",
  Connection: "💜",
  Security: "🔐",
  Respect: "🙏",
  Communication: "🗣️",
  Intimacy: "🔥",
  Autonomy: "🌱",
  Partnership: "🤝",
  Togetherness: "🎉",
  Future: "🧭",
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
  // Love
  {
    id: "affection",
    name: "Affection",
    category: "Love",
    description: "Feeling loved through tenderness, touch and everyday physical closeness.",
    subNeeds: ["hugs", "cuddling", "kissing", "holding hands", "tenderness"],
  },
  {
    id: "romance",
    name: "Romance",
    category: "Love",
    description: "Feeling that your relationship is intentionally kept romantic and special.",
    subNeeds: ["dates", "surprises", "romantic gestures", "thoughtful moments"],
  },
  {
    id: "feeling-cherished",
    name: "Feeling Cherished",
    category: "Love",
    description: "Feeling deeply precious and important to your partner.",
    subNeeds: ["being treasured", "loving attention", "care", "being prioritized"],
  },
  {
    id: "feeling-desired",
    name: "Feeling Desired",
    category: "Love",
    description: "Feeling attractive, wanted and actively chosen by your partner.",
    subNeeds: ["attraction", "flirting", "compliments", "being pursued"],
  },

  // Connection
  {
    id: "emotional-intimacy",
    name: "Emotional Intimacy",
    category: "Connection",
    description: "Feeling deeply connected through openly sharing your inner worlds.",
    subNeeds: ["vulnerability", "feelings", "fears", "hopes", "emotional closeness"],
  },
  {
    id: "feeling-understood",
    name: "Feeling Understood",
    category: "Connection",
    description:
      "Feeling that your partner genuinely understands who you are and how you experience things.",
    subNeeds: ["empathy", "perspective-taking", "emotional understanding"],
  },
  {
    id: "emotional-support",
    name: "Emotional Support",
    category: "Connection",
    description: "Knowing your partner will emotionally be there when life becomes difficult.",
    subNeeds: ["comfort", "encouragement", "reassurance", "compassion"],
  },
  {
    id: "emotional-presence",
    name: "Emotional Presence",
    category: "Connection",
    description:
      "Having your partner truly present and emotionally available when you're together.",
    subNeeds: ["attention", "availability", "responsiveness", "engagement"],
  },
  {
    id: "vulnerability",
    name: "Vulnerability",
    category: "Connection",
    description:
      "Being able to reveal your fears, insecurities and softer parts without needing to protect yourself.",
    subNeeds: ["openness", "authenticity", "sharing difficult emotions"],
  },

  // Security
  {
    id: "trust",
    name: "Trust",
    category: "Security",
    description: "Feeling confident that you can rely on your partner and believe what they tell you.",
    subNeeds: ["credibility", "dependability", "good faith"],
  },
  {
    id: "honesty",
    name: "Honesty",
    category: "Security",
    description: "Knowing that important truths are communicated openly, even when uncomfortable.",
    subNeeds: ["truthfulness", "disclosure", "sincerity", "no deception"],
  },
  {
    id: "loyalty",
    name: "Loyalty",
    category: "Security",
    description: "Knowing your partner protects the relationship and remains loyal to your bond.",
    subNeeds: ["fidelity", "allegiance", "protecting the relationship"],
  },
  {
    id: "commitment",
    name: "Commitment",
    category: "Security",
    description: "Knowing your partner actively chooses the relationship and intends to invest in it.",
    subNeeds: ["dedication", "perseverance", "choosing each other"],
  },
  {
    id: "reliability",
    name: "Reliability",
    category: "Security",
    description: "Being able to count on your partner to follow through on what they say.",
    subNeeds: ["consistency", "keeping promises", "dependability"],
  },
  {
    id: "stability",
    name: "Stability",
    category: "Security",
    description: "Experiencing the relationship as steady rather than unpredictable or chaotic.",
    subNeeds: ["predictability", "continuity", "emotional steadiness"],
  },
  {
    id: "reassurance",
    name: "Reassurance",
    category: "Security",
    description: "Receiving confirmation that you are loved, wanted and that the relationship is okay.",
    subNeeds: ["comforting words", "confirmation", "checking in"],
  },

  // Respect
  {
    id: "respect",
    name: "Respect",
    category: "Respect",
    description:
      "Feeling that your feelings, choices, opinions and dignity are treated with consideration.",
    subNeeds: ["dignity", "consideration", "being taken seriously"],
  },
  {
    id: "appreciation",
    name: "Appreciation",
    category: "Respect",
    description: "Feeling that what you contribute to the relationship is noticed and valued.",
    subNeeds: ["gratitude", "acknowledgment", "recognition"],
  },
  {
    id: "admiration",
    name: "Admiration",
    category: "Respect",
    description: "Feeling that your partner sees qualities in you they genuinely respect and admire.",
    subNeeds: ["praise", "pride", "positive regard"],
  },
  {
    id: "acceptance",
    name: "Acceptance",
    category: "Respect",
    description: "Feeling loved as the person you are rather than constantly needing to change.",
    subNeeds: ["non-judgment", "imperfections", "authenticity"],
  },
  {
    id: "validation",
    name: "Validation",
    category: "Respect",
    description: "Feeling that your emotions and experiences are acknowledged as real and meaningful.",
    subNeeds: ["emotional acknowledgment", "legitimacy", "empathy"],
  },

  // Communication
  {
    id: "open-communication",
    name: "Open Communication",
    category: "Communication",
    description: "Being able to talk freely and honestly about what matters.",
    subNeeds: ["openness", "difficult conversations", "sharing concerns"],
  },
  {
    id: "feeling-heard",
    name: "Feeling Heard",
    category: "Communication",
    description:
      "Knowing your partner genuinely listens instead of dismissing, interrupting or immediately defending.",
    subNeeds: ["active listening", "attention", "curiosity"],
  },
  {
    id: "conflict-safety",
    name: "Conflict Safety",
    category: "Communication",
    description: "Being able to disagree without cruelty, intimidation or emotional destruction.",
    subNeeds: ["calm disagreement", "no contempt", "emotional regulation"],
  },
  {
    id: "repair",
    name: "Repair",
    category: "Communication",
    description:
      "Knowing that after hurt or conflict, both partners work to reconnect and make things right.",
    subNeeds: ["apologies", "accountability", "forgiveness", "reconnection"],
  },
  {
    id: "clarity",
    name: "Clarity",
    category: "Communication",
    description:
      "Knowing where you stand instead of having to guess what your partner thinks, feels or wants.",
    subNeeds: ["directness", "expectations", "intentions", "certainty"],
  },

  // Intimacy
  {
    id: "sexual-intimacy",
    name: "Sexual Intimacy",
    category: "Intimacy",
    description: "Having a mutually fulfilling sexual connection as part of the relationship.",
    subNeeds: ["sex", "erotic connection", "pleasure", "physical intimacy"],
  },
  {
    id: "passion",
    name: "Passion",
    category: "Intimacy",
    description: "Experiencing erotic energy, excitement and chemistry with your partner.",
    subNeeds: ["chemistry", "desire", "intensity", "sensuality"],
  },
  {
    id: "sexual-openness",
    name: "Sexual Openness",
    category: "Intimacy",
    description: "Being able to communicate desires and explore sexuality together without shame.",
    subNeeds: ["fantasies", "preferences", "experimentation", "communication"],
  },
  {
    id: "sexual-reciprocity",
    name: "Sexual Reciprocity",
    category: "Intimacy",
    description: "Feeling that sexual interest, initiation and pleasure are mutual rather than one-sided.",
    subNeeds: ["initiation", "mutual desire", "giving and receiving"],
  },

  // Autonomy
  {
    id: "autonomy",
    name: "Autonomy",
    category: "Autonomy",
    description: "Having freedom, personal space and the ability to remain yourself within the relationship.",
    subNeeds: ["independence", "choice", "individuality", "freedom"],
  },
  {
    id: "personal-space",
    name: "Personal Space",
    category: "Autonomy",
    description: "Having enough time and space alone to recharge and maintain your own life.",
    subNeeds: ["alone time", "privacy", "boundaries"],
  },
  {
    id: "individual-identity",
    name: "Individual Identity",
    category: "Autonomy",
    description: "Remaining connected to your own interests, friendships and identity while being a couple.",
    subNeeds: ["hobbies", "friends", "self-expression", "identity"],
  },
  {
    id: "boundaries",
    name: "Boundaries",
    category: "Autonomy",
    description: "Having your personal limits recognized and respected without punishment or pressure.",
    subNeeds: ["saying no", "privacy", "physical/emotional limits"],
  },

  // Partnership
  {
    id: "teamwork",
    name: "Teamwork",
    category: "Partnership",
    description: "Feeling that you and your partner face life as allies rather than as opponents.",
    subNeeds: ["cooperation", "problem-solving", "partnership"],
  },
  {
    id: "fairness",
    name: "Fairness",
    category: "Partnership",
    description: "Feeling that responsibilities, sacrifices and compromises are reasonably balanced.",
    subNeeds: ["reciprocity", "workload", "compromise", "give-and-take"],
  },
  {
    id: "practical-support",
    name: "Practical Support",
    category: "Partnership",
    description: "Knowing your partner will step in and help when you need it.",
    subNeeds: ["helping", "responsibilities", "acts of service"],
  },
  {
    id: "shared-decisions",
    name: "Shared Decisions",
    category: "Partnership",
    description: "Having meaningful input into decisions that affect your life together.",
    subNeeds: ["consultation", "equality", "joint decisions"],
  },
  {
    id: "mutual-growth",
    name: "Mutual Growth",
    category: "Partnership",
    description: "Supporting each other's development rather than holding one another back.",
    subNeeds: ["encouragement", "learning", "goals", "self-improvement"],
  },

  // Togetherness
  {
    id: "quality-time",
    name: "Quality Time",
    category: "Togetherness",
    description: "Having meaningful, undistracted time together that strengthens your bond.",
    subNeeds: ["attention", "dates", "conversations", "shared moments"],
  },
  {
    id: "companionship",
    name: "Companionship",
    category: "Togetherness",
    description: "Enjoying everyday life together and genuinely liking each other's company.",
    subNeeds: ["friendship", "everyday closeness", "doing life together"],
  },
  {
    id: "fun-playfulness",
    name: "Fun & Playfulness",
    category: "Togetherness",
    description: "Laughing, being silly and experiencing lightness together.",
    subNeeds: ["humor", "teasing", "games", "laughter", "play"],
  },
  {
    id: "adventure-novelty",
    name: "Adventure & Novelty",
    category: "Togetherness",
    description: "Experiencing new things together and keeping life from becoming too routine.",
    subNeeds: ["travel", "spontaneity", "exploration", "new experiences"],
  },

  // Future
  {
    id: "shared-values",
    name: "Shared Values",
    category: "Future",
    description: "Feeling aligned on the principles and beliefs that guide how you live.",
    subNeeds: ["ethics", "priorities", "lifestyle", "worldview"],
  },
  {
    id: "shared-future",
    name: "Shared Future",
    category: "Future",
    description: "Knowing you are moving toward a compatible vision of life together.",
    subNeeds: ["future plans", "home", "location", "lifestyle"],
  },
  {
    id: "family-alignment",
    name: "Family Alignment",
    category: "Future",
    description: "Sharing compatible expectations about family life and parenting.",
    subNeeds: ["children", "parenting", "extended family", "family priorities"],
  },
  {
    id: "financial-alignment",
    name: "Financial Alignment",
    category: "Future",
    description: "Feeling compatible and secure in how you approach money and financial responsibilities.",
    subNeeds: ["spending", "saving", "security", "financial goals"],
  },
  {
    id: "purpose-meaning",
    name: "Purpose & Meaning",
    category: "Future",
    description: "Feeling that your relationship contributes to a meaningful life you are building together.",
    subNeeds: ["purpose", "shared journey", "contribution", "legacy"],
  },
];
