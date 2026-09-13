async function fetchRepoFiles() {
  const r1 = await fetch("https://huggingface.co/spaces/marshalavi/TradingGuru/raw/main/README.md");
  console.log("README.md:\n", (await r1.text()).substring(0, 500));

  const r2 = await fetch("https://huggingface.co/spaces/marshalavi/TradingGuru/raw/main/live_backend.json");
  console.log("live_backend.json:\n", await r2.text());

  const r3 = await fetch("https://huggingface.co/spaces/marshalavi/TradingGuru/raw/main/backend/server.js");
  const serverJs = await r3.text();
  console.log("server.js size:", serverJs.length);
  const routeMatches = serverJs.match(/app\.(get|post)\(['"]([^'"]+)['"]/g) || [];
  const routes = routeMatches.map(m => m.replace(/app\.(get|post)\(['"]/, '').replace(/['"]/, ''));
  console.log("All routes in his backend/server.js:", [...new Set(routes)].slice(0, 30));

  // Now let's check what tabs his FRONTEND has!
  const sRes = await fetch("https://marshalavi-tradingguru.static.hf.space/assets/index-DZCxn6DL.js");
  const sText = await sRes.text();
  // search for tab labels
  const tabMatches = sText.match(/id:\s*['"]([a-zA-Z0-9_\-]+)['"],\s*label:\s*['"]([^'"]+)['"]/g) || [];
  console.log("Tabs found in frontend bundle:", tabMatches);
}
fetchRepoFiles();
