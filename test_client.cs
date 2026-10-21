using System;
using NinjaTrader.Client;

class Test {
    static void Main() {
        Client c = new Client();
        c.SetUp("127.0.0.1", 36973);
        int connected = c.Connected(0);
        Console.WriteLine("Connected(0): " + connected);
        string[] symbols = new string[] { "NIFTY_I", "^NIFTY", "NIFTY", "BANKNIFTY_I", "^BANKNIFTY", "BANKNIFTY" };
        foreach (var s in symbols) {
            int rLast = c.Last(s, 24500.5, 1);
            int rBid = c.Bid(s, 24500.4, 1);
            int rAsk = c.Ask(s, 24500.6, 1);
            Console.WriteLine(s + " => Last: " + rLast + ", Bid: " + rBid + ", Ask: " + rAsk);
        }
    }
}
