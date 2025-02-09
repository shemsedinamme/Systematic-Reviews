// ot.js

class OTManager {
    constructor() {
        this.document = '';
        this.history = [];
    }

    generateOperation(type, position, text) {
      return {
            type,
            position,
            text,
           version: this.history.length
       };
    }

  transformOperation(operation, incomingOperation) {
      if(incomingOperation.version < operation.version){
         return incomingOperation;
      }
        let transformed = {...incomingOperation};
      if (operation.type === 'insert') {
            if(transformed.type === 'insert' && transformed.position >= operation.position){
                   transformed.position += operation.text.length;
            } else if (transformed.type === 'delete' && transformed.position >= operation.position){
                    transformed.position += operation.text.length
            }
      } else if (operation.type === 'delete') {
            if(transformed.type === 'insert' && transformed.position >= operation.position){
                  transformed.position -= Math.min(transformed.position - operation.position, operation.text.length)
            } else if (transformed.type === 'delete' && transformed.position >= operation.position) {
                transformed.position -= Math.min(transformed.position - operation.position, operation.text.length);
           }
        }
      return transformed;
    }

     applyOperation(operation) {
            if (operation.type === 'insert') {
            this.document = this.document.slice(0, operation.position) + operation.text + this.document.slice(operation.position);
            } else if (operation.type === 'delete') {
                this.document = this.document.slice(0, operation.position) + this.document.slice(operation.position + operation.text.length);
            }
         this.history.push(operation);
        }
     getDocument(){
        return this.document;
     }
}
module.exports = OTManager