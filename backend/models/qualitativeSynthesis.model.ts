interface QualitativeSynthesisResult {
  qualitative_id: string;
  synthesis_id: string;
  coding_scheme: any;  // Assuming JSON object for flexible coding structures.
  meta_aggregation_results: any; //JSON format output data for aggregation of qualitative codes (or meta aggregation object, data mapping if used).
  thematic_analysis_results: any;  // results from each thematic anlysis for a group (e.g object contains  { theme: string, support : any[strings], codes :any[]} for example) for different results
}