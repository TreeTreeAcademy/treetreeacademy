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
  next_4_weeks: string;
  after_stage1: string;
  tools_this_week: string;
}

export interface Stage {
  day_note: string;
  success_criteria: string;
  outline: StageOutline;
}

export interface Demo {
  story_title: string;
  script: string;
}

export interface DemoUsage {
  three_steps: string[];
  feedback_examples: string[];
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
  stage: Stage;
  demos: Demo[];
  demo_usage: DemoUsage;
}
