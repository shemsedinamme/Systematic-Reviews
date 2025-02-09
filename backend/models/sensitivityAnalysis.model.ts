interface SensitivityAnalysisResult {
  sensitivity_id: string;
   synthesis_id: string;
   analysis_type: string;  // Description
    analysis_description: string; // Details to perform a set or all operation in sensitivity type for implementation specific actions, it describes if leave-one out, or by other filtering criteria ( type String) based criteria on UI) or all or particular combination ( type Array<String> ), or null if its default behaviour is applicable etc for particular study for Meta implementation
   analysis_results: any; // Results to render ( e.g JSON chart point format like an array object ). and chart libraries, so that data for results of sensitivity gets plotted in UI
}