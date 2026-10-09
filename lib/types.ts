export interface Theme {
  category: string;
  title: string;
}

export interface Story {
  title: string;
  gist: string;
}

export interface QuestionItem {
  q: string;
  answer_hint: string;
}

export interface StoryQuestions {
  story_title: string;
  items: QuestionItem[];
  bonus?: QuestionItem;
}

export interface StageOutline {
  now: string;
  /** Standing rule: every retelling covers 问题→办法→结果, at every stage. */
  core_rule?: string;
  next_4_weeks: string;
  after_stage1: string;
  tools_this_week: string;
}

export interface Stage {
  day_note: string;
  success_criteria: string;
  outline: StageOutline;
}

/**
 * 复述核心: every story's retelling must touch 遇到什么问题 / 想到什么办法 / 结果怎样.
 * For a poetic story with no real conflict, set `labels` (e.g. 想做什么/发生了什么/最后怎样).
 */
export interface StoryCore {
  story_title: string;
  problem: string;
  solution: string;
  result: string;
  labels?: [string, string, string];
}

export const CORE_RULE_DEFAULT =
  "不论哪个阶段，复述都要说清「遇到什么问题→想到什么办法→结果怎样」。";

export interface Demo {
  story_title: string;
  script: string;
}

export interface DemoUsage {
  three_steps: string[];
  feedback_examples: string[];
}

/** Distilled parent-facing listening beats — not full book/audio text. */
export interface StoryTranscript {
  story_title: string;
  note?: string; // e.g. 提炼要点·非绘本全文
  beats: string[]; // ordered listening beats
}

export interface Episode {
  slug: string;
  episode: number;
  date: string;
  themes: Theme[];
  source_url: string;
  stories: Story[];
  questions_method: string;
  questions: StoryQuestions[];
  /** 复述核心 per story (fill for every episode). */
  cores?: StoryCore[];
  stage: Stage;
  demos: Demo[];
  demo_usage: DemoUsage;
  transcripts: StoryTranscript[];
}
