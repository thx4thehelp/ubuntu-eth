# Ubuntu ETH API

Erigon 아카이브 노드 기반 이더리움 API 서비스. API 키 인증 및 레이트 리밋 지원.

## 기능

- JSON-RPC 프록시 (Infura/Alchemy 호환)
- 트랜잭션 히스토리 조회 (trace_filter 기반)
- ETH 잔액 조회
- 트랜잭션 정보/영수증 조회
- 블록 정보 조회
- 가스 가격/추정/히스토리
- ERC-20 토큰 잔액/정보
- ERC-721 NFT 잔액/소유자
- 지갑 생성
- API 키 관리 (생성/비활성화/삭제)
- 10분 단위 레이트 리밋 (기본 30,000회)

## 설치

```bash
git clone https://github.com/thx4thehelp/ubuntu-eth.git
cd ubuntu-eth
npm install
npm run build
```

## 환경변수 설정

`.env` 파일 생성:
```bash
nano .env
```

내용:
```
ERIGON_RPC_URL=http://localhost:8545
DATA_DIR=./data
API_RATE_LIMIT_PER_10MIN=30000
ADMIN_SECRET=your-secret-here
```

## 실행

```bash
# 개발
npm run dev

# 프로덕션
node build

# 포트 변경
PORT=3002 node build
```

## API 엔드포인트

### Admin (x-admin-secret 헤더 필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/admin/keys | API 키 생성 |
| GET | /api/admin/keys | API 키 목록 |
| GET | /api/admin/keys/:key | API 키 상세 |
| PATCH | /api/admin/keys/:key | API 키 수정 |
| DELETE | /api/admin/keys/:key | API 키 삭제 |

### JSON-RPC (x-api-key 헤더 필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/v1/rpc | JSON-RPC 프록시 (Infura 호환) |

### REST API (x-api-key 헤더 필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/v1/wallet/balance/:address | ETH 잔액 |
| GET | /api/v1/wallet/history/:address | 트랜잭션 히스토리 |
| POST | /api/v1/wallet/generate | 지갑 생성 |
| GET | /api/v1/wallet/nonce/:address | 논스 조회 |
| GET | /api/v1/tx/:hash | 트랜잭션 정보 |
| GET | /api/v1/tx/:hash/receipt | 트랜잭션 영수증 |
| GET | /api/v1/block | 블록 정보 |
| GET | /api/v1/gas/price | 가스 가격 |
| POST | /api/v1/gas/estimate | 가스 추정 |
| GET | /api/v1/gas/history | 가스 히스토리 |
| GET | /api/v1/token/balance | ERC-20 잔액 |
| GET | /api/v1/token/info/:address | ERC-20 정보 |
| GET | /api/v1/nft/balance | NFT 잔액 |
| GET | /api/v1/nft/owner | NFT 소유자 |
| GET | /api/v1/usage | 사용량 조회 |

### Public

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/health | 헬스체크 |

## 사용 예시

### JSON-RPC (Infura 호환)

```javascript
// ethers.js
const provider = new ethers.JsonRpcProvider("https://your-domain.com/api/v1/rpc", undefined, {
  staticNetwork: true,
  batchMaxCount: 1
});
// 요청 시 헤더에 x-api-key 추가 필요

// curl
curl -X POST https://your-domain.com/api/v1/rpc \
  -H "Content-Type: application/json" \
  -H "x-api-key: eth_xxx" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","latest"],"id":1}'
```

### 트랜잭션 히스토리

```bash
# 기본 조회
curl https://your-domain.com/api/v1/wallet/history/0x... \
  -H "x-api-key: eth_xxx"

# 블록 범위 및 페이지네이션
curl "https://your-domain.com/api/v1/wallet/history/0x...?fromBlock=0x0&toBlock=latest&limit=50&offset=0" \
  -H "x-api-key: eth_xxx"
```

### REST API

```bash
# ETH 잔액 조회
curl https://your-domain.com/api/v1/wallet/balance/0x... \
  -H "x-api-key: eth_xxx"
```

## PM2로 실행

```bash
npm install -g pm2
PORT=3002 pm2 start build/index.js --name ubuntu-eth
pm2 startup
pm2 save
```

## systemd 서비스 등록

```bash
sudo nano /etc/systemd/system/ubuntu-eth.service
```

```ini
[Unit]
Description=Ubuntu ETH API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ubuntu-eth
ExecStart=/usr/bin/node build
Restart=always
RestartSec=5
Environment=PORT=3002
EnvironmentFile=/path/to/ubuntu-eth/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ubuntu-eth
sudo systemctl start ubuntu-eth
```
