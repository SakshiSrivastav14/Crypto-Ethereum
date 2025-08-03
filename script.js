// Portfolio data storage
let portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];

// Cryptocurrency data with symbols
const cryptoData = {
    bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
    ethereum: { name: 'Ethereum', symbol: 'ETH' },
    cardano: { name: 'Cardano', symbol: 'ADA' },
    polkadot: { name: 'Polkadot', symbol: 'DOT' },
    chainlink: { name: 'Chainlink', symbol: 'LINK' },
    litecoin: { name: 'Litecoin', symbol: 'LTC' },
    stellar: { name: 'Stellar', symbol: 'XLM' },
    dogecoin: { name: 'Dogecoin', symbol: 'DOGE' }
};

// Current prices cache
let currentPrices = {};

// DOM elements
const addCryptoForm = document.getElementById('addCryptoForm');
const portfolioGrid = document.getElementById('portfolioGrid');
const emptyState = document.getElementById('emptyState');
const totalValueElement = document.getElementById('totalValue');
const totalChangeElement = document.getElementById('totalChange');
const refreshBtn = document.getElementById('refreshBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const marketData = document.getElementById('marketData');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    renderPortfolio();
    fetchPrices();
    loadMarketData();
});

// Add crypto form submission
addCryptoForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const cryptoId = document.getElementById('cryptoSelect').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
    
    if (!cryptoId || !amount || !purchasePrice) {
        alert('Please fill in all fields');
        return;
    }
    
    // Check if crypto already exists in portfolio
    const existingIndex = portfolio.findIndex(item => item.id === cryptoId);
    
    if (existingIndex !== -1) {
        // Update existing holding
        const existing = portfolio[existingIndex];
        const totalAmount = existing.amount + amount;
        const totalValue = (existing.amount * existing.purchasePrice) + (amount * purchasePrice);
        const avgPrice = totalValue / totalAmount;
        
        portfolio[existingIndex] = {
            ...existing,
            amount: totalAmount,
            purchasePrice: avgPrice
        };
    } else {
        // Add new holding
        const newHolding = {
            id: cryptoId,
            name: cryptoData[cryptoId].name,
            symbol: cryptoData[cryptoId].symbol,
            amount: amount,
            purchasePrice: purchasePrice,
            dateAdded: new Date().toISOString()
        };
        
        portfolio.push(newHolding);
    }
    
    // Save to localStorage
    localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
    
    // Reset form
    addCryptoForm.reset();
    
    // Re-render portfolio
    renderPortfolio();
    fetchPrices();
    
    // Show success animation
    showSuccessMessage('Cryptocurrency added to portfolio!');
});

// Refresh prices button
refreshBtn.addEventListener('click', function() {
    fetchPrices();
});

// Render portfolio
function renderPortfolio() {
    if (portfolio.length === 0) {
        portfolioGrid.style.display = 'none';
        emptyState.style.display = 'block';
        updateTotalValue(0, 0);
        return;
    }
    
    portfolioGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    portfolioGrid.innerHTML = portfolio.map((holding, index) => {
        const currentPrice = currentPrices[holding.id] || holding.purchasePrice;
        const currentValue = holding.amount * currentPrice;
        const purchaseValue = holding.amount * holding.purchasePrice;
        const profitLoss = currentValue - purchaseValue;
        const profitLossPercent = ((profitLoss / purchaseValue) * 100);
        
        return `
            <div class="portfolio-item" style="animation: slideInUp 0.5s ease ${index * 0.1}s both;">
                <div class="crypto-header">
                    <div class="crypto-info">
                        <h3>${holding.name}</h3>
                        <span class="symbol">${holding.symbol}</span>
                    </div>
                    <button class="delete-btn" onclick="removeHolding(${index})" title="Remove from portfolio">×</button>
                </div>
                
                <div class="crypto-stats">
                    <div class="stat">
                        <div class="stat-label">Holdings</div>
                        <div class="stat-value">${formatNumber(holding.amount)} ${holding.symbol}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Current Price</div>
                        <div class="stat-value">$${formatPrice(currentPrice)}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Purchase Price</div>
                        <div class="stat-value">$${formatPrice(holding.purchasePrice)}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Current Value</div>
                        <div class="stat-value">$${formatPrice(currentValue)}</div>
                    </div>
                    
                    <div class="profit-loss ${profitLoss >= 0 ? 'profit' : 'loss'}">
                        <div class="stat-label">Profit/Loss</div>
                        <div class="stat-value">
                            ${profitLoss >= 0 ? '+' : ''}$${formatPrice(Math.abs(profitLoss))} 
                            (${profitLoss >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Remove holding from portfolio
function removeHolding(index) {
    if (confirm('Are you sure you want to remove this cryptocurrency from your portfolio?')) {
        portfolio.splice(index, 1);
        localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
        renderPortfolio();
        fetchPrices();
    }
}

// Fetch current prices from CoinGecko API
async function fetchPrices() {
    if (portfolio.length === 0) return;
    
    showLoading(true);
    
    try {
        const cryptoIds = portfolio.map(holding => holding.id).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }
        
        const data = await response.json();
        currentPrices = {};
        
        // Update current prices
        Object.keys(data).forEach(cryptoId => {
            currentPrices[cryptoId] = data[cryptoId].usd;
        });
        
        // Calculate total portfolio value
        let totalValue = 0;
        let totalPurchaseValue = 0;
        
        portfolio.forEach(holding => {
            const currentPrice = currentPrices[holding.id] || holding.purchasePrice;
            totalValue += holding.amount * currentPrice;
            totalPurchaseValue += holding.amount * holding.purchasePrice;
        });
        
        const totalChange = totalValue - totalPurchaseValue;
        const totalChangePercent = totalPurchaseValue > 0 ? (totalChange / totalPurchaseValue) * 100 : 0;
        
        updateTotalValue(totalValue, totalChangePercent);
        renderPortfolio();
        
    } catch (error) {
        console.error('Error fetching prices:', error);
        showErrorMessage('Failed to fetch current prices. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Load market data for popular cryptocurrencies
async function loadMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,polkadot&vs_currencies=usd&include_24hr_change=true');
        
        if (!response.ok) {
            throw new Error('Failed to fetch market data');
        }
        
        const data = await response.json();
        
        const marketItems = Object.keys(data).map(cryptoId => {
            const crypto = data[cryptoId];
            const change = crypto.usd_24h_change || 0;
            const cryptoInfo = cryptoData[cryptoId];
            
            return `
                <div class="market-item">
                    <h4>${cryptoInfo.name}</h4>
                    <div class="price">$${formatPrice(crypto.usd)}</div>
                    <div class="change ${change >= 0 ? 'positive' : 'negative'}">
                        ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                    </div>
                </div>
            `;
        }).join('');
        
        marketData.innerHTML = marketItems;
        
    } catch (error) {
        console.error('Error loading market data:', error);
        marketData.innerHTML = '<p style="text-align: center; color: #666;">Failed to load market data</p>';
    }
}

// Update total portfolio value
function updateTotalValue(value, changePercent) {
    totalValueElement.textContent = `$${formatPrice(value)}`;
    
    const changeElement = totalChangeElement;
    changeElement.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    changeElement.className = `change ${changePercent >= 0 ? '' : 'negative'}`;
}

// Show/hide loading overlay
function showLoading(show) {
    loadingOverlay.classList.toggle('show', show);
}

// Format price for display
function formatPrice(price) {
    if (price >= 1) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        return price.toFixed(6);
    }
}

// Format number for display
function formatNumber(num) {
    if (num >= 1) {
        return num.toLocaleString('en-US', { maximumFractionDigits: 8 });
    } else {
        return num.toFixed(8);
    }
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4caf50, #45a049);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(76, 175, 80, 0.3);
        z-index: 1001;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 300);
    }, 3000);
}

// Show error message
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(244, 67, 54, 0.3);
        z-index: 1001;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 300);
    }, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// Auto-refresh prices every 5 minutes
setInterval(() => {
    if (portfolio.length > 0) {
        fetchPrices();
        loadMarketData();
    }
}, 300000);