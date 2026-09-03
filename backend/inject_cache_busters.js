import fs from 'fs';

function addCacheBuster(filePath, target, replacement) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated: ${filePath}`);
  } else {
    console.log(`Target not found in: ${filePath}`);
  }
}

const basePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src';

// 1. ScannerContainer
addCacheBuster(
  `${basePath}/components/ScannerContainer.tsx`,
  'const res = await fetch(`${backendUrl}/api/scanner/results?timeframe=${activeTimeframe}`);',
  'const res = await fetch(`${backendUrl}/api/scanner/results?timeframe=${activeTimeframe}&_t=${Date.now()}`);'
);

// 2. SignalsContainer
addCacheBuster(
  `${basePath}/components/SignalsContainer.tsx`,
  'const res = await fetch(`${backendUrl}/api/scanner/results?timeframe=5`);',
  'const res = await fetch(`${backendUrl}/api/scanner/results?timeframe=5&_t=${Date.now()}`);'
);
addCacheBuster(
  `${basePath}/components/SignalsContainer.tsx`,
  'const res = await fetch(`${backendUrl}/api/scanner/opening-bias`);',
  'const res = await fetch(`${backendUrl}/api/scanner/opening-bias?_t=${Date.now()}`);'
);

// 3. OpeningBiasContainer
addCacheBuster(
  `${basePath}/components/OpeningBiasContainer.tsx`,
  'fetch(`${backendUrl}/api/scanner/opening-bias`)',
  'fetch(`${backendUrl}/api/scanner/opening-bias?_t=${Date.now()}`)'
);

// 4. BhaicharaWorkContainer
addCacheBuster(
  `${basePath}/components/BhaicharaWorkContainer.tsx`,
  'fetch(`${backendUrl}/api/scanner/opening-bias`).catch(() => null),',
  'fetch(`${backendUrl}/api/scanner/opening-bias?_t=${Date.now()}`).catch(() => null),'
);
addCacheBuster(
  `${basePath}/components/BhaicharaWorkContainer.tsx`,
  'fetch(`${backendUrl}/api/scanner/early-picks?threshold=0.5`).catch(() => null),',
  'fetch(`${backendUrl}/api/scanner/early-picks?threshold=0.5&_t=${Date.now()}`).catch(() => null),'
);
addCacheBuster(
  `${basePath}/components/BhaicharaWorkContainer.tsx`,
  'fetch(`${backendUrl}/api/scanner/confluence`).catch(() => null)',
  'fetch(`${backendUrl}/api/scanner/confluence?_t=${Date.now()}`).catch(() => null)'
);

// 5. ConfluencesContainer
addCacheBuster(
  `${basePath}/components/ConfluencesContainer.tsx`,
  'const res = await fetch(`${backendUrl}/api/scanner/confluences?threshold=${threshold}`);',
  'const res = await fetch(`${backendUrl}/api/scanner/confluences?threshold=${threshold}&_t=${Date.now()}`);'
);

// 6. EarlyPicksContainer
addCacheBuster(
  `${basePath}/components/EarlyPicksContainer.tsx`,
  'const res = await fetch(`${backendUrl}/api/scanner/early-picks?threshold=${threshold}`);',
  'const res = await fetch(`${backendUrl}/api/scanner/early-picks?threshold=${threshold}&_t=${Date.now()}`);'
);

// 7. DojiContainer
addCacheBuster(
  `${basePath}/components/DojiContainer.tsx`,
  'const response = await fetch(`${backendUrl}/api/doji-signals?slot=${slot}&scan=${force ? \'true\' : \'false\'}`);',
  'const response = await fetch(`${backendUrl}/api/doji-signals?slot=${slot}&scan=${force ? \'true\' : \'false\'}&_t=${Date.now()}`);'
);

// 8. VolumeContainer
addCacheBuster(
  `${basePath}/components/VolumeContainer.tsx`,
  'const res = await fetch(`${backendUrl}/api/volume-breakouts`);',
  'const res = await fetch(`${backendUrl}/api/volume-breakouts?_t=${Date.now()}`);'
);
