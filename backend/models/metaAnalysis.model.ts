interface MetaAnalysisResult {
    meta_id: string;
    synthesis_id: string;
    outcome: string;
    model_type: 'fixed-effect' | 'random-effects';
    pooled_estimate: number;
    heterogeneity_i2: number;
    forest_plot_data: any; // Assuming JSON
    subgroup_analysis_data: any; // Assuming JSON
  }