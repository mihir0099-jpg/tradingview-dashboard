async function run() {
  const sRes = await fetch("https://marshalavi-tradingguru.static.hf.space/assets/index-DZCxn6DL.js");
  const sText = await sRes.text();

  const idx = sText.indexOf("backend WebSocket at");
  if (idx !== -1) {
    console.log("Context around WebSocket connection:\n");
    console.log(sText.substring(Math.max(0, idx - 400), idx + 200));
  }

  // Also check where getWsUrls or ws protocol is defined
  const wsProtoIdx = sText.indexOf("wss:");
  if (wsProtoIdx !== -1) {
    console.log("\nFound wss: usage:\n");
    console.log(sText.substring(Math.max(0, wsProtoIdx - 100), wsProtoIdx + 150));
  } else {
    console.log("\nWARNING: 'wss:' string NOT found in his JS bundle!");
  }
}
run();
