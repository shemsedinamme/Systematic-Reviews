// backend/reportUtils.js
const { jsPDF } = require('jspdf');
const puppeteer = require('puppeteer');
const { convert } = require('html-to-docx');
const exceljs = require('exceljs');
const { Parser } = require('json2csv');
const compromise = require('compromise');
const simpleStatistics = require('simple-statistics');

// Function to generate PDF from HTML content
async function generatePDF(htmlContent, options = { format: 'A4' , margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm'}}) {
  try{
     const browser = await puppeteer.launch();
        const page = await browser.newPage();
       await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
         format: options.format,
          margin: options.margin,
     });
       await browser.close();
       return pdfBuffer;
    }
    catch(e)
    {
        console.error('Error generating PDF:',e);
        throw e; // rethrow error with specific message
    }
}
// Function to generate Word document from HTML content
async function generateWord(htmlContent) {
   try{
       const buffer = await convert(htmlContent, {}, { table: { row: { occurence: 2 } } });
       return buffer;
   } catch (error) {
     console.error('Error generating Word document:', error);
        throw error;
    }
}

// Function to generate Excel file from JSON data
async function generateExcel(data, columns) {
    try{
     const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Sheet 1');
        worksheet.columns = columns.map(col => ({ header: col, key: col, width: 15 }));
        worksheet.addRows(data);

     const buffer = await workbook.xlsx.writeBuffer();
       return buffer
   } catch (error) {
       console.error('Error generating Excel file:', error);
      throw error;
  }
}

// Function to generate CSV from JSON data
async function generateCSV(data, fields) {
    try {
        const parser = new Parser({ fields });
        const csv = parser.parse(data);
        return csv;
    } catch (error) {
        console.error('Error generating CSV:', error);
        throw error;
    }
}

// Function to generate XML (example, can be adapted for specific XML formats)
async function generateXML(data) {
    try {
         let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>';
           for (const item of data) {
               for (const key in item) {
                xml += `\n  <${key}>${item[key]}</${key}>`;
             }
        }
       xml+= '\n</data>'
       return xml;
    } catch (error) {
      console.error('Error generating XML:', error);
        throw error;
    }
}


// Function to generate Table data from SQL record object
async function generateTableData(data, columns) {
   try {
        if(!data || data.length === 0) return null; // return null if data has not been fetched from db layer
            const formattedData =   data.map(item => {
                const obj = {};
              for (const col of columns){
                  obj[col] = item[col] ; // create object with only relevant columns, such as from db response.
               }
               return obj ; //
          });
        return {columns, rows: formattedData}; // transform and sends the specific model data for table implementation.
    } catch (error) {
        console.error('Error generating table data:', error);
        throw error;
   }
}

// Function to generate figures, using ChartJS compatible JSON and return the same data object
async function generateFigures(type, data, options) {
    try{
        // chart js output compatible data structure for plots and graphs from data.
        return {
           type: type || 'bar',
            data :  data || {},
           options : options || {}
         };
    } catch (error) {
        console.error('Error generating figures:', error);
       throw error;
    }
}
module.exports = {
    generatePDF,
    generateWord,
    generateExcel,
    generateCSV,
    generateXML,
    generateTableData,
    generateFigures,
};