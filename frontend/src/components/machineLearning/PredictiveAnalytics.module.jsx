/* PredictiveAnalytics.module.css */
.predictiveContainer {
    max-width: 600px;
    margin: 20px auto;
    padding: 20px;
   border: 1px solid #ddd;
    border-radius: 8px;
     background: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
}

.predictiveContainer h1 {
  text-align: center;
  margin-bottom: 20px;
}
.predictSelect{
  padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
    margin-bottom: 10px;
}
.predictSelect:focus{
  border-color: MediumSeaGreen;
}
.dataInput{
    width: 100%;
    min-height: 100px;
     padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
     box-sizing: border-box;
      margin-bottom: 10px;
}
.dataInput:focus{
   border-color: MediumSeaGreen
}
.predictButton {
   padding: 8px 12px;
    background-color: MediumSeaGreen;
    color: lemonchiffon;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
     margin-top: 10px;
}
.predictButton:hover{
   background-color: #253725;
}
.resultsData{
     border: 1px solid #eee;
    padding: 10px;
    border-radius: 4px;
     margin-bottom: 10px;
}
.resultsData h3{
    margin-bottom: 10px;
}
.resultsData p{
   padding: 5px;
    border-bottom: 1px solid #eee;
}
@media (max-width: 768px) {
  .predictiveContainer {
    padding: 15px;
  }
}