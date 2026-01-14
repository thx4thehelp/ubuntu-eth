# Ubuntu ETH API

Erigon 노드 기반 이더리움 API 서비스. API 키 인증 및 레이트 리밋 지원.

## 기능

- ETH 잔액 조회
- 트랜잭션 정보/영수증 조회
- 블록 정보 조회
- 가스 가격/추정/히스토리
- ERC-20 토큰 잔액/정보
- ERC-721 NFT 잔액/소유자
- 지갑 생성
- API 키 관리 (생성/비활성화/삭제)
- 10분 단위 레이트 리밋

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

### API (x-api-key 헤더 필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/v1/wallet/balance/:address | ETH 잔액 |
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
EnvironmentFile=/path/to/ubuntu-eth/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ubuntu-eth
sudo systemctl start ubuntu-eth
```
