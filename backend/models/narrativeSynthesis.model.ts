interface NarrativeSynthesisResult {
  narrative_id: string;
  synthesis_id: string;
  narrative_summary: string; // Main summary part for Narrative (as a textual formated response) for narrative modules implementation. it can contain main and supporting data etc that forms the string . such objects should implement a .toJSON ( method ) to transform the json response for text view also. which is key part of implementations
}