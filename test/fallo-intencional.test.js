   var assert = require('assert');

   describe('Fallo intencional', function () {
     it('debe fallar para bloquear el despliegue', function () {
       assert.equal(1 + 1, 3);
     });
   });
