export interface ChapterDefinition {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  position: number;
}

/**
 * The default shape of a life story.
 *
 * Users can rename, reorder and delete these — they are a starting point, not
 * a cage. Every slug here is referenced by the prompt library, so changing a
 * slug means changing the prompts that point at it.
 */
export const DEFAULT_CHAPTERS: ChapterDefinition[] = [
  {
    slug: "roots",
    title: "Roots & Beginnings",
    description: "Where you come from — the people and places that existed before you did.",
    emoji: "🌱",
    position: 0,
  },
  {
    slug: "childhood",
    title: "Childhood",
    description: "The rooms, smells, games and small freedoms of being small.",
    emoji: "🧸",
    position: 1,
  },
  {
    slug: "family",
    title: "Family",
    description: "The people who shaped you, for better and for worse.",
    emoji: "🏡",
    position: 2,
  },
  {
    slug: "school-days",
    title: "School Days",
    description: "Classrooms, corridors, teachers, and the day you realised something about yourself.",
    emoji: "🎒",
    position: 3,
  },
  {
    slug: "turning-points",
    title: "Turning Points",
    description: "The decisions that quietly redirected everything.",
    emoji: "🌀",
    position: 4,
  },
  {
    slug: "work-and-craft",
    title: "Work & Craft",
    description: "What you have made, built, fixed and been paid to do.",
    emoji: "🛠️",
    position: 5,
  },
  {
    slug: "love",
    title: "Love & Companionship",
    description: "The people you chose, and the people who chose you.",
    emoji: "💛",
    position: 6,
  },
  {
    slug: "friendships",
    title: "Friendships",
    description: "The ones who were there, the ones who drifted, the ones you still call.",
    emoji: "🤝",
    position: 7,
  },
  {
    slug: "places",
    title: "Places & Travels",
    description: "Homes, cities, roads and the landscapes that live in your body.",
    emoji: "🗺️",
    position: 8,
  },
  {
    slug: "hard-seasons",
    title: "The Hard Seasons",
    description: "What you survived, and what it cost.",
    emoji: "🌧️",
    position: 9,
  },
  {
    slug: "joy-and-play",
    title: "Joy & Play",
    description: "The things you did purely because they made you feel alive.",
    emoji: "🎈",
    position: 10,
  },
  {
    slug: "beliefs",
    title: "Beliefs & Values",
    description: "What you actually believe, once you strip away what you were told to believe.",
    emoji: "⚖️",
    position: 11,
  },
  {
    slug: "ordinary-days",
    title: "Ordinary Days",
    description: "The texture of a normal Tuesday — the details that vanish first.",
    emoji: "☕",
    position: 12,
  },
  {
    slug: "what-i-know-now",
    title: "What I Know Now",
    description: "Advice you earned rather than read.",
    emoji: "🕯️",
    position: 13,
  },
  {
    slug: "letters",
    title: "Letters to the Future",
    description: "Things to say to people who have not been born yet.",
    emoji: "✉️",
    position: 14,
  },
];
