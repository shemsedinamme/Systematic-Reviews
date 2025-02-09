// ChartComponent.jsx ( must put all Chart library implementations in that components ,
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS ,
    CategoryScale,
   LinearScale,
     BarElement,
    Title,
  Tooltip,
  Legend}  from 'chart.js';
    ChartJS.register(
     CategoryScale,
      LinearScale,
     BarElement,
     Title,
     Tooltip,
     Legend
      );

const ChartComponent = ({ chartData, chartOptions  }) => {
    if (!chartData)  return <p>No chart data available.</p>
    if (Object.keys(chartData).length === 0 )   return <p>No valid object data for chart.</p>;

    const  defaultChartOption = { // for a default configurations
            responsive : true ,
               plugins: {
            legend: {
                 position: 'top' ,  // option config from client ( can make as generic via props to override specific options for the charts. like chartTitle color etc ). such that library option will not have to reimplement that. as Chart.js options follows general conventions based style usage.. such chart settings etc must come with object as configurations

            },
          } ,
    };
        const options =  chartOptions  ? {... defaultChartOption, ... chartOptions }  : defaultChartOption;  // override client sent params or just return default


 return (
     <div style={{ maxWidth:'700px', margin:'0px auto'}}>
        <Bar  data = {chartData} options = {options}/>
     </div>
   );
 };
 export default ChartComponent;