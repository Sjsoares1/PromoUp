const http = require('http');

console.log('=== Testando APIs do PromoUp ===\n');

// Teste 1: Status
console.log('1. Testando /api/status...');
http.get('http://127.0.0.1:9090/api/status', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Resposta:', data.substring(0, 200));
    console.log('');

    // Teste 2: TVs
    console.log('2. Testando /api/tvs...');
    http.get('http://127.0.0.1:9090/api/tvs', (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('Status:', res2.statusCode);
        console.log('Resposta:', data2.substring(0, 200));
        console.log('');

        // Teste 3: Promoções
        console.log('3. Testando /api/promocoes...');
        http.get('http://127.0.0.1:9090/api/promocoes', (res3) => {
          let data3 = '';
          res3.on('data', chunk => data3 += chunk);
          res3.on('end', () => {
            console.log('Status:', res3.statusCode);
            console.log('Resposta:', data3.substring(0, 200));
            console.log('');

            // Teste 4: Página HTML
            console.log('4. Testando /index.html...');
            http.get('http://127.0.0.1:9090/index.html', (res4) => {
              let data4 = '';
              res4.on('data', chunk => data4 += chunk);
              res4.on('end', () => {
                console.log('Status:', res4.statusCode);
                console.log('Tamanho:', data4.length, 'bytes');
                console.log('Primeiros 100 chars:', data4.substring(0, 100));
                console.log('\n=== Todos os testes concluídos ===');
              });
            }).on('error', (e) => console.log('Erro:', e.message));
          });
        }).on('error', (e) => console.log('Erro:', e.message));
      });
    }).on('error', (e) => console.log('Erro:', e.message));
  });
}).on('error', (e) => console.log('Erro:', e.message));
