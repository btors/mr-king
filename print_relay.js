const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const PORT = 9101;
const PRINTER_PATH = '\\\\localhost\\Caja_Printer';
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const tempFile = path.join(__dirname, 'temp_relay_ticket.txt');
        fs.writeFileSync(tempFile, body, 'utf-8');
        
        exec(`copy /B "${tempFile}" "${PRINTER_PATH}"`, (err) => {
          if (err) {
            console.error('Error de impresión USB:', err.message);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Error: ${err.message}`);
          } else {
            console.log('¡Ticket impreso físicamente por USB con éxito!');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Success');
          }
          try { fs.unlinkSync(tempFile); } catch {}
        });
      } catch (e) {
        console.error('Fallo en el Relay:', e.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(e.message);
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Micro-Relay de Impresión USB activo en puerto ${PORT}`);
  console.log(`🖨️ Direccionando a: ${PRINTER_PATH}`);
});
