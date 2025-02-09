interface DataSynthesisResult {
  synthesis_id: string;
  project_id: string;
  synthesis_type: 'meta-analysis' | 'narrative' | 'qualitative' | 'network-meta-analysis';
  synthesis_description: string;
  created_at: string;
}