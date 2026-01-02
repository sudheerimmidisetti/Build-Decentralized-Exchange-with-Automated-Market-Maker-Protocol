
# Build Decentralized Exchange with Automated Market Maker Protocol Project

## Overview
This project implements a **Decentralized Exchange (DEX)** based on the **Automated Market Maker (AMM)** model, similar to Uniswap V2. The DEX enables trustless token swaps, decentralized liquidity provision, LP token minting/burning, and transparent fee distribution. By building this system, I gained hands-on experience with core DeFi mechanics and how modern decentralized financial protocols operate without centralized intermediaries.

---

## Features
- Initial and subsequent liquidity provision
- Liquidity removal with proportional reserve withdrawal
- Token swaps using the constant product formula (x * y = k)
- 0.3% fee mechanism rewarding liquidity providers
- LP Token minting and burning to track ownership
- Transparent reserve and price calculations
- Full Hardhat test suite with coverage
- Dockerized environment for deterministic builds
- Secure token handling using OpenZeppelin standards

---

## Architecture

### Repository Structure
```
dex-amm/
├── contracts/
│   ├── DEX.sol
│   ├── MockERC20.sol
│   └── (optional) LPToken.sol
├── test/
│   └── DEX.test.js
├── scripts/
│   └── deploy.js
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── hardhat.config.js
├── package.json
└── README.md
```

### Core Components
- **DEX.sol** – Core AMM logic, liquidity management, swaps, LP accounting
- **MockERC20.sol** – Test ERC-20 tokens for simulations
- **Tests** – Comprehensive Hardhat tests validating every scenario
- **Docker** – Standard execution environment ensuring consistency
- **Hardhat** – Compilation, deployment, testing, and debugging

---

## Mathematical Implementation

### Constant Product Formula
The DEX operates using:
```
x * y = k
```
Where:
- `x` = Token A reserves
- `y` = Token B reserves
- `k` = Constant pool invariant

This ensures price movement is algorithmic and liquidity is always available.

### Price Calculation
```
Price of Token A = reserveB / reserveA
```

### Initial Liquidity
```
liquidity = sqrt(amountA * amountB)
```

### Subsequent Liquidity
```
amountB_required = (amountA * reserveB) / reserveA
liquidityMinted = (amountA * totalLiquidity) / reserveA
```

### Liquidity Removal
```
amountA = (liquidityBurned * reserveA) / totalLiquidity
amountB = (liquidityBurned * reserveB) / totalLiquidity
```

### Swap Formula (0.3% Fee)
```
amountInWithFee = amountIn * 997
numerator = amountInWithFee * reserveOut
denominator = reserveIn * 1000 + amountInWithFee
amountOut = numerator / denominator
```

This fee accumulates inside the pool, rewarding liquidity providers.

---

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local execution)

---

## Running with Docker
```bash
git clone https://github.com/sudheerimmidisetti/Build-Decentralized-Exchange-with-Automated-Market-Maker-Protocol.git
cd Build-Decentralized-Exchange-with-Automated-Market-Maker-Protocol
docker-compose up -d
docker-compose exec app npm run compile
docker-compose exec app npm test
docker-compose exec app npm run coverage
docker-compose down
```

---

## Running Locally (Without Docker)
```bash
npm install
npm run compile
npm test
```

---

## Testing
- 25+ test cases
- Covers:
  - Liquidity management
  - Swap mechanics
  - Fee accumulation
  - Edge cases
  - Events emission
- Must achieve **≥ 80% coverage**

---

## Security Considerations
- Solidity 0.8+ overflow protection
- SafeERC20 for secure transfers
- Reentrancy resistance considerations
- Ratio validation to protect pricing
- Strict parameter validation
- LP share correctness validation
- Transparent reserve tracking

---

## Known Limitations
- No slippage protection by default
- Single pair DEX (not multi‑pair AMM framework)
- Flash swap support not included
- Limited UI scope (backend protocol focused)

---

## Learning Outcomes
Through this project I gained:
- Deep understanding of DeFi AMM mechanics
- Smart contract security awareness
- Mathematical modeling in blockchain finance
- Hardhat testing proficiency
- Dockerized blockchain development experience
- Understanding of liquidity incentives & fee models

---

## Conclusion
This project demonstrates a complete, secure, and mathematically accurate DEX AMM system inspired by Uniswap V2. It reflects strong understanding of blockchain engineering, decentralized finance mechanics, smart contract testing, and production‑grade deployment workflows.

---
