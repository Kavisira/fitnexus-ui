export interface HelpStep {
  text: string;
}

export interface HelpFaq {
  q: string;
  a: string;
}

export interface HelpSection {
  id: string;
  /** NG-ZORRO (ant-design) icon type, e.g. 'home', 'team'. */
  icon: string;
  title: string;
  /** One-line summary shown in the topic list. */
  summary: string;
  /** Plain-English permission note. */
  whoCanSee: string;
  /** Overview paragraphs. */
  overview: string[];
  steps?: { title: string; items: HelpStep[] }[];
  tips?: string[];
  faqs?: HelpFaq[];
}
