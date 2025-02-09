interface NetworkMetaAnalysisResult {
  network_id: string;
  synthesis_id: string;
  comparison_matrix: any; // Expected to be structured for representing treatment comparisons.
   network_plot_data: any; // Assumed JSON ( chart lib compatible format of plotted chart points to render in front) . all meta chart must render using generic plot points (json) along the data object so chart renders easily by reading proper data field or properties . also this object might need map into `Chart.js` like `( {datasets : {[] } ,  labels []}, )`
}