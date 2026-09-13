import urllib.request, re

req = urllib.request.Request("https://www.google.com/finance/quote/INDEXBOM:SENSEX", headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
try:
    html = urllib.request.urlopen(req).read().decode("utf-8")
    print("Page Title:", re.findall(r'<title>(.*?)</title>', html))
    # find all currency or prices with comma
    matches = re.findall(r'(\d{2},\d{3}\.\d{2})', html)
    print("Found prices:", set(matches[:10]))
except Exception as e:
    print("Err:", e)
