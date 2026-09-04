export interface PromptDefinition {
  slug: string;
  chapterSlug: string | null;
  question: string;
  followUp?: string;
  category: string;
  position: number;
}

/**
 * A library of memoir prompts.
 *
 * The rule we followed when writing these: no prompt should be answerable in
 * one word. Each one opens a door onto a scene, and the follow-up asks for a
 * sensory detail — which is the part that makes a memory survive.
 */
export const DEFAULT_PROMPTS: PromptDefinition[] = [
  // ---------------------------------------------------------------- roots
  {
    slug: "roots-house",
    chapterSlug: "roots",
    question: "Describe the house you were born in, or the first house you remember.",
    followUp: "What did it smell like when you walked in?",
    category: "roots",
    position: 0,
  },
  {
    slug: "roots-grandparents",
    chapterSlug: "roots",
    question:
      "What do you know about your grandparents, and what do you wish someone had written down about them?",
    category: "roots",
    position: 1,
  },
  {
    slug: "roots-family-stories",
    chapterSlug: "roots",
    question: "Which story about your family got told so often it became legend?",
    followUp: "Do you suspect it was entirely true?",
    category: "roots",
    position: 2,
  },
  {
    slug: "roots-name",
    chapterSlug: "roots",
    question: "Who chose your name, and what were you almost called instead?",
    category: "roots",
    position: 3,
  },
  {
    slug: "roots-migration",
    chapterSlug: "roots",
    question: "Has anyone in your family left everything behind and started somewhere new?",
    followUp: "What did they carry with them?",
    category: "roots",
    position: 4,
  },
  {
    slug: "roots-photograph",
    chapterSlug: "roots",
    question: "Is there one old photograph of your family that you could describe for an hour?",
    followUp: "Who is missing from it, and why?",
    category: "roots",
    position: 5,
  },

  // ------------------------------------------------------------ childhood
  {
    slug: "childhood-room",
    chapterSlug: "childhood",
    question: "What did your bedroom look like when you were eight?",
    followUp: "What was on the walls?",
    category: "childhood",
    position: 0,
  },
  {
    slug: "childhood-sounds",
    chapterSlug: "childhood",
    question: "What sounds did you wake up to as a child?",
    category: "childhood",
    position: 1,
  },
  {
    slug: "childhood-fear",
    chapterSlug: "childhood",
    question: "What were you afraid of that no longer frightens you — and what still does?",
    category: "childhood",
    position: 2,
  },
  {
    slug: "childhood-game",
    chapterSlug: "childhood",
    question: "What did you play when there was nothing to play with?",
    category: "childhood",
    position: 3,
  },
  {
    slug: "childhood-first-memory",
    chapterSlug: "childhood",
    question: "What is your earliest memory, and how sure are you that it is real?",
    category: "childhood",
    position: 4,
  },
  {
    slug: "childhood-told-off",
    chapterSlug: "childhood",
    question: "What is the worst thing you got in trouble for as a child?",
    followUp: "Were you actually guilty?",
    category: "childhood",
    position: 5,
  },

  // --------------------------------------------------------------- family
  {
    slug: "family-mother",
    chapterSlug: "family",
    question:
      "What is a small, specific thing your mother or primary caregiver did that you still catch yourself doing?",
    category: "family",
    position: 0,
  },
  {
    slug: "family-father",
    chapterSlug: "family",
    question: "What did your father or father-figure teach you without meaning to?",
    category: "family",
    position: 1,
  },
  {
    slug: "family-sibling",
    chapterSlug: "family",
    question: "What was your relationship with your siblings like at ten, and what is it like now?",
    category: "family",
    position: 2,
  },
  {
    slug: "family-table",
    chapterSlug: "family",
    question: "What happened at mealtimes in your house?",
    followUp: "Who talked, who cooked, who cleared the table?",
    category: "family",
    position: 3,
  },
  {
    slug: "family-unspoken",
    chapterSlug: "family",
    question: "What was never discussed in your family when you were growing up?",
    category: "family",
    position: 4,
  },
  {
    slug: "family-forgiveness",
    chapterSlug: "family",
    question:
      "Is there something a family member did that you have come to understand differently with time?",
    category: "family",
    position: 5,
  },

  // ---------------------------------------------------------- school days
  {
    slug: "school-teacher",
    chapterSlug: "school-days",
    question: "Which teacher changed the direction of your life, and what exactly did they say?",
    category: "school",
    position: 0,
  },
  {
    slug: "school-day",
    chapterSlug: "school-days",
    question: "Walk us through a completely ordinary school day, start to finish.",
    category: "school",
    position: 1,
  },
  {
    slug: "school-subject",
    chapterSlug: "school-days",
    question: "What were you good at in school, and what were you told you were good at?",
    followUp: "Were those the same thing?",
    category: "school",
    position: 2,
  },
  {
    slug: "school-friend-group",
    chapterSlug: "school-days",
    question: "Where did you sit, and with whom?",
    category: "school",
    position: 3,
  },
  {
    slug: "school-leaving",
    chapterSlug: "school-days",
    question: "What did you think your life would look like on the day you left education?",
    category: "school",
    position: 4,
  },
  {
    slug: "school-injustice",
    chapterSlug: "school-days",
    question: "What is the most unfair thing that happened to you at school?",
    category: "school",
    position: 5,
  },

  // ------------------------------------------------------- turning points
  {
    slug: "turning-decision",
    chapterSlug: "turning-points",
    question: "What is the biggest decision you made quickly, without weighing it up?",
    category: "turning-points",
    position: 0,
  },
  {
    slug: "turning-sliding-door",
    chapterSlug: "turning-points",
    question: "Describe a moment where your life nearly went a different way.",
    followUp: "Who is the version of you that took the other door?",
    category: "turning-points",
    position: 1,
  },
  {
    slug: "turning-chance",
    chapterSlug: "turning-points",
    question: "What happened to you entirely by luck?",
    category: "turning-points",
    position: 2,
  },
  {
    slug: "turning-regret",
    chapterSlug: "turning-points",
    question: "What did you not do, and still think about?",
    category: "turning-points",
    position: 3,
  },
  {
    slug: "turning-advice",
    chapterSlug: "turning-points",
    question: "What is the best piece of advice you ever ignored?",
    category: "turning-points",
    position: 4,
  },
  {
    slug: "turning-before-after",
    chapterSlug: "turning-points",
    question: "Split your life into 'before' and 'after'. Where does the line fall?",
    category: "turning-points",
    position: 5,
  },

  // ------------------------------------------------------- work and craft
  {
    slug: "work-first-job",
    chapterSlug: "work-and-craft",
    question: "What was your first paid job, and how much did it pay?",
    followUp: "What did you spend the first paycheque on?",
    category: "work",
    position: 0,
  },
  {
    slug: "work-proud",
    chapterSlug: "work-and-craft",
    question: "What piece of work are you proudest of, and did anyone notice at the time?",
    category: "work",
    position: 1,
  },
  {
    slug: "work-mentor",
    chapterSlug: "work-and-craft",
    question: "Who taught you how to work?",
    category: "work",
    position: 2,
  },
  {
    slug: "work-failure",
    chapterSlug: "work-and-craft",
    question: "What professional failure did you learn the most from?",
    category: "work",
    position: 3,
  },
  {
    slug: "work-quit",
    chapterSlug: "work-and-craft",
    question: "Have you ever walked away from something? What finally made you leave?",
    category: "work",
    position: 4,
  },
  {
    slug: "work-craft",
    chapterSlug: "work-and-craft",
    question: "What do you do that you would do for free?",
    category: "work",
    position: 5,
  },

  // ----------------------------------------------------------------- love
  {
    slug: "love-first",
    chapterSlug: "love",
    question: "Who was your first love, and how old were you?",
    followUp: "What did they smell like?",
    category: "love",
    position: 0,
  },
  {
    slug: "love-meeting",
    chapterSlug: "love",
    question: "How did you meet the person who matters most to you?",
    followUp: "What was your first impression — the honest one?",
    category: "love",
    position: 1,
  },
  {
    slug: "love-argue",
    chapterSlug: "love",
    question: "What do you argue about, and how do you make up?",
    category: "love",
    position: 2,
  },
  {
    slug: "love-ordinary-moment",
    chapterSlug: "love",
    question: "What is an unremarkable moment with someone you love that you would keep forever?",
    category: "love",
    position: 3,
  },
  {
    slug: "love-heartbreak",
    chapterSlug: "love",
    question: "What did heartbreak teach you that happiness could not?",
    category: "love",
    position: 4,
  },
  {
    slug: "love-love-means",
    chapterSlug: "love",
    question: "Finish the sentence: love is ________.",
    category: "love",
    position: 5,
  },

  // ---------------------------------------------------------- friendships
  {
    slug: "friends-oldest",
    chapterSlug: "friendships",
    question: "Who is your oldest friend, and what is the earliest thing you remember doing together?",
    category: "friendships",
    position: 0,
  },
  {
    slug: "friends-lost",
    chapterSlug: "friendships",
    question: "Which friendship ended without a fight, and do you still wonder why?",
    category: "friendships",
    position: 1,
  },
  {
    slug: "friends-laughed",
    chapterSlug: "friendships",
    question: "What is the hardest you have ever laughed?",
    followUp: "Where were you standing?",
    category: "friendships",
    position: 2,
  },
  {
    slug: "friends-showed-up",
    chapterSlug: "friendships",
    question: "Who showed up for you when things fell apart?",
    category: "friendships",
    position: 3,
  },
  {
    slug: "friends-kind",
    chapterSlug: "friendships",
    question: "What is the kindest thing a friend has ever done for you?",
    category: "friendships",
    position: 4,
  },
  {
    slug: "friends-thanks",
    chapterSlug: "friendships",
    question: "Who deserves a thank-you that you have never quite given them?",
    category: "friendships",
    position: 5,
  },

  // --------------------------------------------------------------- places
  {
    slug: "places-home",
    chapterSlug: "places",
    question: "Of every place you have lived, which one felt most like yours?",
    category: "places",
    position: 0,
  },
  {
    slug: "places-journey",
    chapterSlug: "places",
    question: "Describe a journey you have taken so many times you could do it asleep.",
    category: "places",
    position: 1,
  },
  {
    slug: "places-left-behind",
    chapterSlug: "places",
    question: "What place do you miss that no longer exists?",
    category: "places",
    position: 2,
  },
  {
    slug: "places-stranger",
    chapterSlug: "places",
    question: "When did you first feel like a stranger somewhere?",
    category: "places",
    position: 3,
  },
  {
    slug: "places-window",
    chapterSlug: "places",
    question: "What was the view out of your window at the most important address of your life?",
    category: "places",
    position: 4,
  },
  {
    slug: "places-return",
    chapterSlug: "places",
    question: "Have you ever gone back somewhere and found it smaller than you remembered?",
    category: "places",
    position: 5,
  },

  // --------------------------------------------------------- hard seasons
  {
    slug: "hard-longest-night",
    chapterSlug: "hard-seasons",
    question: "What is the hardest thing you have been through that you rarely talk about?",
    category: "hard-seasons",
    position: 0,
  },
  {
    slug: "hard-got-through",
    chapterSlug: "hard-seasons",
    question: "How did you get through it, day by day?",
    category: "hard-seasons",
    position: 1,
  },
  {
    slug: "hard-loss",
    chapterSlug: "hard-seasons",
    question: "Who have you lost, and what do you still want to tell them?",
    category: "hard-seasons",
    position: 2,
  },
  {
    slug: "hard-lonely",
    chapterSlug: "hard-seasons",
    question: "When were you most alone, and who — if anyone — noticed?",
    category: "hard-seasons",
    position: 3,
  },
  {
    slug: "hard-changed",
    chapterSlug: "hard-seasons",
    question: "How did the hardest season change what you believe about people?",
    category: "hard-seasons",
    position: 4,
  },
  {
    slug: "hard-kindness",
    chapterSlug: "hard-seasons",
    question: "What small act of kindness carried you through a bad year?",
    category: "hard-seasons",
    position: 5,
  },

  // --------------------------------------------------------- joy and play
  {
    slug: "joy-lost-hours",
    chapterSlug: "joy-and-play",
    question: "What activity makes you lose all track of time?",
    category: "joy",
    position: 0,
  },
  {
    slug: "joy-music",
    chapterSlug: "joy-and-play",
    question: "What song takes you straight back to a specific year?",
    followUp: "Where were you the first time you heard it?",
    category: "joy",
    position: 1,
  },
  {
    slug: "joy-food",
    chapterSlug: "joy-and-play",
    question: "What is the best meal you have ever eaten, and who made it?",
    category: "joy",
    position: 2,
  },
  {
    slug: "joy-weather",
    chapterSlug: "joy-and-play",
    question: "What is your favourite kind of weather, and what does it make you want to do?",
    category: "joy",
    position: 3,
  },
  {
    slug: "joy-silly",
    chapterSlug: "joy-and-play",
    question: "What do you find funny that other people do not?",
    category: "joy",
    position: 4,
  },
  {
    slug: "joy-body",
    chapterSlug: "joy-and-play",
    question: "What has your body been able to do that impressed you?",
    category: "joy",
    position: 5,
  },

  // ------------------------------------------------------------- beliefs
  {
    slug: "beliefs-changed-mind",
    chapterSlug: "beliefs",
    question: "What did you believe at twenty that you no longer believe?",
    followUp: "What changed your mind?",
    category: "beliefs",
    position: 0,
  },
  {
    slug: "beliefs-unchanged",
    chapterSlug: "beliefs",
    question: "What have you believed your whole life without ever doubting it?",
    category: "beliefs",
    position: 1,
  },
  {
    slug: "beliefs-money",
    chapterSlug: "beliefs",
    question: "What is your honest relationship with money, and where did you learn it?",
    category: "beliefs",
    position: 2,
  },
  {
    slug: "beliefs-wrong",
    chapterSlug: "beliefs",
    question: "What is a belief you hold that most people you know would disagree with?",
    category: "beliefs",
    position: 3,
  },
  {
    slug: "beliefs-duty",
    chapterSlug: "beliefs",
    question: "What do you believe you owe other people?",
    category: "beliefs",
    position: 4,
  },
  {
    slug: "beliefs-ritual",
    chapterSlug: "beliefs",
    question: "Do you have any rituals — daily, weekly, seasonal? Where did they come from?",
    category: "beliefs",
    position: 5,
  },

  // ------------------------------------------------------- ordinary days
  {
    slug: "ordinary-morning",
    chapterSlug: "ordinary-days",
    question: "Describe your morning in detail, as though instructing someone from another century.",
    category: "ordinary",
    position: 0,
  },
  {
    slug: "ordinary-object",
    chapterSlug: "ordinary-days",
    question: "What ordinary object from your daily life will not exist in fifty years?",
    category: "ordinary",
    position: 1,
  },
  {
    slug: "ordinary-commute",
    chapterSlug: "ordinary-days",
    question: "What do you think about on the way to work, or while waiting for something?",
    category: "ordinary",
    position: 2,
  },
  {
    slug: "ordinary-shop",
    chapterSlug: "ordinary-days",
    question: "What did the shops, streets or screens look like when you were a child, compared to now?",
    category: "ordinary",
    position: 3,
  },
  {
    slug: "ordinary-phrase",
    chapterSlug: "ordinary-days",
    question: "What words or phrases do you use that younger people do not?",
    category: "ordinary",
    position: 4,
  },
  {
    slug: "ordinary-evening",
    chapterSlug: "ordinary-days",
    question: "How does a good day end for you?",
    category: "ordinary",
    position: 5,
  },

  // --------------------------------------------------- what I know now
  {
    slug: "know-younger-self",
    chapterSlug: "what-i-know-now",
    question: "What would you tell yourself at twenty-five, knowing what you know now?",
    category: "wisdom",
    position: 0,
  },
  {
    slug: "know-wasted",
    chapterSlug: "what-i-know-now",
    question: "What did you spend years worrying about that turned out not to matter?",
    category: "wisdom",
    position: 1,
  },
  {
    slug: "know-cost",
    chapterSlug: "what-i-know-now",
    question: "What does success actually cost, in your experience?",
    category: "wisdom",
    position: 2,
  },
  {
    slug: "know-kindness",
    chapterSlug: "what-i-know-now",
    question: "What is the most useful thing anyone ever told you about dealing with people?",
    category: "wisdom",
    position: 3,
  },
  {
    slug: "know-habit",
    chapterSlug: "what-i-know-now",
    question: "What small habit has paid you back more than anything else?",
    category: "wisdom",
    position: 4,
  },
  {
    slug: "know-enough",
    chapterSlug: "what-i-know-now",
    question: "When did you first feel like a real adult — and do you feel like one now?",
    category: "wisdom",
    position: 5,
  },

  // -------------------------------------------------------------- letters
  {
    slug: "letters-grandchild",
    chapterSlug: "letters",
    question:
      "Write to a grandchild you may never meet. What do you want them to know about where they came from?",
    category: "letters",
    position: 0,
  },
  {
    slug: "letters-untold",
    chapterSlug: "letters",
    question: "What have you never said out loud to someone who is still alive?",
    category: "letters",
    position: 1,
  },
  {
    slug: "letters-apology",
    chapterSlug: "letters",
    question: "Who do you owe an apology, and what would you say if pride were not a factor?",
    category: "letters",
    position: 2,
  },
  {
    slug: "letters-gratitude",
    chapterSlug: "letters",
    question: "Write a thank-you letter to someone who has no idea how much they mattered.",
    category: "letters",
    position: 3,
  },
  {
    slug: "letters-remembered",
    chapterSlug: "letters",
    question: "What do you want to be remembered for — honestly, not the polished answer?",
    category: "letters",
    position: 4,
  },
  {
    slug: "letters-things",
    chapterSlug: "letters",
    question: "If someone had to sort through your belongings one day, what should they keep, and why?",
    category: "letters",
    position: 5,
  },
];

/** Prompts shown on the dashboard when a writer does not know where to start. */
export const FEATURED_PROMPT_SLUGS = [
  "childhood-room",
  "turning-sliding-door",
  "love-ordinary-moment",
  "know-younger-self",
  "letters-grandchild",
];
