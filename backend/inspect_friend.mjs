async function checkFriendDetails() {
  console.log("--- INSPECTING MARSHALAVI / TRADINGGURU ---");

  // 1. Check live_backend.json
  try {
    const res = await fetch("https://marshalavi-tradingguru.static.hf.space/live_backend.json");
    console.log("[live_backend.json Status]:", res.status);
    if (res.ok) {
      console.log("[live_backend.json Content]:", await res.text());
    } else {
      console.log("[live_backend.json NOT FOUND]: The space does not have live_backend.json!");
    }
  } catch(e) {
    console.log("live_backend.json Error:", e.message);
  }

  // 2. Fetch index.html and scripts
  try {
    const htmlRes = await fetch("https://marshalavi-tradingguru.static.hf.space");
    const html = await htmlRes.text();
    const scriptMatches = html.match(/src="([^"]+\.js)"/g);
    console.log("[Scripts in index.html]:", scriptMatches);

    if (scriptMatches) {
      for (const sm of scriptMatches) {
        const src = sm.replace('src="', '').replace('"', '');
        const scriptUrl = "https://marshalavi-tradingguru.static.hf.space/" + src.replace(/^\//, '');
        console.log("\nFetching script:", scriptUrl);
        const sRes = await fetch(scriptUrl);
        const sText = await sRes.text();
        console.log("Script size:", sText.length, "bytes");

        // Search for ws occurrences
        const wsMatches = sText.match(/wss?:\/\/[a-zA-Z0-9_\-\.\:\/]+/g);
        console.log("Hardcoded WS URLs:", wsMatches ? [...new Set(wsMatches)] : "None");

        // Search for localhost
        const localMatches = sText.match(/https?:\/\/localhost:[0-9]+/g);
        console.log("Hardcoded Localhost URLs:", localMatches ? [...new Set(localMatches)] : "None");

        // Find how WebSocket is initialized
        const idx = sText.indexOf("new WebSocket");
        if (idx !== -1) {
          console.log("new WebSocket snippet:", sText.substring(Math.max(0, idx - 50), idx + 120));
        }

        // Find backendUrl or getBackendUrl
        const bIdx = sText.indexOf("getBackendUrl");
        if (bIdx !== -1) {
          console.log("getBackendUrl snippet:", sText.substring(bIdx, bIdx + 200));
        }
      }
    }
  } catch(e) {
    console.log("Error checking scripts:", e.message);
  }
}
checkFriendDetails();
