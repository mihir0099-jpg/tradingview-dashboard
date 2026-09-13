import urllib.request, re

req = urllib.request.Request("https://www.google.com/finance/quote/INDEXBOM:SENSEX", headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
try:
    html = urllib.request.urlopen(req).read().decode("utf-8")
    m = re.search(r'data-last-price="([^"]+)"', html)
    if m:
        print("Google Finance data-last-price:", m.group(1))
    m2 = re.search(r'class="YMlKec fxKbKc">([^<]+)<', html)
    if m2:
        print("Google Finance YMlKec:", m2.group(1))
    m3 = re.search(r'Day range</div><div class="P6K39c">([^<]+)<', html)
    if m3:
        print("Day range:", m3.group(1))
except Exception as e:
    print("Err:", e)
