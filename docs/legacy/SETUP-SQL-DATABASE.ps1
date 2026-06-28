$ProjectPath = "C:\Users\mir omer ail\Desktop\culinary-canvas-main"
Set-Location $ProjectPath
npm install
npm run db:migrate
npm run db:seed
Write-Host "SQLite database ready at backend\prisma\dev.db"
