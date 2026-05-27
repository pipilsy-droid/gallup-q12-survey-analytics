import fetch from 'node-fetch';

async function run() {
  try {
    const url = 'https://docs.google.com/spreadsheets/d/1US-Pv5FrUOpGp86SVp9ex-LEJS_ecNy5srET5BufZ0Y/export?format=csv';
    const res = await fetch(url);
    const text = await res.text();
    
    // Character by character TSV/CSV robust parser
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.length > 0 && currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell !== '' || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
    }

    console.log('TOTAL ROWS PARSED:', rows.length);
    const headers = rows[0];
    
    console.log('--- ALL DETECTED HEADERS ---');
    headers.forEach((h, idx) => {
      console.log(`Col ${idx}: [${h}]`);
    });

    // Option unique sets
    const brandSet = new Set<string>();
    const roleSet = new Set<string>();
    const rankSet = new Set<string>();
    const jobSet = new Set<string>();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row[1]) brandSet.add(row[1]);
      if (row[2]) roleSet.add(row[2]);
      if (row[3]) rankSet.add(row[3]);
      if (row[4]) jobSet.add(row[4]);
    }

    console.log('--- CORRECT UNIQUE BRANDS (브랜드) ---');
    console.log(JSON.stringify(Array.from(brandSet), null, 2));

    console.log('--- CORRECT UNIQUE ROLES (직책) ---');
    console.log(JSON.stringify(Array.from(roleSet), null, 2));

    console.log('--- CORRECT UNIQUE RANKS (직급) ---');
    console.log(JSON.stringify(Array.from(rankSet), null, 2));

    console.log('--- CORRECT UNIQUE JOBS (직무) ---');
    console.log(JSON.stringify(Array.from(jobSet), null, 2));

    // Print some comments
    const comments: string[] = [];
    headers.forEach((h, idx) => {
      if (h.toLowerCase().includes('의견') || h.toLowerCase().includes('한마디') || h.toLowerCase().includes('서술') || idx > 15) {
        console.log(`Potential feedback column detected at Col ${idx}: ${h}`);
      }
    });

    console.log('--- ROW 1 DUMP ---');
    if (rows.length > 1) {
      rows[1].forEach((val, idx) => {
        console.log(`Col ${idx} (${headers[idx]}): ${val}`);
      });
    }

  } catch (err) {
    console.error('ERROR:', err);
  }
}

run();
