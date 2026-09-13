async function run() {
  const sRes = await fetch("https://marshalavi-tradingguru.static.hf.space/assets/index-DZCxn6DL.js");
  const sText = await sRes.text();

  // Search for navigation or tab names
  const keywords = ["Scanner", "Confluence", "200 EMA", "Doji", "Volume", "Options", "Watchlist", "Matrix", "Signals", "Breakout"];
  for (const kw of keywords) {
    let count = 0;
    let pos = sText.indexOf(kw);
    while (pos !== -1 && count < 3) {
      console.log(`Keyword "${kw}" at ${pos}:`);
      console.log(sText.substring(Math.max(0, pos - 60), pos + 100));
      pos = sText.indexOf(kw, pos + 1);
      count++;
    }
  }
}
run();
