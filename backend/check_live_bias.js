import http from 'http';

http.get('http://localhost:3002/api/scanner/opening-bias', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('NIFTY details:', JSON.stringify(json.nifty?.straddleSkew, null, 2));
      console.log('NIFTY Options Premium levels:', JSON.stringify(json.nifty?.optionPremiumLevels, null, 2));
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});
