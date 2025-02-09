interface PublicationBiasAssessment {
  bias_id: string;
   synthesis_id: string;
  funnel_plot_data: any;  // Data points to be use by plotting component ( all objects ). that should return format (as list ) of funnel point based objects and plotted with json based config by `ChartJS` type objects
  eggers_test_p: number; //
  trim_and_fill_data: any;// Imputated point for adjusted estimates ( such list is a `[ {},{}...]`).
}