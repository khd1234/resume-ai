# Setup script for Resume AI - Epic 1: User Authentication & Management

Write-Host "🚀 Setting up Resume AI - Epic 1: User Authentication & Management" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Setting up environment variables..." -ForegroundColor Yellow
if (!(Test-Path .env.local)) {
    Copy-Item .env.example .env.local
    Write-Host "✅ Created .env.local from .env.example" -ForegroundColor Green
    Write-Host "⚠️  Please update .env.local with your database URL and other secrets" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️  .env.local already exists" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env.local with your database URL" -ForegroundColor White
Write-Host "2. Set up PostgreSQL database" -ForegroundColor White
Write-Host "3. Run: npx prisma migrate dev --name init" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📖 See README.md for detailed setup instructions" -ForegroundColor Cyan