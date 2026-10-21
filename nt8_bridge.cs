using System;
using System.IO;
using NinjaTrader.Client;

class NT8Bridge {
    static void Main(string[] args) {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Console.WriteLine("[NT8Bridge] Starting NinjaTrader 8 Native Bridge...");
        Client client = new Client();
        string host = args.Length > 0 ? args[0] : "127.0.0.1";
        int port = args.Length > 1 ? int.Parse(args[1]) : 36973;
        client.SetUp(host, port);
        Console.WriteLine("[NT8Bridge] Configured for " + host + ":" + port);
        string line;
        while ((line = Console.ReadLine()) != null) {
            line = line.Trim();
            if (string.IsNullOrEmpty(line)) continue;
            try {
                string[] parts = line.Split('|');
                if (parts.Length < 4) continue;
                string cmd = parts[0].ToUpper();
                string symbol = parts[1];
                double price = double.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                int size = int.Parse(parts[3]);
                if (cmd == "LAST") {
                    client.Last(symbol, price, size);
                } else if (cmd == "ASK") {
                    client.Ask(symbol, price, size);
                } else if (cmd == "BID") {
                    client.Bid(symbol, price, size);
                }
            } catch (Exception ex) {
                Console.WriteLine("[NT8Bridge Error] " + ex.Message);
            }
        }
    }
}