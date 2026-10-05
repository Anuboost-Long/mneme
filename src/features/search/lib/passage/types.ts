export type Passage = { position: number; text: string; vector: Float32Array };

export type PageToIndex = { id: number; title: string; content: string | null; updated_at: string };

export type SearchablePassage = {
  page_id: number;
  page_title: string;
  module_id: number;
  course_id: number;
  text: string;
  vector: Float32Array;
};

export type PassageMatch = Omit<SearchablePassage, "vector"> & { score: number };
