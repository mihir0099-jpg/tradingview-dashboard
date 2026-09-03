import os
import json
import numpy as np

# Try importing dependencies; handle missing packages gracefully
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import Dataset, DataLoader
except ImportError:
    print("\n" + "="*80)
    print(" [ERROR] PyTorch (torch) is not installed on this system.")
    print(" Please install PyTorch and its dependencies to run offline training.")
    print(" Command to run in your terminal:")
    print("    pip install torch numpy pandas scikit-learn")
    print("="*80 + "\n")
    exit(1)

# Configuration
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'live_market_learnings.json')
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'market_regime_model.pth')

class MarketDataset(Dataset):
    def __init__(self, data_list):
        self.features = []
        self.labels = []
        
        # Class encoding map
        label_map = {
            'Equilibrium Rotation': 0,
            'Bullish CE Bloat': 1,
            'Bearish PE Bloat': 2
        }

        for item in data_list:
            # Features: Nifty (Skew, Gamma, Straddle) + BankNifty (Skew, Gamma, Straddle)
            n_skew = float(item.get('niftySkew') or 0.0)
            n_gamma = float(item.get('niftyGamma') or 0.0)
            n_strad = float(item.get('niftyStraddle') or 0.0)
            
            b_skew = float(item.get('bankniftySkew') or 0.0)
            b_gamma = float(item.get('bankniftyGamma') or 0.0)
            b_strad = float(item.get('bankniftyStraddle') or 0.0)
            
            # Skip entries with missing critical components
            if n_strad == 0 or b_strad == 0:
                continue

            # Scale/Normalize inputs to keep neural net stable
            feat = [
                n_skew / 100.0,      # Skew typically ranges -100 to 100
                n_gamma,             # Gamma ratio typically ranges 0.1 to 3.0
                n_strad / 500.0,     # Normalise straddle relative to typical Nifty size
                b_skew / 100.0,
                b_gamma,
                b_strad / 2000.0
            ]
            
            takeaway = item.get('actionableTakeaway', 'Equilibrium Rotation')
            lbl = label_map.get(takeaway, 0)
            
            self.features.append(feat)
            self.labels.append(lbl)

        self.features = torch.tensor(self.features, dtype=torch.float32)
        self.labels = torch.tensor(self.labels, dtype=torch.long)
        print(f"[Dataset] Processed {len(self.features)} valid learning entries.")

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]

# Simple 3-Layer feedforward Neural Network to classify market regime
class MarketRegimeNet(nn.Module):
    def __init__(self, input_dim=6, num_classes=3):
        super(MarketRegimeNet, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, num_classes)
        )

    def forward(self, x):
        return self.net(x)

def train_model():
    print("="*60)
    print("     PYTORCH OFFLINE TRADING REGIME CLASSIFIER")
    print("="*60)
    
    # 1. Load Data
    if not os.path.exists(DATA_PATH):
        print(f"[Error] Dataset file not found at {DATA_PATH}")
        print("Please make sure the Node.js server has logged some data first.")
        return
        
    with open(DATA_PATH, 'r') as f:
        raw_data = json.load(f)
        
    print(f"[Dataset] Loaded {len(raw_data)} total logs from live_market_learnings.json")
    
    dataset = MarketDataset(raw_data)
    if len(dataset) < 100:
        print("[Warning] Dataset is too small to train properly. Need at least 100 entries.")
        return

    # Train-test split (80% / 20%)
    train_size = int(0.8 * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = torch.utils.data.random_split(dataset, [train_size, test_size])
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

    # 2. Instantiate Model, Loss and Optimizer
    model = MarketRegimeNet(input_dim=6, num_classes=3)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.005)
    
    # 3. Training Loop
    epochs = 20
    print(f"\n[Training] Starting offline training for {epochs} epochs...")
    
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        
        for batch_feat, batch_lbl in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_feat)
            loss = criterion(outputs, batch_lbl)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * batch_feat.size(0)
            
        epoch_loss = running_loss / len(train_dataset)
        
        # Evaluate on test set
        model.eval()
        correct = 0
        total = 0
        test_loss = 0.0
        with torch.no_grad():
            for test_feat, test_lbl in test_loader:
                outputs = model(test_feat)
                loss = criterion(outputs, test_lbl)
                test_loss += loss.item() * test_feat.size(0)
                _, predicted = torch.max(outputs, 1)
                total += test_lbl.size(0)
                correct += (predicted == test_lbl).sum().item()
                
        val_loss = test_loss / len(test_dataset)
        val_acc = (correct / total) * 100
        
        print(f" Epoch {epoch:2d}/{epochs:2d} | Train Loss: {epoch_loss:.4f} | Test Loss: {val_loss:.4f} | Test Accuracy: {val_acc:.2f}%")

    # 4. Save Model state dict
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"\n[Success] Model weights saved to {MODEL_SAVE_PATH}")
    print("These weights can be parsed to extract optimal coefficients or loaded directly.")
    print("="*60 + "\n")

if __name__ == "__main__":
    train_model()
